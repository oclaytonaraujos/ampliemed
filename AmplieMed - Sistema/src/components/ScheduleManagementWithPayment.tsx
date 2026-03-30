import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, User, Search, Plus, Video, MapPin, 
  Phone, Filter, Download, X, Check, Ban, Edit, Send, MessageSquare, FileText, 
  AlertCircle, Stethoscope, Building, DollarSign, CreditCard, Receipt, Bell,
  History, Printer, Mail, Copy, FileCheck, UserCog, Folder, RefreshCw, Banknote, RotateCcw, ChevronDown
} from 'lucide-react';
import { useLocation } from 'react-router';
import type { UserRole } from '../App';
import type { ScheduleAppointment } from './AppContext';
import { useApp } from './AppContext';
import { BackToPatientBanner } from './BackToPatientBanner';
import { toastInfo } from '../utils/toastService';
import { sendEvolutionMessage } from '../utils/api';
import { AgendaSidebar } from './AgendaSidebar';
import {
  WaitingListModal,
  PatientsWaitingModal,
  ScaleConfigModal,
  MessagesModal,
} from './AgendaSidebarModals';

interface ScheduleManagementWithPaymentProps {
  userRole: UserRole;
}

// Alias — keeps the rest of the file unchanged
type Appointment = ScheduleAppointment;

interface FilterOptions {
  doctor: string;
  specialty: string;
  status: string;
  type: string;
}

