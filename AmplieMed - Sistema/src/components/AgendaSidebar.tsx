import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  Settings,
  Download,
  FileText,
  MessageSquare,
  Info,
  X,
} from 'lucide-react';

interface AgendaSidebarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSearchAppointment: (term: string) => void;
  className?: string;
  onOpenScaleConfig?: () => void;
  appointments?: any[]; // Para exportar agenda
}

export function AgendaSidebar({
  selectedDate,
  onDateChange,
  onSearchAppointment,
  className,
  onOpenScaleConfig,
  appointments = [],
}: AgendaSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const [showStatusLegend, setShowStatusLegend] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handlePrintAgenda = () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayAppointments = [...appointments.filter(apt => apt.date === dateStr)]
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const dayName = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const statusColors: Record<string, { bg: string; text: string; label: string }> = {
      confirmado: { bg: '#dcfce7', text: '#166534', label: 'Confirmado' },
      pendente: { bg: '#fef9c3', text: '#854d0e', label: 'Pendente' },
      realizado: { bg: '#dbeafe', text: '#1e40af', label: 'Realizado' },
      cancelado: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelado' },
      'em-atendimento': { bg: '#f3e8ff', text: '#6b21a8', label: 'Em Atendimento' },
      'nao-compareceu': { bg: '#f1f5f9', text: '#475569', label: 'Não Compareceu' },
    };

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Agenda - ${dayName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 20px; }
    @media print {
      body { padding: 10px; }
      .no-print { display: none !important; }
      @page { margin: 12mm; size: A4 portrait; }
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ec4899; padding-bottom: 12px; }
    .header h1 { font-size: 20px; color: #1e40af; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; color: #6b7280; }
    .header .date { font-size: 16px; font-weight: 600; color: #111827; margin-top: 6px; text-transform: capitalize; }
    .summary { display: flex; gap: 16px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-item { background: #f3f4f6; border-radius: 6px; padding: 6px 14px; font-size: 12px; color: #374151; }
    .summary-item strong { color: #1e40af; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { background: #1e40af; color: #fff; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr.has-appointment { background: #eff6ff; }
    tbody tr.has-appointment:nth-child(even) { background: #e8f0fe; }
    td { padding: 7px 6px; vertical-align: top; }
    td.time-cell { font-weight: 600; color: #374151; white-space: nowrap; width: 60px; font-size: 13px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .type-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; background: #f3f4f6; color: #6b7280; }
    .patient-name { font-weight: 600; color: #111827; }
    .doctor-name { color: #4b5563; }
    .phone { color: #6b7280; font-size: 11px; }
    .notes { color: #9ca3af; font-size: 11px; font-style: italic; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty-state { text-align: center; padding: 40px; color: #9ca3af; font-style: italic; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .print-btn { display: block; margin: 20px auto; padding: 10px 30px; background: #ec4899; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AmpliaMed - Agenda do Dia</h1>
    <div class="date">${dayName}</div>
    <div class="subtitle">Impresso em ${new Date().toLocaleString('pt-BR')}</div>
  </div>

  <div class="summary">
    <div class="summary-item">Total: <strong>${dayAppointments.length}</strong> agendamento(s)</div>
    <div class="summary-item">Confirmados: <strong>${dayAppointments.filter(a => a.status === 'confirmado').length}</strong></div>
    <div class="summary-item">Pendentes: <strong>${dayAppointments.filter(a => a.status === 'pendente').length}</strong></div>
    <div class="summary-item">Realizados: <strong>${dayAppointments.filter(a => a.status === 'realizado').length}</strong></div>
  </div>

  ${dayAppointments.length === 0
    ? `<div class="empty-state">Nenhum agendamento para este dia.</div>`
    : `<table>
    <thead>
      <tr>
        <th>Horário</th>
        <th>Paciente</th>
        <th>Profissional</th>
        <th>Especialidade</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Telefone</th>
        <th>Obs.</th>
      </tr>
    </thead>
    <tbody>
      ${dayAppointments.map(a => {
        const st = statusColors[a.status] || { bg: '#f3f4f6', text: '#374151', label: a.status };
        const tipo = a.type === 'telemedicina' ? 'Tele' : 'Presencial';
        return `<tr class="has-appointment">
          <td class="time-cell">${a.time}</td>
          <td class="patient-name">${a.patientName || '—'}</td>
          <td class="doctor-name">${a.doctorName || '—'}</td>
          <td>${a.specialty || '—'}</td>
          <td><span class="type-badge">${tipo}</span></td>
          <td><span class="status-badge" style="background:${st.bg};color:${st.text}">${st.label}</span></td>
          <td class="phone">${a.patientPhone || '—'}</td>
          <td class="notes">${a.notes || ''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`}

  <div class="footer">AmpliaMed &mdash; Sistema de Gestão de Clínicas Médicas</div>

  <button class="print-btn no-print" onclick="window.print()">Imprimir</button>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleExportAgenda = () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayAppointments = [...appointments.filter(apt => apt.date === dateStr)]
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const dayName = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const statusColors: Record<string, { bg: string; text: string; label: string }> = {
      confirmado: { bg: '#dcfce7', text: '#166534', label: 'Confirmado' },
      pendente: { bg: '#fef9c3', text: '#854d0e', label: 'Pendente' },
      realizado: { bg: '#dbeafe', text: '#1e40af', label: 'Realizado' },
      cancelado: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelado' },
      'em-atendimento': { bg: '#f3e8ff', text: '#6b21a8', label: 'Em Atendimento' },
      'nao-compareceu': { bg: '#f1f5f9', text: '#475569', label: 'Não Compareceu' },
    };

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Agenda - ${dayName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 20px; }
    @media print {
      body { padding: 10px; }
      .no-print { display: none !important; }
      @page { margin: 12mm; size: A4 portrait; }
    }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ec4899; padding-bottom: 12px; }
    .header h1 { font-size: 20px; color: #1e40af; margin-bottom: 4px; }
    .header .subtitle { font-size: 13px; color: #6b7280; }
    .header .date { font-size: 16px; font-weight: 600; color: #111827; margin-top: 6px; text-transform: capitalize; }
    .summary { display: flex; gap: 16px; justify-content: center; margin-bottom: 16px; flex-wrap: wrap; }
    .summary-item { background: #f3f4f6; border-radius: 6px; padding: 6px 14px; font-size: 12px; color: #374151; }
    .summary-item strong { color: #1e40af; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { background: #1e40af; color: #fff; padding: 8px 6px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr.has-appointment { background: #eff6ff; }
    tbody tr.has-appointment:nth-child(even) { background: #e8f0fe; }
    td { padding: 7px 6px; vertical-align: top; }
    td.time-cell { font-weight: 600; color: #374151; white-space: nowrap; width: 60px; font-size: 13px; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
    .type-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; background: #f3f4f6; color: #6b7280; }
    .patient-name { font-weight: 600; color: #111827; }
    .doctor-name { color: #4b5563; }
    .phone { color: #6b7280; font-size: 11px; }
    .notes { color: #9ca3af; font-size: 11px; font-style: italic; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .save-btn { display: block; margin: 20px auto; padding: 10px 30px; background: #ec4899; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AmpliaMed - Exportação da Agenda</h1>
    <div class="date">${dayName}</div>
    <div class="subtitle">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </div>

  <div class="summary">
    <div class="summary-item">Total: <strong>${dayAppointments.length}</strong> agendamento(s)</div>
    <div class="summary-item">Confirmados: <strong>${dayAppointments.filter(a => a.status === 'confirmado').length}</strong></div>
    <div class="summary-item">Pendentes: <strong>${dayAppointments.filter(a => a.status === 'pendente').length}</strong></div>
    <div class="summary-item">Realizados: <strong>${dayAppointments.filter(a => a.status === 'realizado').length}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Horário</th>
        <th>Paciente</th>
        <th>Profissional</th>
        <th>Especialidade</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Telefone</th>
        <th>Obs.</th>
      </tr>
    </thead>
    <tbody>
      ${dayAppointments.map(a => {
        const st = statusColors[a.status] || { bg: '#f3f4f6', text: '#374151', label: a.status };
        const tipo = a.type === 'telemedicina' ? 'Tele' : 'Presencial';
        return `<tr class="has-appointment">
          <td class="time-cell">${a.time}</td>
          <td class="patient-name">${a.patientName || '—'}</td>
          <td class="doctor-name">${a.doctorName || '—'}</td>
          <td>${a.specialty || '—'}</td>
          <td><span class="type-badge">${tipo}</span></td>
          <td><span class="status-badge" style="background:${st.bg};color:${st.text}">${st.label}</span></td>
          <td class="phone">${a.patientPhone || '—'}</td>
          <td class="notes">${a.notes || ''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">AmpliaMed &mdash; Sistema de Gestão de Clínicas Médicas</div>

  <button class="save-btn no-print" onclick="window.print()">Salvar como PDF</button>
</body>
</html>`;

    const exportWindow = window.open('', '_blank');
    if (exportWindow) {
      exportWindow.document.write(html);
      exportWindow.document.close();
      exportWindow.onload = () => exportWindow.print();
    }
  };

  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Adicionar dias do mês anterior para completar a primeira semana
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(firstDay);
      day.setDate(day.getDate() - (i + 1));
      days.push({ date: day, isCurrentMonth: false });
    }

    // Adicionar todos os dias do mês
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Adicionar dias do próximo mês para completar a última semana
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const day = new Date(lastDay);
        day.setDate(day.getDate() + i);
        days.push({ date: day, isCurrentMonth: false });
      }
    }

    return days;
  };

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearchAppointment(value);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-l border-gray-200 flex flex-col items-center p-3 border-b border-gray-200">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1 hover:bg-gray-100 transition-colors"
          title="Expandir menu"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto ${
        className || ''
      }`}
    >
      {/* Parte Superior - Controle da Agenda */}
      <div className="flex-shrink-0">
        {/* Botão Recolher */}
        <div className="py-2 px-3 border-b border-gray-200 flex items-center justify-end">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-100 transition-colors"
            title="Recolher menu"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendário */}
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-3">
            {/* Header do Calendário */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h4 className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                }).format(currentMonth)}
              </h4>
              <button
                onClick={() => changeMonth(1)}
                className="p-1 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-600 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do Mês */}
            <div className="grid grid-cols-7 gap-1">
              {getMonthDays().map((day, idx) => {
                const isToday =
                  day.date.toDateString() === new Date().toDateString();
                const isSelected =
                  day.date.toDateString() === selectedDate.toDateString();

                return (
                  <button
                    key={idx}
                    onClick={() => onDateChange(day.date)}
                    className={`
                      text-center py-1.5 text-sm transition-colors
                      ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                      ${isToday ? 'border border-pink-600' : ''}
                      ${isSelected ? 'bg-pink-600 text-white' : 'hover:bg-gray-100'}
                    `}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Parte Inferior - Recursos e Configurações */}
      <div className="flex-shrink-0">
        {/* Disponibilidade da agenda */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wider">
            Disponibilidade da Agenda
          </h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 bg-green-500 cursor-help"
                title="Horários disponíveis"
              ></div>
              <div
                className="w-6 h-6 bg-yellow-500 cursor-help"
                title="Parcialmente ocupados"
              ></div>
              <div
                className="w-6 h-6 bg-red-500 cursor-help"
                title="Indisponíveis"
              ></div>
              <div
                className="w-6 h-6 bg-gray-500 cursor-help"
                title="Bloqueados/Ausências"
              ></div>
            </div>
            
            {/* Botão Legendas dos Status */}
            <button
              onClick={() => setShowStatusLegend(true)}
              className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity cursor-pointer"
              title="Legendas dos Status"
            >
              <Info className="w-4 h-4 text-pink-600" />
            </button>
          </div>
        </div>

        {/* Configurar Escalas */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onOpenScaleConfig}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configurar Escalas</span>
          </button>
        </div>

        {/* Exportar Agenda */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleExportAgenda}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Agenda</span>
          </button>
        </div>

        {/* Termos e Documentos */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowTermsModal(true)}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Termos e Documentos</span>
          </button>
        </div>


      </div>

      {/* Modal: Legendas dos Status */}
      {showStatusLegend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStatusLegend(false)}>
          <div className="bg-white w-full max-w-md mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Legendas dos Status</h3>
              <button onClick={() => setShowStatusLegend(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Status de Agendamentos</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium">pendente</span>
                    <span className="text-sm text-gray-600">Agendamento criado, aguardando confirmação</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium">confirmado</span>
                    <span className="text-sm text-gray-600">Paciente confirmou presença</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium">em atendimento</span>
                    <span className="text-sm text-gray-600">Paciente está sendo atendido</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium">realizado</span>
                    <span className="text-sm text-gray-600">Consulta finalizada</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium">cancelado</span>
                    <span className="text-sm text-gray-600">Agendamento cancelado</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium">faltou</span>
                    <span className="text-sm text-gray-600">Paciente não compareceu</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Status de Pagamento</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium">pendente</span>
                    <span className="text-sm text-gray-600">Aguardando pagamento</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium">pago</span>
                    <span className="text-sm text-gray-600">Pagamento realizado</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium">reembolsado</span>
                    <span className="text-sm text-gray-600">Valor devolvido ao paciente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Termos e Documentos */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTermsModal(false)}>
          <div className="bg-white w-full max-w-2xl mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Termos e Documentos</h3>
              <button onClick={() => setShowTermsModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-pink-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Termo de Consentimento</p>
                      <p className="text-xs text-gray-500">Documento padrão de consentimento informado</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-pink-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Termo de Responsabilidade</p>
                      <p className="text-xs text-gray-500">Documento de responsabilização do paciente</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-pink-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Anamnese Padrão</p>
                      <p className="text-xs text-gray-500">Formulário de avaliação inicial do paciente</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-4 border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-pink-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Contrato de Prestação de Serviços</p>
                      <p className="text-xs text-gray-500">Contrato padrão entre clínica e paciente</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowTermsModal(false)} className="px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}