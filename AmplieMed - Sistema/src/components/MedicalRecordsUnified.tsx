import { useState, useEffect } from 'react';
import { FileText, Search, Plus, Filter, Download, User, Eye, Printer, Lock, CheckCircle, AlertCircle, Activity, Brain, Pill, FileCheck, Stethoscope, Save, X, Upload, Calendar, Clock, Edit2, Trash2, CheckCircle2, FileSignature } from 'lucide-react';
import { useLocation } from 'react-router';
import type { UserRole } from '../App';
import { useApp } from './AppContext';
import { BackToPatientBanner } from './BackToPatientBanner';
import { toastInfo } from '../utils/toastService';
import { toastSuccess, toastError, toastWarning, medicalToast } from '../utils/toastService';
import { exportToCSV, exportToPDF } from '../utils/exportService';
import { usePermission } from './PermissionGuard';
import { FileUpload } from './FileUpload';
import type { StoredFileAttachment } from './FileUpload';
import { signDocumentICPBrasil } from '../utils/documentGenerators';
import { cid10Database } from '../data/cid10Database';

interface MedicalRecordsUnifiedProps { 
  userRole: UserRole; 
}

type ViewMode = 'list' | 'form';
type RecordTab = 'anamnesis' | 'physical' | 'diagnosis' | 'prescription' | 'documents' | 'evolution';