export function ScheduleManagementWithPayment({ userRole }: ScheduleManagementWithPaymentProps) {
  const {
    appointments, setAppointments, addNotification, patients,
    setQueueEntries,
    professionals, insurances,
    addAuditEntry, currentUser,
    financialPayments, setFinancialPayments,
    selectedClinicId, addCommunicationMessage,
    clinicSettings,
  } = useApp();

  const sendStatusWhatsApp = (phone: string | undefined, patientName: string, text: string) => {
    if (!phone || !selectedClinicId) return;
    const msg = addCommunicationMessage({
      type: 'reminder',
      patientName,
      channel: 'whatsapp',
      subject: 'Atualização de agendamento',
      body: text,
      status: 'pending',
    });
    sendEvolutionMessage({ clinicId: selectedClinicId, messageId: msg.id, phone, text })
      .catch(() => {});
  };
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFinishAppointmentModal, setShowFinishAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');
  
  // Estado para controlar qual tela está sendo exibida no painel direito
  const [rightPanelView, setRightPanelView] = useState<'details' | 'history' | 'record' | 'editPatient' | 'documents' | 'reschedule' | 'certificate' | 'receipt' | 'refund' | 'cancel' | 'editAppointment'>('details');
  const [validOnly, setValidOnly] = useState(false);
  
  // Modais da AgendaSidebar
  const [showWaitingListModal, setShowWaitingListModal] = useState(false);
  const [showPatientsWaitingModal, setShowPatientsWaitingModal] = useState(false);
  const [showScaleConfigModal, setShowScaleConfigModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  
  const [filters, setFilters] = useState<FilterOptions>({
    doctor: '',
    specialty: '',
    status: '',
    type: '',
  });

  // Pre-selected patient from navigation (e.g. PatientDetailView quick actions)
  const location = useLocation();
  const [preselectedPatientInfo, setPreselectedPatientInfo] = useState<{ id: string; name: string } | null>(null);

  // Patient search autocomplete
  const [patientQuery, setPatientQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Form state para novo agendamento
  const [newAppointmentForm, setNewAppointmentForm] = useState({
    patientName: '',
    patientCPF: '',
    patientPhone: '',
    patientEmail: '',
    patientId: '',          // linked patient UUID
    doctorName: '',
    specialty: '',
    time: '',
    date: '',
    duration: 30,
    type: 'presencial' as 'presencial' | 'telemedicina',
    room: '',
    notes: '',
    tussCode: '',           // TUSS procedure code (migration 20260317000002)
    // Campos de pagamento
    paymentType: 'particular' as 'particular' | 'convenio',
    consultationValue: 0,
    insuranceName: '',
    paymentMethod: 'pix' as 'pix' | 'credito' | 'debito' | 'dinheiro' | 'convenio',
    installments: 1,
    telemedLink: '',
  });

  // Form state para registro de pagamento
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'pix' as 'pix' | 'credito' | 'debito' | 'dinheiro',
    installments: 1,
    paidAmount: 0,
  });

  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2).toString().padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  });

  // Dynamic lists from context — empty when no data (never fall back to hardcoded mocks)
  const doctorOptions = professionals.map(p => p.name);
  const specialtyOptions = [...new Set(professionals.map(p => p.specialty).filter(Boolean))];
  const rooms = ['Sala 101', 'Sala 102', 'Sala 201', 'Sala 202'];
  const insuranceOptions = insurances.map(i => i.name);

  // Patient search results (filtered live)
  const patientSearchResults = patientQuery.trim().length >= 2
    ? patients.filter(p =>
        p.name.toLowerCase().includes(patientQuery.toLowerCase()) ||
        p.cpf.replace(/\D/g, '').includes(patientQuery.replace(/\D/g, ''))
      ).slice(0, 6)
    : [];

  // Specialty prices removed — no hardcoded mock values.
  // Consultation value is entered manually per appointment.

  // Pre-fill from navigation state (PatientDetailView → Agendar Consulta)
  useEffect(() => {
    const state = location.state as any;
    if (state?.preselectedPatient) {
      const p = state.preselectedPatient;
      setNewAppointmentForm(prev => ({
        ...prev,
        patientName: p.name || '',
        patientCPF: p.cpf || '',
        patientPhone: p.phone || '',
        patientEmail: p.email || '',
        patientId: p.id || '',
        date: new Date().toISOString().split('T')[0],
        paymentType: p.insurance && p.insurance !== 'Particular' ? 'convenio' : 'particular',
        insuranceName: p.insurance && p.insurance !== 'Particular' ? p.insurance : '',
      }));
      setPatientQuery(p.name || '');
      setShowNewAppointmentModal(true);
      setPreselectedPatientInfo({ id: p.id, name: p.name });
      toastInfo(`Paciente pré-selecionado: ${p.name}`, { description: 'Preencha os demais dados para agendar a consulta.' });
      // Clean state so it doesn't re-trigger on re-render
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Resetar rightPanelView quando abrir modal de detalhes
  useEffect(() => {
    if (selectedAppointment) {
      setRightPanelView('details');
    }
  }, [selectedAppointment]);

  // Ref for the day-view scroll container
  const dayScrollRef = useRef<HTMLDivElement>(null);

  // Each 30-min slot is 30px tall; 8 hours = 16 slots = 480px visible at once
  const SLOT_HEIGHT = 30;
  const DAY_VIEW_HEIGHT = 8 * 2 * SLOT_HEIGHT; // 480px — exactly 8 hours

  // On mount / view change: anchor current hour at the top; resize to show exactly 8 h.
  // Uses DOM measurement instead of arithmetic because slots with appointments are
  // taller than SLOT_HEIGHT (min-h-[30px] grows with content).
  useEffect(() => {
    if (viewMode !== 'day') return;
    const timer = setTimeout(() => {
      const container = dayScrollRef.current;
      if (!container) return;

      const currentHour = new Date().getHours(); // e.g. 14 for any time 14:00–14:59
      const pad = (n: number) => String(n).padStart(2, '0');

      // Find the slot elements by their data-time attribute (actual DOM positions)
      const startEl = container.querySelector<HTMLElement>(`[data-time="${pad(currentHour)}:00"]`);
      const endEl   = container.querySelector<HTMLElement>(`[data-time="${pad(Math.min(currentHour + 8, 23))}:00"]`);

      if (startEl) {
        // Anchor the current-hour block exactly at the top of the visible area
        container.scrollTop = startEl.offsetTop;

        // Resize viewport so exactly 8 hours are visible without scrolling
        if (endEl) {
          container.style.height = `${endEl.offsetTop - startEl.offsetTop}px`;
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [viewMode, selectedDate]);

  // Sync confirmed today's appointments to waiting queue on load
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const confirmedTodayApts = appointments.filter(apt => 
      apt.date === todayStr && apt.status === 'confirmado'
    );
    
    // Use callback form of setState to access current queueEntries without adding it as dependency
    setQueueEntries(prevQueue => {
      const newEntries = [...prevQueue];
      let hasChanges = false;
      
      confirmedTodayApts.forEach(apt => {
        const alreadyInQueue = prevQueue.some(q => q.appointmentId === apt.id);

        if (!alreadyInQueue) {
          const maxTicket = newEntries.reduce((max, q) => {
            const n = parseInt(q.ticketNumber, 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0);
          const ticketNum = String(maxTicket + 1).padStart(3, '0');

          const newEntry = {
            id: crypto.randomUUID(),
            appointmentId: apt.id,
            appointmentTime: apt.time,
            ticketNumber: ticketNum,
            name: apt.patientName,
            status: 'waiting' as const,
            arrivalTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            waitingTime: 0,
            doctor: apt.doctorName,
            specialty: apt.specialty,
            priority: false,
            room: apt.room || '',
            cpf: apt.patientCPF,
            phone: apt.patientPhone,
          };
          newEntries.push(newEntry);
          hasChanges = true;
        }
      });
      
      return hasChanges ? newEntries : prevQueue;
    });
  }, [appointments, setQueueEntries]);

  // appointments / setAppointments come from AppContext — no local state needed

  const showNotificationMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleDragStart = (appointment: Appointment) => {
    setDraggedAppointment(appointment);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (newTime: string) => {
    if (draggedAppointment) {
      setAppointments(appointments.map(apt => 
        apt.id === draggedAppointment.id 
          ? { ...apt, time: newTime }
          : apt
      ));
      setDraggedAppointment(null);
      showNotificationMessage('Consulta reagendada com sucesso!');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + days);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (days * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + days);
    }
    setSelectedDate(newDate);
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Adicionar dias do mês anterior para completar a primeira semana
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(firstDay);
      day.setDate(day.getDate() - (i + 1));
      days.push(day);
    }
    
    // Adicionar todos os dias do mês
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    // Adicionar dias do próximo mês para completar a última semana
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const day = new Date(lastDay);
        day.setDate(day.getDate() + i);
        days.push(day);
      }
    }
    
    return days;
  };

  // Normalize time format: remove seconds if present (18:00:00 -> 18:00)
  const normalizeTime = (t: string) => t.substring(0, 5);

  const getAppointmentAtTime = (time: string, date?: Date) => {
    const targetDate = date || selectedDate;
    const selectedDateStr = targetDate.toISOString().split('T')[0];
    
    const apt = appointments.find(apt => 
      normalizeTime(apt.time) === normalizeTime(time) && apt.date === selectedDateStr
    );
    
    if (!apt) return null;
    
    // Aplicar filtros
    const filtered = filterAppointments([apt]);
    return filtered.length > 0 ? apt : null;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filterAppointments(appointments.filter(apt => apt.date === dateStr));
  };

  const filterAppointments = (appointmentsList: Appointment[]) => {
    return appointmentsList.filter(apt => {
      // Filtro de busca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          apt.patientName.toLowerCase().includes(searchLower) ||
          apt.doctorName.toLowerCase().includes(searchLower) ||
          apt.specialty.toLowerCase().includes(searchLower) ||
          apt.patientCPF.includes(searchTerm) ||
          apt.patientPhone.includes(searchTerm);
        
        if (!matchesSearch) return false;
      }

      // Filtros específicos
      if (filters.doctor && apt.doctorName !== filters.doctor) return false;
      if (filters.specialty && apt.specialty !== filters.specialty) return false;
      if (filters.status && apt.status !== filters.status) return false;
      if (filters.type && apt.type !== filters.type) return false;

      return true;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'text-green-600 bg-green-50';
      case 'pendente':
        return 'text-orange-600 bg-orange-50';
      case 'cancelado':
        return 'text-red-600 bg-red-50';
      case 'realizado':
        return 'text-pink-600 bg-pink-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'text-green-600 bg-green-50';
      case 'pendente':
        return 'text-yellow-600 bg-yellow-50';
      case 'parcial':
        return 'text-orange-600 bg-orange-50';
      case 'vencido':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleConfirmAppointment = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    setAppointments(appointments.map(a =>
      a.id === id ? { ...a, status: 'confirmado' as const } : a
    ));

    // Auto-add to waiting queue if today's appointment and not already in queue
    if (apt) {
      const todayStr = new Date().toISOString().split('T')[0];
      
      if (apt.date === todayStr) {
        // Use callback form to access current queueEntries and avoid race conditions
        setQueueEntries(prevQueue => {
          const alreadyInQueue = prevQueue.some(q => q.appointmentId === apt.id);

          if (alreadyInQueue) {
            return prevQueue;
          }

          const maxTicket = prevQueue.reduce((max, q) => {
            const n = parseInt(q.ticketNumber, 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0);
          const ticketNum = String(maxTicket + 1).padStart(3, '0');

          const newEntry = {
            id: crypto.randomUUID(),
            appointmentId: apt.id,
            appointmentTime: apt.time,
            ticketNumber: ticketNum,
            name: apt.patientName,
            status: 'waiting' as const,
            arrivalTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            waitingTime: 0,
            doctor: apt.doctorName,
            specialty: apt.specialty,
            priority: false,
            room: apt.room || '',
            cpf: apt.patientCPF,
            phone: apt.patientPhone,
          };
          
          // Send notifications after state update is scheduled
          setTimeout(() => {
            addNotification({
              type: 'appointment',
              title: 'Paciente na fila',
              message: `${apt.patientName} adicionado à fila de espera — Senha ${ticketNum}`,
              urgent: false,
            });
            addAuditEntry({
              user: currentUser?.name || 'Sistema',
              userRole: currentUser?.role || 'admin',
              action: 'create',
              module: 'Fila de Espera',
              description: `Paciente ${apt.patientName} adicionado à fila após confirmação`,
              status: 'success',
            });
          }, 0);
          
          return [...prevQueue, newEntry];
        });
      }
    }

    if (apt) {
      sendStatusWhatsApp(
        apt.patientPhone,
        apt.patientName,
        `Olá ${apt.patientName}! Sua consulta em ${apt.date} às ${apt.time} com ${apt.doctorName} foi confirmada. Até breve!`,
      );
    }
    showNotificationMessage('Consulta confirmada!');
    setSelectedAppointment(null);
  };

  const handleCancelAppointment = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    setAppointments(appointments.map(a =>
      a.id === id ? { ...a, status: 'cancelado' as const } : a
    ));
    if (apt) {
      sendStatusWhatsApp(
        apt.patientPhone,
        apt.patientName,
        `Olá ${apt.patientName}! Sua consulta em ${apt.date} às ${apt.time} foi cancelada. Entre em contato para remarcar.`,
      );
    }
    showNotificationMessage('Consulta cancelada!', 'info');
    setSelectedAppointment(null);
  };

  const handleFinishAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    if (appointment.paymentType === 'particular' && appointment.paymentStatus !== 'pago') {
      setPaymentForm({
        paymentMethod: 'pix',
        installments: 1,
        paidAmount: appointment.consultationValue || 0,
      });
      setShowFinishAppointmentModal(true);
    } else {
      sendStatusWhatsApp(
        appointment.patientPhone,
        appointment.patientName,
        `Obrigado, ${appointment.patientName}! Sua consulta com ${appointment.doctorName} foi concluída. Até a próxima!`,
      );
      setAppointments(appointments.map(apt =>
        apt.id === appointment.id ? { ...apt, status: 'realizado' as const } : apt
      ));
      showNotificationMessage('Consulta finalizada!');
      setSelectedAppointment(null);
    }
  };

  const handleSavePayment = () => {
    if (selectedAppointment) {
      const isPaid = paymentForm.paidAmount >= (selectedAppointment.consultationValue || 0);
      
      setAppointments(appointments.map(apt =>
        apt.id === selectedAppointment.id 
          ? { 
              ...apt, 
              status: 'realizado' as const,
              paymentStatus: isPaid ? 'pago' : 'parcial',
              paymentMethod: paymentForm.paymentMethod,
              installments: paymentForm.installments,
              paidAmount: paymentForm.paidAmount,
            } 
          : apt
      ));

      // ✅ CRIAR REGISTRO FINANCEIRO AUTOMÁTICO (verificar duplicata)
      if (paymentForm.paidAmount > 0) {
        // Verificar se já existe um pagamento para esta consulta (comparação mais precisa)
        const existingPayment = financialPayments.find(
          fp => fp.patient === selectedAppointment.patientName && 
                fp.type === 'Consulta' && 
                Math.abs(fp.amount - paymentForm.paidAmount) < 0.01 &&
                fp.date === selectedAppointment.date // Usar a data da consulta, não hoje
        );

        if (!existingPayment) {
          const newFinancialPayment = {
            id: crypto.randomUUID(),
            patient: selectedAppointment.patientName,
            type: 'Consulta',
            date: selectedAppointment.date, // Data da consulta, não de hoje
            amount: paymentForm.paidAmount,
            method: paymentForm.paymentMethod,
            status: 'received' as const,
          };
          setFinancialPayments(prev => [newFinancialPayment, ...prev]);
          
          console.log('✅ Pagamento registrado:', {
            patient: selectedAppointment.patientName,
            amount: paymentForm.paidAmount,
            date: selectedAppointment.date,
            appointmentId: selectedAppointment.id
          });
          
          addAuditEntry({
            user: currentUser?.name || 'Sistema',
            userRole: currentUser?.role || 'admin',
            action: 'create',
            module: 'Financeiro',
            description: `Pagamento de consulta: ${selectedAppointment.patientName} — R$ ${paymentForm.paidAmount.toFixed(2)}`,
            status: 'success',
          });
        } else {
          console.warn('⚠️ Pagamento duplicado detectado e bloqueado:', {
            patient: selectedAppointment.patientName,
            amount: paymentForm.paidAmount,
            existingPaymentId: existingPayment.id
          });
        }
      }
      
      sendStatusWhatsApp(
        selectedAppointment.patientPhone,
        selectedAppointment.patientName,
        `Obrigado, ${selectedAppointment.patientName}! Sua consulta com ${selectedAppointment.doctorName} foi concluída. Até a próxima!`,
      );
      addNotification({
        type: 'payment',
        title: 'Pagamento registrado',
        message: `Consulta de ${selectedAppointment.patientName} finalizada — R$ ${paymentForm.paidAmount.toFixed(2)} recebido.`,
        urgent: false,
      });
      showNotificationMessage('Pagamento registrado com sucesso!');
      setShowFinishAppointmentModal(false);
      setSelectedAppointment(null);
      setPaymentForm({ paymentMethod: 'pix', installments: 1, paidAmount: 0 });
    }
  };

  const handleRegisterPaymentOnly = () => {
    if (selectedAppointment) {
      const isPaid = paymentForm.paidAmount >= (selectedAppointment.consultationValue || 0);
      
      setAppointments(appointments.map(apt =>
        apt.id === selectedAppointment.id 
          ? { 
              ...apt, 
              paymentStatus: isPaid ? 'pago' : 'parcial',
              paymentMethod: paymentForm.paymentMethod,
              installments: paymentForm.installments,
              paidAmount: paymentForm.paidAmount,
            } 
          : apt
      ));

      // ✅ CRIAR REGISTRO FINANCEIRO AUTOMÁTICO (verificar duplicata)
      if (paymentForm.paidAmount > 0) {
        // Verificar se já existe um pagamento para esta consulta (comparação mais precisa)
        const existingPayment = financialPayments.find(
          fp => fp.patient === selectedAppointment.patientName && 
                fp.type === 'Consulta' && 
                Math.abs(fp.amount - paymentForm.paidAmount) < 0.01 &&
                fp.date === selectedAppointment.date // Usar a data da consulta, não hoje
        );

        if (!existingPayment) {
          const newFinancialPayment = {
            id: crypto.randomUUID(),
            patient: selectedAppointment.patientName,
            type: 'Consulta',
            date: selectedAppointment.date, // Data da consulta, não de hoje
            amount: paymentForm.paidAmount,
            method: paymentForm.paymentMethod,
            status: 'received' as const,
          };
          setFinancialPayments(prev => [newFinancialPayment, ...prev]);
          
          console.log('✅ Pagamento registrado (somente pagamento):', {
            patient: selectedAppointment.patientName,
            amount: paymentForm.paidAmount,
            date: selectedAppointment.date,
            appointmentId: selectedAppointment.id
          });
          
          addAuditEntry({
            user: currentUser?.name || 'Sistema',
            userRole: currentUser?.role || 'admin',
            action: 'create',
            module: 'Financeiro',
            description: `Pagamento de consulta: ${selectedAppointment.patientName} — R$ ${paymentForm.paidAmount.toFixed(2)}`,
            status: 'success',
          });
        } else {
          console.warn('⚠️ Pagamento duplicado detectado e bloqueado (somente pagamento):', {
            patient: selectedAppointment.patientName,
            amount: paymentForm.paidAmount,
            existingPaymentId: existingPayment.id
          });
        }
      }
      
      addNotification({
        type: 'payment',
        title: 'Pagamento atualizado',
        message: `Pagamento de ${selectedAppointment.patientName} — R$ ${paymentForm.paidAmount.toFixed(2)} registrado.`,
        urgent: false,
      });
      showNotificationMessage('Pagamento registrado!');
      setShowPaymentModal(false);
      setPaymentForm({ paymentMethod: 'pix', installments: 1, paidAmount: 0 });
    }
  };

  const handleSendReminder = (appointment: Appointment) => {
    const phone = appointment.patientPhone;
    if (!phone) {
      showNotificationMessage(`Paciente ${appointment.patientName} não tem telefone cadastrado.`, 'error');
      return;
    }
    if (!selectedClinicId) {
      showNotificationMessage('Clínica não configurada para envio de mensagens.', 'error');
      return;
    }
    const text = `Olá ${appointment.patientName}! Lembramos sua consulta com ${appointment.doctorName} em ${appointment.date} às ${appointment.time}. Responda SIM para confirmar ou NÃO para cancelar.`;
    sendStatusWhatsApp(phone, appointment.patientName, text);
    showNotificationMessage(`Lembrete enviado para ${appointment.patientName} via WhatsApp`);
  };

  const handleSendPaymentReminder = (appointment: Appointment) => {
    showNotificationMessage(`Lembrete de pagamento enviado para ${appointment.patientName}`);
  };

  // ── Conflict detection ───────────────────────────────────────────────────
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const detectConflict = (
    doctor: string, date: string, time: string, duration: number, excludeId?: string
  ): Appointment | null => {
    if (!doctor || !date || !time) return null;
    const start = timeToMinutes(time);
    const end = start + duration;
    return appointments.find(a => {
      if (excludeId && a.id === excludeId) return false;
      if (a.status === 'cancelado') return false;
      if (a.doctorName !== doctor || a.date !== date) return false;
      const aStart = timeToMinutes(a.time);
      const aEnd = aStart + (a.duration || 30);
      return start < aEnd && end > aStart;
    }) || null;
  };

  const newApptConflict = detectConflict(
    newAppointmentForm.doctorName,
    newAppointmentForm.date,
    newAppointmentForm.time,
    newAppointmentForm.duration,
  );

  const handleCreateAppointment = () => {
    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      patientName: newAppointmentForm.patientName,
      patientCPF: newAppointmentForm.patientCPF,
      patientPhone: newAppointmentForm.patientPhone,
      patientEmail: newAppointmentForm.patientEmail,
      doctorName: newAppointmentForm.doctorName,
      specialty: newAppointmentForm.specialty,
      time: normalizeTime(newAppointmentForm.time), // Normalize time format
      date: newAppointmentForm.date,
      duration: newAppointmentForm.duration,
      type: newAppointmentForm.type,
      status: 'pendente',
      color: '',
      room: newAppointmentForm.room,
      notes: newAppointmentForm.notes,
      consultationValue: newAppointmentForm.consultationValue,
      paymentType: newAppointmentForm.paymentType,
      insuranceName: newAppointmentForm.insuranceName,
      paymentStatus: 'pendente',
      paymentMethod: newAppointmentForm.paymentType === 'convenio' ? 'convenio' : newAppointmentForm.paymentMethod,
      installments: newAppointmentForm.installments,
      tussCode: newAppointmentForm.tussCode || undefined,
      telemedLink: newAppointmentForm.type === 'telemedicina'
        ? (newAppointmentForm.telemedLink || `https://meet.jit.si/ampliemed-${Math.random().toString(36).slice(2, 10)}`)
        : newAppointmentForm.telemedLink || undefined,
    };

    setAppointments([...appointments, newAppointment]);
    addNotification({
      type: 'appointment',
      title: 'Consulta agendada',
      message: `${newAppointment.patientName} — ${newAppointment.date} às ${newAppointment.time} com ${newAppointment.doctorName}.`,
      urgent: false,
    });
    sendStatusWhatsApp(
      newAppointment.patientPhone,
      newAppointment.patientName,
      (() => {
        const d = new Date(newAppointment.date + 'T12:00:00');
        const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
        const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const dateFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const portalUrl = clinicSettings.patientPortalUrl || 'https://ampliemed.com/paciente';
        const instagram = clinicSettings.instagram || '';
        return (
          `Olá! Tudo bem? 😊\n\n` +
          `Estamos passando para confirmar seu atendimento ${newAppointment.specialty || 'médico'}:\n\n` +
          `📅 Data: ${weekdayCap}, ${dateFmt}\n` +
          `⏰ Horário: ${newAppointment.time}\n\n` +
          (newAppointment.type === 'telemedicina' && newAppointment.telemedLink
            ? `🎥 Esta é uma consulta por videochamada. Acesse pelo link abaixo no horário da consulta:\n🔗 ${newAppointment.telemedLink}\n\n`
            : '') +
          `Por favor, confirme ou solicite o reagendamento pelo link abaixo:\n` +
          `👉 ${portalUrl}\n\n` +
          `⚠️ Importante: Cancelamentos devem ser realizados até hoje às 18h. Após esse horário, a sessão será considerada como realizada.\n\n` +
          (instagram ? `Acompanhe nossas novidades no Instagram:\n📲 ${instagram}` : '')
        ).trimEnd();
      })(),
    );
    showNotificationMessage('Consulta agendada com sucesso!');
    setShowNewAppointmentModal(false);
    setPatientQuery('');
    setShowPatientDropdown(false);
    setNewAppointmentForm({
      patientName: '',
      patientCPF: '',
      patientPhone: '',
      patientEmail: '',
      patientId: '',
      doctorName: '',
      specialty: '',
      time: '',
      date: '',
      duration: 30,
      type: 'presencial',
      room: '',
      notes: '',
      paymentType: 'particular',
      consultationValue: 0,
      insuranceName: '',
      paymentMethod: 'pix',
      installments: 1,
      tussCode: '',
      telemedLink: '',
    });
    addAuditEntry({
      user: currentUser?.name || 'Sistema',
      userRole: currentUser?.role || 'admin',
      action: 'create',
      module: 'Agenda',
      description: `Consulta agendada: ${newAppointmentForm.patientName} — ${newAppointmentForm.date} ${newAppointmentForm.time}`,
      status: 'success',
    });
  };

  const getStatsForDate = () => {
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => apt.date === selectedDateStr);
    
    return {
      total: todayAppointments.length,
      confirmed: todayAppointments.filter(apt => apt.status === 'confirmado').length,
      pending: todayAppointments.filter(apt => apt.status === 'pendente').length,
      telemedicine: todayAppointments.filter(apt => apt.type === 'telemedicina').length,
      paymentPending: todayAppointments.filter(apt => apt.paymentStatus === 'pendente' || apt.paymentStatus === 'vencido').length,
    };
  };

  const stats = getStatsForDate();

  // Função para obter cores do card baseado no status
  const getCardColorByStatus = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-50 border-yellow-500';
      case 'confirmado':
        return 'bg-pink-50 border-pink-500';
      case 'em atendimento':
        return 'bg-green-50 border-green-500';
      case 'realizado':
        return 'bg-orange-50 border-orange-500';
      case 'cancelado':
        return 'bg-red-50 border-red-500';
      case 'faltou':
        return 'bg-gray-100 border-gray-500';
      default:
        return 'bg-pink-50 border-pink-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to patient banner */}
      {preselectedPatientInfo && (
        <BackToPatientBanner
          patientName={preselectedPatientInfo.name}
          patientId={preselectedPatientInfo.id}
        />
      )}

      {/* Notification */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 border ${
          notificationType === 'success' ? 'bg-green-50 border-green-600 text-green-900' :
          notificationType === 'error' ? 'bg-red-50 border-red-600 text-red-900' :
          'bg-pink-50 border-pink-600 text-pink-900'
        } shadow-lg`}>
          <div className="flex items-center gap-3">
            {notificationType === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{notificationMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-gray-900 mb-1">Agenda Médica</h2>
            <p className="text-gray-600">Gestão de consultas com registro de pagamento integrado</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search & Filters */}
            <div className="relative bg-white border border-gray-200 flex items-stretch">
              <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
                <Search className="absolute left-4 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente, médico, especialidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border-0 text-sm focus:outline-none focus:bg-white transition-all"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2.5 text-sm transition-colors ${showFilters ? 'bg-pink-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <Filter className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 bg-white">
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm transition-colors ${
                    viewMode === mode ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNewAppointmentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Consulta
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-900 capitalize">{formatDate(selectedDate)}</p>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4">
          <button
            onClick={() => setStatsExpanded(v => !v)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? '' : '-rotate-90'}`} />
            <span>Resumo do dia — Total: <span className="text-pink-600 font-semibold">{stats.total}</span> · Confirmadas: <span className="text-green-600 font-semibold">{stats.confirmed}</span> · Pendentes: <span className="text-orange-600 font-semibold">{stats.pending}</span> · Telemedicina: <span className="text-purple-600 font-semibold">{stats.telemedicine}</span> · Pag. Pendente: <span className="text-red-600 font-semibold">{stats.paymentPending}</span></span>
          </button>
          {statsExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-pink-600' },
                { label: 'Confirmadas', value: stats.confirmed, color: 'text-green-600' },
                { label: 'Pendentes', value: stats.pending, color: 'text-orange-600' },
                { label: 'Telemedicina', value: stats.telemedicine, color: 'text-purple-600' },
                { label: 'Pag. Pendente', value: stats.paymentPending, color: 'text-red-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-gray-200 p-3 text-center">
                  <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Médico</label>
              <select
                value={filters.doctor}
                onChange={(e) => setFilters({ ...filters, doctor: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Todos</option>
                {doctorOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Especialidade</label>
              <select
                value={filters.specialty}
                onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Todas</option>
                {specialtyOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Todos</option>
                <option value="confirmado">Confirmado</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
                <option value="realizado">Realizado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Todos</option>
                <option value="presencial">Presencial</option>
                <option value="telemedicina">Telemedicina</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setFilters({ doctor: '', specialty: '', status: '', type: '' })}
              className="text-xs text-pink-600 hover:underline"
            >
              Limpar filtros
            </button>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <button
                onClick={() => setValidOnly(!validOnly)}
                className={`relative inline-flex h-5 w-9 items-center transition-colors ${validOnly ? 'bg-pink-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-3 w-3 transform bg-white transition-transform ${validOnly ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              Somente válidos
            </label>
          </div>
        </div>
      )}

      {/* Main Layout: Agenda + Sidebar */}
      <div className="flex gap-4 items-start">
        {/* Left: AgendaSidebar */}
        <AgendaSidebar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onSearchAppointment={(term) => setSearchTerm(term)}
          className="h-full"
          onOpenScaleConfig={() => setShowScaleConfigModal(true)}
          onOpenMessages={() => setShowMessagesModal(true)}
          appointments={appointments}
        />

        {/* Center: Time slots */}
        <div className="flex-1 bg-white border border-gray-200 overflow-hidden">
          {viewMode === 'day' && (
            <div ref={dayScrollRef} className="overflow-y-auto" style={{ height: `${DAY_VIEW_HEIGHT}px` }}>
              {timeSlots.map((time) => {
                const apt = getAppointmentAtTime(time);
                return (
                  <div
                    key={time}
                    data-slot
                    data-time={time}
                    className={`flex border-b border-gray-100 min-h-[30px] ${
                      apt ? '' : 'hover:bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(time)}
                  >
                    <div className="w-16 px-2 py-3 text-xs text-gray-400 border-r border-gray-100 flex-shrink-0">
                      {time}
                    </div>
                    <div className="flex-1 p-1">
                      {apt ? (
                        <div
                          draggable
                          onDragStart={() => handleDragStart(apt)}
                          onClick={() => setSelectedAppointment(apt)}
                          className={`${getCardColorByStatus(apt.status)} border-l-4 p-2 cursor-pointer hover:opacity-90 transition-opacity`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-900">{apt.patientName}</p>
                              <p className="text-xs text-gray-500">{apt.doctorName} • {apt.specialty}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {apt.type === 'telemedicina' && (
                                <Video className="w-3 h-3 text-purple-600" />
                              )}
                              <span className={`text-xs px-2 py-0.5 ${getStatusColor(apt.status)}`}>
                                {apt.status}
                              </span>
                              {apt.paymentStatus && (
                                <span className={`text-xs px-2 py-0.5 ${getPaymentStatusColor(apt.paymentStatus)}`}>
                                  {apt.paymentStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'week' && (
            <div className="overflow-x-auto h-full">
              <div className="min-w-[700px] h-full flex flex-col">
                {/* Week header */}
                <div className="grid grid-cols-8 border-b border-gray-200 flex-shrink-0">
                  <div className="w-16" />
                  {getWeekDays().map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={i}
                        className={`px-2 py-3 text-center border-l border-gray-100 ${isToday ? 'bg-pink-50' : ''}`}
                      >
                        <p className="text-xs text-gray-500">
                          {day.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                        </p>
                        <p className={`text-sm ${isToday ? 'text-pink-600 font-semibold' : 'text-gray-700'}`}>
                          {day.getDate()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getAppointmentsForDate(day).length} consultas
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Week slots */}
                <div className="overflow-y-auto flex-1">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b border-gray-100 min-h-[50px]">
                      <div className="w-16 px-2 py-2 text-xs text-gray-400 border-r border-gray-100">
                        {time}
                      </div>
                      {getWeekDays().map((day, i) => {
                        const apt = getAppointmentAtTime(time, day);
                        return (
                          <div
                            key={i}
                            className="border-l border-gray-100 p-1 hover:bg-gray-50 transition-colors"
                          >
                            {apt && (
                              <div
                                onClick={() => setSelectedAppointment(apt)}
                                className={`${getCardColorByStatus(apt.status)} border-l-2 p-1 cursor-pointer text-xs`}
                              >
                                <p className="text-gray-900 truncate">{apt.patientName}</p>
                                <p className="text-gray-500 truncate">{apt.doctorName}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'month' && (
            <div className="h-full overflow-y-auto">
              {/* Month header */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="py-2 text-center text-xs text-gray-500 border-l first:border-l-0 border-gray-100">
                    {d}
                  </div>
                ))}
              </div>
              {/* Month days */}
              <div className="grid grid-cols-7">
                {getMonthDays().map((day, i) => {
                  const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayApts = getAppointmentsForDate(day);
                  return (
                    <div
                      key={i}
                      onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                      className={`min-h-[80px] p-1 border-l border-b border-gray-100 first:border-l-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      }`}
                    >
                      <p className={`text-xs w-6 h-6 flex items-center justify-center mb-1 ${
                        isToday ? 'bg-pink-600 text-white rounded-full' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        {day.getDate()}
                      </p>
                      {dayApts.slice(0, 2).map(apt => (
                        <div
                          key={apt.id}
                          className={`text-xs px-1 py-0.5 mb-0.5 truncate ${getCardColorByStatus(apt.status)}`}
                          onClick={(e) => { e.stopPropagation(); setSelectedAppointment(apt); }}
                        >
                          {normalizeTime(apt.time)} {apt.patientName}
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <p className="text-xs text-gray-400">+{dayApts.length - 2} mais</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Appointment detail panel */}
        {selectedAppointment && (
          <div className="w-80 bg-white border border-gray-200 flex-shrink-0 overflow-y-auto h-full">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex gap-1">
                {[
                  { id: 'details', label: 'Detalhes' },
                  { id: 'history', label: 'Histórico' },
                ] .map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightPanelView(tab.id as any)}
                    className={`px-3 py-1 text-xs transition-colors ${
                      rightPanelView === tab.id ? 'bg-pink-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Patient info */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white text-sm">
                    {selectedAppointment.patientName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{selectedAppointment.patientName}</p>
                    <p className="text-xs text-gray-500">{selectedAppointment.specialty}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {selectedAppointment.time} • {selectedAppointment.duration} min
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-3 h-3" />
                    {selectedAppointment.doctorName}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAppointment.type === 'telemedicina' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {selectedAppointment.type === 'telemedicina' ? 'Telemedicina' : selectedAppointment.room || 'Presencial'}
                  </div>
                  {selectedAppointment.patientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      {selectedAppointment.patientPhone}
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status}
                </span>
                {selectedAppointment.paymentStatus && (
                  <span className={`text-xs px-2 py-1 ${getPaymentStatusColor(selectedAppointment.paymentStatus)}`}>
                    Pgto: {selectedAppointment.paymentStatus}
                  </span>
                )}
              </div>

              {/* Payment info */}
              {selectedAppointment.consultationValue && (
                <div className="bg-gray-50 border border-gray-200 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor:</span>
                    <span className="text-gray-900">R$ {selectedAppointment.consultationValue.toFixed(2)}</span>
                  </div>
                  {selectedAppointment.paidAmount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pago:</span>
                      <span className="text-green-700">R$ {selectedAppointment.paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="text-gray-900 capitalize">{selectedAppointment.paymentType || '-'}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                  <p className="font-medium mb-1">Observações:</p>
                  <p>{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {selectedAppointment.status === 'pendente' && (
                  <button
                    onClick={() => handleConfirmAppointment(selectedAppointment.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar
                  </button>
                )}
                {selectedAppointment.status !== 'realizado' && selectedAppointment.status !== 'cancelado' && (
                  <button
                    onClick={() => handleFinishAppointment(selectedAppointment)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors"
                  >
                    <FileCheck className="w-4 h-4" />
                    Finalizar Consulta
                  </button>
                )}
                {selectedAppointment.paymentStatus === 'pendente' && selectedAppointment.paymentType === 'particular' && (
                  <button
                    onClick={() => { setShowPaymentModal(true); setPaymentForm({ ...paymentForm, paidAmount: selectedAppointment.consultationValue || 0 }); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    Registrar Pagamento
                  </button>
                )}
                <button
                  onClick={() => handleSendReminder(selectedAppointment)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Enviar Lembrete
                </button>
                {selectedAppointment.status !== 'cancelado' && (
                  <button
                    onClick={() => handleCancelAppointment(selectedAppointment.id)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Nova Consulta */}
      {showNewAppointmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900">Nova Consulta</h3>
                <p className="text-sm text-gray-500 mt-0.5">Preencha os dados do agendamento</p>
              </div>
              <button onClick={() => setShowNewAppointmentModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Patient data */}
              <div>
                <h4 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Dados do Paciente
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Patient name with autocomplete search */}
                  <div className="col-span-2 relative">
                    <label className="block text-xs text-gray-600 mb-1">Nome do Paciente *</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={patientQuery || newAppointmentForm.patientName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPatientQuery(val);
                          setNewAppointmentForm({ ...newAppointmentForm, patientName: val, patientId: '', patientCPF: '', patientPhone: '', patientEmail: '' });
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPatientDropdown(false), 150)}
                        className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="Busque pelo nome ou CPF..."
                        autoComplete="off"
                      />
                      {newAppointmentForm.patientId && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium">✓ vinculado</span>
                      )}
                    </div>
                    {/* Dropdown */}
                    {showPatientDropdown && patientSearchResults.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                        {patientSearchResults.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => {
                              setNewAppointmentForm({
                                ...newAppointmentForm,
                                patientName: p.name,
                                patientCPF: p.cpf || '',
                                patientPhone: p.phone || '',
                                patientEmail: p.email || '',
                                patientId: p.id,
                              });
                              setPatientQuery('');
                              setShowPatientDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-pink-50 text-sm border-b border-gray-100 last:border-0"
                          >
                            <p className="text-gray-900 font-medium">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.cpf || 'CPF não informado'} {p.phone ? `• ${p.phone}` : ''}</p>
                          </button>
                        ))}
                        {patients.length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-400 italic">Nenhum paciente cadastrado ainda</p>
                        )}
                      </div>
                    )}
                    {showPatientDropdown && patientQuery.trim().length >= 2 && patientSearchResults.length === 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-sm px-3 py-2 text-xs text-gray-500 italic">
                        Nenhum paciente encontrado — os dados serão salvos manualmente
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">CPF</label>
                    <input
                      type="text"
                      value={newAppointmentForm.patientCPF}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, patientCPF: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={newAppointmentForm.patientPhone}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, patientPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Appointment data */}
              <div>
                <h4 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Dados da Consulta
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Médico *</label>
                    <select
                      value={newAppointmentForm.doctorName}
                      onChange={(e) => {
                        const selectedDoctorName = e.target.value;
                        const doctor = professionals.find(p => p.name === selectedDoctorName);
                        setNewAppointmentForm({
                          ...newAppointmentForm,
                          doctorName: selectedDoctorName,
                          specialty: doctor?.specialty || '',
                          room: doctor?.room || '',
                        });
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Selecione...</option>
                      {doctorOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Especialidade *</label>
                    <select
                      value={newAppointmentForm.specialty}
                      onChange={(e) => {
                        setNewAppointmentForm({ ...newAppointmentForm, specialty: e.target.value });
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Selecione...</option>
                      {specialtyOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Data *</label>
                    <input
                      type="date"
                      value={newAppointmentForm.date}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Horário *</label>
                    <select
                      value={newAppointmentForm.time}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, time: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Selecione...</option>
                      {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                    <select
                      value={newAppointmentForm.type}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="presencial">Presencial</option>
                      <option value="telemedicina">Telemedicina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Sala</label>
                    <select
                      value={newAppointmentForm.room}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, room: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Selecione...</option>
                      {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                {newAppointmentForm.type === 'telemedicina' && (
                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 mb-1">Link da videoconferência</label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={newAppointmentForm.telemedLink}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, telemedLink: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}
              </div>

              {/* Payment data */}
              <div>
                <h4 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Pagamento
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tipo de Pagamento</label>
                    <select
                      value={newAppointmentForm.paymentType}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, paymentType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="particular">Particular</option>
                      <option value="convenio">Convênio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      value={newAppointmentForm.consultationValue}
                      onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, consultationValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  {newAppointmentForm.paymentType === 'convenio' && (
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Convênio</label>
                      <select
                        value={newAppointmentForm.insuranceName}
                        onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, insuranceName: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="">Selecione...</option>
                        {insuranceOptions.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* TUSS Code + Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Código TUSS
                    <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={newAppointmentForm.tussCode}
                    onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, tussCode: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Ex: 10101012"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Observações</label>
                  <textarea
                    value={newAppointmentForm.notes}
                    onChange={(e) => setNewAppointmentForm({ ...newAppointmentForm, notes: e.target.value })}
                    rows={1}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Observações..."
                  />
                </div>
              </div>
            </div>

            {newApptConflict && (
              <div className="mx-6 mb-0 mt-0 px-4 py-3 bg-orange-50 border border-orange-300 flex items-start gap-2 text-sm text-orange-800">
                <span className="font-bold flex-shrink-0">⚠</span>
                <span>
                  <strong>Conflito de horário:</strong> {newApptConflict.patientName} já está agendado para {newApptConflict.time} com {newApptConflict.doctorName}. Você ainda pode salvar, mas verifique a disponibilidade.
                </span>
              </div>
            )}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowNewAppointmentModal(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAppointment}
                disabled={!newAppointmentForm.patientName || !newAppointmentForm.doctorName || !newAppointmentForm.date || !newAppointmentForm.time}
                className={`px-5 py-2.5 text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${newApptConflict ? 'bg-orange-500 hover:bg-orange-600' : 'bg-pink-600 hover:bg-pink-700'}`}
              >
                {newApptConflict ? 'Agendar Mesmo Assim' : 'Agendar Consulta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Finalizar Consulta + Pagamento */}
      {showFinishAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Finalizar Consulta</h3>
              <button onClick={() => setShowFinishAppointmentModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-pink-50 border border-pink-200 p-3 text-sm text-pink-800">
                Consulta de <strong>{selectedAppointment.patientName}</strong> com{' '}
                <strong>{selectedAppointment.doctorName}</strong>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Valor Total</label>
                <p className="text-xl font-semibold text-gray-900">
                  R$ {(selectedAppointment.consultationValue || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Forma de Pagamento</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="pix">PIX</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Valor Pago (R$)</label>
                <input
                  type="number"
                  value={paymentForm.paidAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {paymentForm.paymentMethod === 'credito' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Parcelas</label>
                  <select
                    value={paymentForm.installments}
                    onChange={(e) => setPaymentForm({ ...paymentForm, installments: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    {[1,2,3,4,6,12].map(n => (
                      <option key={n} value={n}>{n}x de R$ {((selectedAppointment.consultationValue || 0) / n).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowFinishAppointmentModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 bg-pink-600 text-white text-sm hover:bg-pink-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Finalizar e Registrar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Pagamento */}
      {showPaymentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Registrar Pagamento</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Forma de Pagamento</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="pix">PIX</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Valor Pago (R$)</label>
                <input
                  type="number"
                  value={paymentForm.paidAmount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paidAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterPaymentOnly}
                className="px-4 py-2 bg-orange-500 text-white text-sm hover:bg-orange-600 transition-colors"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais da AgendaSidebar */}
      <WaitingListModal
        isOpen={showWaitingListModal}
        onClose={() => setShowWaitingListModal(false)}
      />
      <PatientsWaitingModal
        isOpen={showPatientsWaitingModal}
        onClose={() => setShowPatientsWaitingModal(false)}
      />
      <ScaleConfigModal
        isOpen={showScaleConfigModal}
        onClose={() => setShowScaleConfigModal(false)}
      />
      <MessagesModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
      />
    </div>
  );
}