export function MedicalRecordsUnified({ userRole }: MedicalRecordsUnifiedProps) {
  const { 
    appointments, 
    patients, 
    currentUser, 
    addNotification, 
    medicalRecords, 
    addMedicalRecord, 
    updateMedicalRecord, 
    deleteMedicalRecord, 
    addAuditEntry,
    addFileAttachment,
    getAttachmentsByEntity,
    deleteFileAttachment
  } = useApp();
  const { canCreate, canUpdate, canDelete, canExport, canSign } = usePermission('records');

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Search & Filters (LIST VIEW)
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'signed' | 'pending'>('all');
  const [viewRecord, setViewRecord] = useState<string | null>(null);

  // Selected patient for new record (FORM VIEW)
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    name: string;
    cpf: string;
    birthDate: string;
    age: number;
    gender: string;
    bloodType: string;
  } | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Form tabs
  const [activeTab, setActiveTab] = useState<RecordTab>('anamnesis');

  // Anamnesis state
  const [anamnesis, setAnamnesis] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    medications: '',
    allergies: '',
    familyHistory: '',
    socialHistory: '',
  });

  // Physical exam state
  const [physicalExam, setPhysicalExam] = useState({
    generalState: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    weight: '',
    height: '',
    bmi: '',
    headNeck: '',
    cardiovascular: '',
    respiratory: '',
    abdomen: '',
    extremities: '',
    neurological: '',
  });

  // Diagnosis state
  const [diagnosis, setDiagnosis] = useState({
    mainDiagnosis: '',
    cid10: '',
    secondaryDiagnosis: '',
    conductPlan: '',
    observations: '',
  });

  // Prescription state
  const [prescriptions, setPrescriptions] = useState<{ 
    id: string; 
    medication: string; 
    dosage: string; 
    frequency: string; 
    duration: string; 
    instructions: string 
  }[]>([]);

  const [isSigned, setIsSigned] = useState(false);
  const [sessionAttachments, setSessionAttachments] = useState<StoredFileAttachment[]>([]);
  const [preselectedPatientInfo, setPreselectedPatientInfo] = useState<{ id: string; name: string } | null>(null);

  // Pre-fill from navigation state (PatientDetailView → Novo Prontuário)
  const location = useLocation();
  useEffect(() => {
    const state = location.state as any;
    if (state?.preselectedPatient) {
      const p = state.preselectedPatient;
      const found = patients.find(pt => pt.id === p.id);
      if (found) {
        setSelectedPatient({
          id: found.id,
          name: found.name,
          cpf: found.cpf,
          birthDate: found.birthDate,
          age: found.age,
          gender: found.gender,
          bloodType: '',
        });
      } else {
        setSelectedPatient({
          id: p.id || '',
          name: p.name || '',
          cpf: p.cpf || '',
          birthDate: '',
          age: 0,
          gender: '',
          bloodType: '',
        });
      }
      if (state.action === 'new') {
        setViewMode('form');
        setEditingRecordId(null);
      }
      setPreselectedPatientInfo({ id: p.id, name: p.name });
      toastInfo(`Paciente pré-selecionado: ${p.name}`, { description: 'Prontuário pronto para preenchimento.' });
      window.history.replaceState({}, '');
    }
  }, [location.state, patients]);

  // Derived records (LIST VIEW)
  const appointmentRecords = appointments
    .filter(a => a.status === 'realizado')
    .map(a => ({
      id: `rec_apt_${a.id}`,
      patientId: '',
      patientName: a.patientName,
      doctorName: a.doctorName,
      date: a.date,
      type: (a.type === 'telemedicina' ? 'Telemedicina' : 'Consulta') as any,
      cid10: '-',
      chiefComplaint: '',
      conductPlan: '',
      signed: false,
      createdAt: a.date,
    }));

  const allRecords = [
    ...medicalRecords,
    ...appointmentRecords.filter(ar => !medicalRecords.some(mr => mr.id === ar.id)),
  ];

  const filteredRecords = allRecords.filter(r => {
    const matchesSearch = r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cid10.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || (filterType === 'signed' && r.signed) || (filterType === 'pending' && !r.signed);
    return matchesSearch && matchesFilter;
  });

  const availablePatients = patients.map(p => ({
    id: p.id,
    name: p.name,
    cpf: p.cpf,
    birthDate: p.birthDate,
    age: p.age,
    gender: p.gender,
    bloodType: '',
  }));

  const filteredPatients = availablePatients.filter(patient =>
    patient.name.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
    patient.cpf.includes(patientSearchTerm)
  );

  const tabs = [
    { id: 'anamnesis', label: 'Anamnese', icon: FileText },
    { id: 'physical', label: 'Exame Físico', icon: Activity },
    { id: 'diagnosis', label: 'Diagnóstico', icon: Brain },
    { id: 'prescription', label: 'Prescrição', icon: Pill },
    { id: 'documents', label: 'Documentos', icon: FileCheck },
    { id: 'evolution', label: 'Evolução', icon: Stethoscope },
  ];

  // Reset form
  const resetForm = () => {
    setAnamnesis({
      chiefComplaint: '',
      historyOfPresentIllness: '',
      pastMedicalHistory: '',
      medications: '',
      allergies: '',
      familyHistory: '',
      socialHistory: '',
    });
    setPhysicalExam({
      generalState: '',
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      weight: '',
      height: '',
      bmi: '',
      headNeck: '',
      cardiovascular: '',
      respiratory: '',
      abdomen: '',
      extremities: '',
      neurological: '',
    });
    setDiagnosis({
      mainDiagnosis: '',
      cid10: '',
      secondaryDiagnosis: '',
      conductPlan: '',
      observations: '',
    });
    setPrescriptions([]);
    setIsSigned(false);
    setSessionAttachments([]);
    setActiveTab('anamnesis');
    setEditingRecordId(null);
  };

  const handleNewRecord = () => {
    resetForm();
    setSelectedPatient(null);
    setShowPatientSearch(true);
  };

  const handleSelectPatient = (patient: typeof selectedPatient) => {
    setSelectedPatient(patient);
    setShowPatientSearch(false);
    setPatientSearchTerm('');
    setViewMode('form');
  };

  const handleBackToList = () => {
    resetForm();
    setSelectedPatient(null);
    setViewMode('list');
  };

  const handleAddPrescription = () => {
    setPrescriptions([
      ...prescriptions,
      { id: crypto.randomUUID(), medication: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ]);
  };

  const handleSave = () => {
    if (!selectedPatient) {
      toastError('Selecione um paciente', { description: 'Busque e selecione um paciente antes de salvar.' });
      return;
    }
    if (!anamnesis.chiefComplaint && !diagnosis.mainDiagnosis) {
      toastWarning('Prontuário incompleto', { description: 'Preencha pelo menos a queixa principal ou o diagnóstico.' });
      return;
    }

    if (editingRecordId) {
      // Update existing
      updateMedicalRecord(editingRecordId, {
        cid10: diagnosis.cid10 || diagnosis.mainDiagnosis || '-',
        chiefComplaint: anamnesis.chiefComplaint,
        conductPlan: diagnosis.conductPlan,
        anamnesis: JSON.stringify(anamnesis),
        physicalExam: JSON.stringify(physicalExam),
        prescriptions: JSON.stringify(prescriptions),
        signed: isSigned,
        signedAt: isSigned ? new Date().toLocaleString('pt-BR') : undefined,
      });
      addNotification({ 
        type: 'document', 
        title: 'Prontuário atualizado', 
        message: `Prontuário de ${selectedPatient.name} atualizado com sucesso`, 
        urgent: false 
      });
      addAuditEntry({
        user: currentUser?.name || 'Médico',
        userRole: currentUser?.role || 'doctor',
        action: 'update',
        module: 'Prontuários',
        description: `Prontuário atualizado: ${selectedPatient.name}`,
        status: 'success',
      });
      medicalToast.recordSaved(selectedPatient.name);
    } else {
      // Create new
      addMedicalRecord({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        doctorName: currentUser?.name || 'Médico',
        date: new Date().toLocaleDateString('pt-BR'),
        type: 'Consulta',
        cid10: diagnosis.cid10 || diagnosis.mainDiagnosis || '-',
        chiefComplaint: anamnesis.chiefComplaint,
        conductPlan: diagnosis.conductPlan,
        anamnesis: JSON.stringify(anamnesis),
        physicalExam: JSON.stringify(physicalExam),
        prescriptions: JSON.stringify(prescriptions),
        signed: isSigned,
        signedAt: isSigned ? new Date().toLocaleString('pt-BR') : undefined,
      });
      addNotification({ 
        type: 'document', 
        title: 'Prontuário salvo', 
        message: `Prontuário de ${selectedPatient.name} salvo com sucesso`, 
        urgent: false 
      });
      addAuditEntry({
        user: currentUser?.name || 'Médico',
        userRole: currentUser?.role || 'doctor',
        action: 'create',
        module: 'Prontuários',
        description: `Prontuário criado: ${selectedPatient.name}`,
        status: 'success',
      });
      medicalToast.recordSaved(selectedPatient.name);
    }
    
    handleBackToList();
  };

  const handleSign = () => {
    if (!selectedPatient) {
      toastError('Selecione um paciente', { description: 'Busque e selecione um paciente antes de assinar.' });
      return;
    }
    setIsSigned(true);
    addNotification({ 
      type: 'document', 
      title: 'Prontuário assinado', 
      message: `Prontuário de ${selectedPatient.name} assinado com certificado ICP-Brasil`, 
      urgent: false 
    });
    addAuditEntry({
      user: currentUser?.name || 'Médico',
      userRole: currentUser?.role || 'doctor',
      action: 'sign',
      module: 'Prontuários',
      description: `Assinatura digital ICP-Brasil aplicada: ${selectedPatient.name}`,
      status: 'success',
    });
    medicalToast.recordSigned(selectedPatient.name);
  };

  const handleSignFromList = (recordId: string, patientName: string) => {
    const signatureData = signDocumentICPBrasil(`prontuario_${recordId}`, currentUser?.name || 'Médico', currentUser?.crm || '');
    updateMedicalRecord(recordId, { signed: true, signedAt: new Date().toLocaleString('pt-BR') });
    addNotification({ type: 'document', title: 'Prontuário assinado', message: `Prontuário de ${patientName} assinado com ${signatureData.certificate}`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'sign', module: 'Prontuários', description: `Prontuário assinado: ${patientName}`, status: 'success' });
    medicalToast.recordSigned(patientName);
  };

  const handleDeleteRecord = (recordId: string, patientName: string) => {
    deleteMedicalRecord(recordId);
    toastSuccess(`Prontuário de ${patientName} excluído`);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Prontuários', description: `Prontuário excluído: ${patientName}`, status: 'success' });
  };

  const handleExportPDF = () => {
    if (!selectedPatient) return;
    exportToPDF(
      `Prontuário — ${selectedPatient.name}`,
      `Data: ${new Date().toLocaleDateString('pt-BR')} | Médico: ${currentUser?.name || 'Médico'}`,
      [
        { header: 'Campo', dataKey: 'campo' },
        { header: 'Informação', dataKey: 'valor' },
      ],
      [
        { campo: 'Queixa Principal', valor: anamnesis.chiefComplaint || '-' },
        { campo: 'Diagnóstico', valor: diagnosis.mainDiagnosis || '-' },
        { campo: 'CID-10', valor: diagnosis.cid10 || '-' },
        { campo: 'Plano de Conduta', valor: diagnosis.conductPlan || '-' },
        { campo: 'Assinado', valor: isSigned ? 'Sim — ICP-Brasil' : 'Não' },
      ],
      `prontuario_${selectedPatient.name.replace(/\s+/g, '_')}`
    );
    addAuditEntry({
      user: currentUser?.name || 'Médico',
      userRole: currentUser?.role || 'doctor',
      action: 'export',
      module: 'Prontuários',
      description: `Prontuário exportado em PDF: ${selectedPatient.name}`,
      status: 'success',
    });
  };

  const handleExportCSV = () => {
    const data = allRecords.map(r => ({
      patientName: r.patientName,
      doctorName: r.doctorName,
      date: r.date,
      type: r.type,
      cid10: r.cid10,
      chiefComplaint: r.chiefComplaint,
      signed: r.signed ? 'Sim' : 'Não',
      signedAt: r.signedAt || '-',
    }));
    exportToCSV(data as Record<string, unknown>[], 'prontuarios', [
      { key: 'patientName', label: 'Paciente' },
      { key: 'doctorName', label: 'Médico' },
      { key: 'date', label: 'Data' },
      { key: 'type', label: 'Tipo' },
      { key: 'cid10', label: 'CID-10' },
      { key: 'chiefComplaint', label: 'Queixa Principal' },
      { key: 'signed', label: 'Assinado' },
    ]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Prontuários', description: `${allRecords.length} prontuários exportados`, status: 'success' });
    toastSuccess('Prontuários exportados!');
  };

  const handleViewRecord = (recordId: string) => {
    const record = medicalRecords.find(r => r.id === recordId);
    if (!record) return;

    // Load record data into form
    const patient = patients.find(p => p.id === record.patientId);
    if (patient) {
      setSelectedPatient({
        id: patient.id,
        name: patient.name,
        cpf: patient.cpf,
        birthDate: patient.birthDate,
        age: patient.age,
        gender: patient.gender,
        bloodType: '',
      });
    } else {
      setSelectedPatient({
        id: record.patientId,
        name: record.patientName,
        cpf: '',
        birthDate: '',
        age: 0,
        gender: '',
        bloodType: '',
      });
    }

    // Parse stored JSON data
    const recordAnamnesis = record.anamnesis ? JSON.parse(record.anamnesis) : null;
    const recordPhysicalExam = record.physicalExam ? JSON.parse(record.physicalExam) : null;
    const recordPrescriptions = record.prescriptions ? JSON.parse(record.prescriptions) : [];

    if (recordAnamnesis) setAnamnesis(recordAnamnesis);
    if (recordPhysicalExam) setPhysicalExam(recordPhysicalExam);
    if (recordPrescriptions) setPrescriptions(recordPrescriptions);

    setDiagnosis({
      mainDiagnosis: record.chiefComplaint || '',
      cid10: record.cid10 !== '-' ? record.cid10 : '',
      secondaryDiagnosis: '',
      conductPlan: record.conductPlan || '',
      observations: '',
    });

    setIsSigned(record.signed);
    setEditingRecordId(recordId);
    setViewMode('form');
  };

  // Render functions for tabs
  const renderAnamnesis = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Queixa Principal *
        </label>
        <textarea
          value={anamnesis.chiefComplaint}
          onChange={(e) => setAnamnesis({ ...anamnesis, chiefComplaint: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Descreva a queixa principal do paciente..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          História da Doença Atual (HDA) *
        </label>
        <textarea
          value={anamnesis.historyOfPresentIllness}
          onChange={(e) => setAnamnesis({ ...anamnesis, historyOfPresentIllness: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Descreva a evolução dos sintomas, duração, fatores agravantes e atenuantes..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Antecedentes Pessoais
          </label>
          <textarea
            value={anamnesis.pastMedicalHistory}
            onChange={(e) => setAnamnesis({ ...anamnesis, pastMedicalHistory: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Doenças prévias, cirurgias, hospitalizações..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medicações em Uso
          </label>
          <textarea
            value={anamnesis.medications}
            onChange={(e) => setAnamnesis({ ...anamnesis, medications: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Liste as medicações atuais, doses e frequência..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alergias *
          </label>
          <textarea
            value={anamnesis.allergies}
            onChange={(e) => setAnamnesis({ ...anamnesis, allergies: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Medicamentos, alimentos, outras substâncias..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            História Familiar
          </label>
          <textarea
            value={anamnesis.familyHistory}
            onChange={(e) => setAnamnesis({ ...anamnesis, familyHistory: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Doenças em familiares próximos..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          História Social
        </label>
        <textarea
          value={anamnesis.socialHistory}
          onChange={(e) => setAnamnesis({ ...anamnesis, socialHistory: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Tabagismo, etilismo, atividade física, ocupação..."
        />
      </div>
    </div>
  );

  const renderPhysicalExam = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-3">Sinais Vitais</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">PA (mmHg)</label>
            <input
              type="text"
              value={physicalExam.bloodPressure}
              onChange={(e) => setPhysicalExam({ ...physicalExam, bloodPressure: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
              placeholder="120/80"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">FC (bpm)</label>
            <input
              type="text"
              value={physicalExam.heartRate}
              onChange={(e) => setPhysicalExam({ ...physicalExam, heartRate: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
              placeholder="72"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Temp (°C)</label>
            <input
              type="text"
              value={physicalExam.temperature}
              onChange={(e) => setPhysicalExam({ ...physicalExam, temperature: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
              placeholder="36.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">FR (irpm)</label>
            <input
              type="text"
              value={physicalExam.respiratoryRate}
              onChange={(e) => setPhysicalExam({ ...physicalExam, respiratoryRate: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
              placeholder="16"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Peso (kg)</label>
            <input
              type="text"
              value={physicalExam.weight}
              onChange={(e) => setPhysicalExam({ ...physicalExam, weight: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
              placeholder="70"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Altura (cm)</label>
            <input
              type="text"
              value={physicalExam.height}
              onChange={(e) => setPhysicalExam({ ...physicalExam, height: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">IMC</label>
            <input
              type="text"
              value={physicalExam.bmi}
              onChange={(e) => setPhysicalExam({ ...physicalExam, bmi: e.target.value })}
              className="w-full px-3 py-2 bg-gray-100 border border-blue-300"
              placeholder="Auto"
              readOnly
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Estado Geral</label>
            <select
              value={physicalExam.generalState}
              onChange={(e) => setPhysicalExam({ ...physicalExam, generalState: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 focus:outline-none focus:border-blue-600"
            >
              <option value="">Selecione</option>
              <option value="Bom">Bom</option>
              <option value="Regular">Regular</option>
              <option value="Grave">Grave</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cabeça e Pescoço</label>
          <textarea
            value={physicalExam.headNeck}
            onChange={(e) => setPhysicalExam({ ...physicalExam, headNeck: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do exame..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cardiovascular</label>
          <textarea
            value={physicalExam.cardiovascular}
            onChange={(e) => setPhysicalExam({ ...physicalExam, cardiovascular: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do exame..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Respiratório</label>
          <textarea
            value={physicalExam.respiratory}
            onChange={(e) => setPhysicalExam({ ...physicalExam, respiratory: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do exame..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Abdome</label>
          <textarea
            value={physicalExam.abdomen}
            onChange={(e) => setPhysicalExam({ ...physicalExam, abdomen: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do exame..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Extremidades</label>
          <textarea
            value={physicalExam.extremities}
            onChange={(e) => setPhysicalExam({ ...physicalExam, extremities: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do exame..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Neurológico</label>
          <textarea
            value={physicalExam.neurological}
            onChange={(e) => setPhysicalExam({ ...physicalExam, neurological: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do exame..."
          />
        </div>
      </div>
    </div>
  );

  const renderDiagnosis = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Diagnóstico Principal *
        </label>
        <input
          type="text"
          value={diagnosis.mainDiagnosis}
          onChange={(e) => setDiagnosis({ ...diagnosis, mainDiagnosis: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Digite o diagnóstico..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CID-10 *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={diagnosis.cid10}
            onChange={(e) => setDiagnosis({ ...diagnosis, cid10: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Ex: I10"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Diagnósticos Secundários
        </label>
        <textarea
          value={diagnosis.secondaryDiagnosis}
          onChange={(e) => setDiagnosis({ ...diagnosis, secondaryDiagnosis: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Outros diagnósticos relevantes..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Plano de Conduta *
        </label>
        <textarea
          value={diagnosis.conductPlan}
          onChange={(e) => setDiagnosis({ ...diagnosis, conductPlan: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Tratamento proposto, exames solicitados, orientações..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          value={diagnosis.observations}
          onChange={(e) => setDiagnosis({ ...diagnosis, observations: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Informações adicionais..."
        />
      </div>
    </div>
  );

  const renderPrescription = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Prescrição Médica</h3>
        <button
          onClick={handleAddPrescription}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Medicamento
        </button>
      </div>

      <div className="space-y-4">
        {prescriptions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300">
            <Pill className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhum medicamento adicionado</p>
            <button
              onClick={handleAddPrescription}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Adicionar primeiro medicamento
            </button>
          </div>
        ) : (
          prescriptions.map((prescription, index) => (
            <div key={prescription.id} className="p-4 border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Medicamento {index + 1}</span>
                <button
                  onClick={() => setPrescriptions(prescriptions.filter(p => p.id !== prescription.id))}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remover
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Medicamento *</label>
                  <input
                    type="text"
                    value={prescription.medication}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[index].medication = e.target.value;
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
                    placeholder="Nome do medicamento e concentração"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dosagem *</label>
                  <input
                    type="text"
                    value={prescription.dosage}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[index].dosage = e.target.value;
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
                    placeholder="Ex: 1 comprimido"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Frequência *</label>
                  <input
                    type="text"
                    value={prescription.frequency}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[index].frequency = e.target.value;
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
                    placeholder="Ex: 2x ao dia"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Duração *</label>
                  <input
                    type="text"
                    value={prescription.duration}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[index].duration = e.target.value;
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
                    placeholder="Ex: 30 dias"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Instruções</label>
                  <input
                    type="text"
                    value={prescription.instructions}
                    onChange={(e) => {
                      const updated = [...prescriptions];
                      updated[index].instructions = e.target.value;
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
                    placeholder="Instruções especiais de uso"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isSigned && (
        <div className="p-4 bg-green-50 border border-green-200 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Prescrição Assinada Digitalmente</p>
            <p className="text-xs text-green-700 mt-1">
              Assinado por {currentUser?.name || 'Médico'} {currentUser?.crm ? `(${currentUser.crm})` : ''} em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-green-600 mt-1">Certificado ICP-Brasil verificado</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderDocuments = () => {
    const patientAttachments = selectedPatient ? getAttachmentsByEntity('patient', selectedPatient.id) : [];
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-6 border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-colors text-center group">
            <FileCheck className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Atestado Médico</p>
            <p className="text-xs text-gray-500 mt-1">Gerar atestado</p>
          </button>

          <button className="p-6 border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-colors text-center group">
            <Pill className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Receita</p>
            <p className="text-xs text-gray-500 mt-1">Imprimir receita</p>
          </button>

          <button className="p-6 border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-colors text-center group">
            <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Relatório</p>
            <p className="text-xs text-gray-500 mt-1">Gerar relatório</p>
          </button>
        </div>

        {selectedPatient ? (
          <div className="border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-700">Anexar Documentos ao Prontuário</h3>
            </div>
            <FileUpload
              bucketType="documents"
              folder={`patients/${selectedPatient.id}`}
              label="Arrastar ou selecionar arquivo"
              description="PDF, Word, JPG, PNG — máx. 20 MB"
              multiple
              entityType="patient"
              entityId={selectedPatient.id}
              uploadedBy={currentUser?.name || ''}
              existingFiles={[...patientAttachments, ...sessionAttachments]}
              onUploadComplete={(file) => {
                addFileAttachment(file);
                setSessionAttachments(prev => [...prev, file]);
              }}
              onRemove={(id) => {
                deleteFileAttachment(id);
                setSessionAttachments(prev => prev.filter(f => f.id !== id));
              }}
            />
          </div>
        ) : (
          <div className="border border-gray-200 p-5 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Selecione um paciente para gerenciar documentos</p>
          </div>
        )}
      </div>
    );
  };

  const renderEvolution = () => {
    const evolutions = selectedPatient
      ? medicalRecords
          .filter(r => r.patientId === selectedPatient.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(r => ({
            id: r.id,
            date: `${r.date} ${r.signedAt ? r.signedAt.split(' ')[1] || '' : ''}`.trim(),
            doctor: r.doctorName,
            specialty: '',
            text: [r.chiefComplaint, r.conductPlan].filter(Boolean).join(' | ') || 'Sem descrição.',
            signed: r.signed,
          }))
      : [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Histórico de Evoluções</h3>
        </div>

        <div className="space-y-4">
          {evolutions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300">
              <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhuma evolução registrada</p>
            </div>
          ) : (
            evolutions.map((evolution) => (
              <div key={evolution.id} className="border border-gray-200 bg-white">
                <div className="flex items-start justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{evolution.doctor}</p>
                      {evolution.specialty && (
                        <p className="text-xs text-gray-500">{evolution.specialty}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      {evolution.date.split(' ')[0]}
                    </div>
                    {evolution.date.split(' ')[1] && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {evolution.date.split(' ')[1]}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{evolution.text}</p>
                  {evolution.signed && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                      <Lock className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">Assinado digitalmente</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Main render - FORM VIEW
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        {/* Back to patient banner */}
        {preselectedPatientInfo && (
          <BackToPatientBanner
            patientName={preselectedPatientInfo.name}
            patientId={preselectedPatientInfo.id}
          />
        )}
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-gray-900 mb-2">{editingRecordId ? 'Editar Prontuário' : 'Novo Prontuário'}</h2>
            <p className="text-gray-600">Registro completo do atendimento médico</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Patient Info Bar */}
        {selectedPatient && (
          <div className="bg-white border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedPatient.name}</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {selectedPatient.cpf && <span>CPF: {selectedPatient.cpf}</span>}
                    {selectedPatient.cpf && selectedPatient.age > 0 && <span>•</span>}
                    {selectedPatient.age > 0 && <span>{selectedPatient.age} anos</span>}
                    {selectedPatient.birthDate && <span>({selectedPatient.birthDate})</span>}
                    {selectedPatient.gender && (
                      <>
                        <span>•</span>
                        <span>{selectedPatient.gender}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPatientSearch(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Trocar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as RecordTab)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'anamnesis' && renderAnamnesis()}
            {activeTab === 'physical' && renderPhysicalExam()}
            {activeTab === 'diagnosis' && renderDiagnosis()}
            {activeTab === 'prescription' && renderPrescription()}
            {activeTab === 'documents' && renderDocuments()}
            {activeTab === 'evolution' && renderEvolution()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSign}
            disabled={isSigned || !canSign}
            className={`flex items-center gap-2 px-6 py-2.5 transition-colors ${
              isSigned
                ? 'bg-green-600 text-white cursor-not-allowed'
                : canSign
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Lock className="w-4 h-4" />
            {isSigned ? 'Assinado' : 'Assinar ICP-Brasil'}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!canCreate && !editingRecordId}
              className={`flex items-center gap-2 px-6 py-2.5 transition-colors ${
                (canCreate || editingRecordId)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {editingRecordId ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render - LIST VIEW
  return (
    <div className="space-y-6">
      {/* Back to patient banner */}
      {preselectedPatientInfo && (
        <BackToPatientBanner
          patientName={preselectedPatientInfo.name}
          patientId={preselectedPatientInfo.id}
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="w-1/2">
          <h2 className="text-gray-900 mb-2">Prontuários</h2>
          <p className="text-gray-600">Registros médicos com assinatura digital ICP-Brasil</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch">
            <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar prontuários..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none focus:bg-white transition-all" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 text-sm transition-colors ${showFilters ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            {canExport && (
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm transition-colors" title="Exportar CSV">
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {showFilters && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 p-3 shadow-lg z-10 w-full">
                <div className="grid grid-cols-3 gap-2">
                  {(['all', 'signed', 'pending'] as const).map(f => (
                    <button key={f} onClick={() => setFilterType(f)}
                      className={`px-3 py-2 border text-sm transition-colors ${filterType === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                      {f === 'all' ? 'Todos' : f === 'signed' ? 'Assinados' : 'Pendentes'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {canCreate && (
            <button onClick={handleNewRecord}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Novo Registro
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: allRecords.length, icon: FileText, color: 'text-blue-600' },
          { label: 'Assinados', value: allRecords.filter(r => r.signed).length, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Pendentes', value: allRecords.filter(r => !r.signed).length, icon: FileSignature, color: 'text-orange-600' },
        ].map(s => { const Icon = s.icon; return (
          <div key={s.label} className="bg-white border border-gray-200 p-4 flex items-center gap-4">
            <div className={`p-3 bg-gray-50 ${s.color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-2xl text-gray-900">{s.value}</p></div>
          </div>
        ); })}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Paciente</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Data</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Profissional</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Tipo</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">CID-10</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum prontuário encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{record.patientName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.doctorName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700">
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{record.cid10}</td>
                    <td className="px-4 py-3">
                      {record.signed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Assinado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700">
                          <AlertCircle className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewRecord(record.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Ver/Editar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!record.signed && canSign && (
                          <button
                            onClick={() => handleSignFromList(record.id, record.patientName)}
                            className="p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                            title="Assinar"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteRecord(record.id, record.patientName)}
                            className="p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Search Modal */}
      {showPatientSearch && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Selecionar Paciente</h3>
              <button
                onClick={() => {
                  setShowPatientSearch(false);
                  setPatientSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 text-sm focus:outline-none focus:border-blue-600"
                  autoFocus
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="w-full p-4 border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">{patient.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {patient.cpf && <span>CPF: {patient.cpf}</span>}
                        {patient.cpf && patient.age > 0 && <span>•</span>}
                        {patient.age > 0 && <span>{patient.age} anos</span>}
                        {patient.gender && (
                          <>
                            <span>•</span>
                            <span>{patient.gender}</span>
                          </>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Nenhum paciente encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
