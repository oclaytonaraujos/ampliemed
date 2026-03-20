import { useState, useEffect, useRef } from 'react';
import { 
  User, Calendar, FileText, Activity, Pill, ClipboardList, FileCheck, 
  DollarSign, Clock, Save, X, ArrowLeft, CheckCircle, AlertCircle,
  Stethoscope, Heart, Thermometer, Droplet, Wind, Eye, Plus, Trash2,
  Printer, Send, Search, ChevronRight, Building, Phone, Mail,
  CreditCard, CalendarPlus, Shield, Signature, Sparkles, Upload, Download
} from 'lucide-react';
import type { UserRole } from '../App';
import { SearchModal } from './SearchModal';
import { calculateIMC, classifyIMC } from '../utils/validators';
import { detectInteractions, generateInteractionsReport, hasSevereInteractions } from '../utils/drugInteractions';
import { suggestCID10FromSymptoms } from '../data/cid10Database';
import { 
  generatePrescriptionHTML, 
  generateCertificateHTML, 
  generateTISSXML,
  downloadPDF,
  downloadXML,
  signDocumentICPBrasil
} from '../utils/documentGenerators';
import { medicalToast, toastError } from '../utils/toastService';
import { useApp } from './AppContext';
import { FileUpload } from './FileUpload';

interface MedicalConsultationWorkspaceProps {
  userRole: UserRole;
  patient: {
    id: string;
    name: string;
    cpf: string;
    birthDate: string;
    age: number;
    gender: string;
    phone: string;
    email: string;
    insurance: string;
    allergies?: string;
  };
  onClose: () => void;
  onFinish: () => void;
}

interface VitalSigns {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  bmi: string;
}

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface ExamRequest {
  id: string;
  examType: string;
  indication: string;
  urgency: 'routine' | 'urgent' | 'emergency';
}

interface Procedure {
  id: string;
  tussCode: string;
  description: string;
  quantity: number;
  value: string;
}

type Step = 'anamnesis' | 'physical' | 'diagnosis' | 'prescription' | 'exams' | 'documents' | 'procedures' | 'finish';

export function MedicalConsultationWorkspace({ userRole, patient, onClose, onFinish }: MedicalConsultationWorkspaceProps) {
  const { addMedicalRecord, setExams, currentUser, addAuditEntry, addNotification, addFileAttachment, deleteFileAttachment, getAttachmentsByEntity } = useApp();
  const [currentStep, setCurrentStep] = useState<Step>('anamnesis');
  const [saving, setSaving] = useState(false);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);

  // ID de sessão estável para agrupar os anexos desta consulta
  const sessionId = useRef(crypto.randomUUID()).current;

  // IDs dos anexos enviados nesta sessão (para controle local de exibição)
  const [localUploadedIds, setLocalUploadedIds] = useState<string[]>([]);

  // Anexos desta consulta (filtra pelo sessionId registrado como entityId)
  const consultationAttachments = getAttachmentsByEntity('appointment', sessionId).filter(
    f => localUploadedIds.includes(f.id)
  );
  
  // Anamnesis data
  const [anamnesis, setAnamnesis] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    medications: '',
    allergies: patient.allergies || '',
    familyHistory: '',
    socialHistory: '',
  });

  // Vital signs
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    bmi: '',
  });

  // Physical exam
  const [physicalExam, setPhysicalExam] = useState({
    generalAppearance: '',
    cardiovascular: '',
    respiratory: '',
    abdomen: '',
    neurological: '',
    musculoskeletal: '',
    skin: '',
    other: '',
  });

  // Diagnosis
  const [diagnosis, setDiagnosis] = useState({
    hypothesis: '',
    cid10Code: '',
    cid10Description: '',
    observations: '',
  });

  // Prescriptions
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // Exam requests
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);

  // Procedures performed
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  // Documents
  const [generateCertificate, setGenerateCertificate] = useState(false);
  const [certificateDays, setCertificateDays] = useState('1');
  const [certificateText, setCertificateText] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix' | 'insurance'>('insurance');
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');

  // Rescheduling
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');

  const steps = [
    { id: 'anamnesis', label: 'Anamnese', icon: FileText },
    { id: 'physical', label: 'Exame Físico', icon: Activity },
    { id: 'diagnosis', label: 'Diagnóstico', icon: Stethoscope },
    { id: 'prescription', label: 'Prescrição', icon: Pill },
    { id: 'exams', label: 'Exames', icon: ClipboardList },
    { id: 'documents', label: 'Documentos', icon: FileCheck },
    { id: 'procedures', label: 'Procedimentos', icon: Building },
    { id: 'finish', label: 'Finalizar', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id as Step);
    }
  };

  const handleAddPrescription = () => {
    setPrescriptions([
      ...prescriptions,
      { id: crypto.randomUUID(), medication: '', dosage: '', frequency: '', duration: '', instructions: '' }
    ]);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const handleAddExam = () => {
    setExamRequests([
      ...examRequests,
      { id: crypto.randomUUID(), examType: '', indication: '', urgency: 'routine' }
    ]);
  };

  const handleRemoveExam = (id: string) => {
    setExamRequests(examRequests.filter(e => e.id !== id));
  };

  const handleAddProcedure = () => {
    setProcedures([
      ...procedures,
      { id: crypto.randomUUID(), tussCode: '', description: '', quantity: 1, value: '' }
    ]);
  };

  const handleRemoveProcedure = (id: string) => {
    setProcedures(procedures.filter(p => p.id !== id));
  };

  const calculateTotal = () => {
    return procedures.reduce((sum, proc) => {
      const value = parseFloat(proc.value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      return sum + (value * proc.quantity);
    }, 0);
  };

  const handleFinishConsultation = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 1. Save medical record to context
    addMedicalRecord({
      patientId: patient.id,
      patientName: patient.name,
      doctorName: currentUser?.name || 'Médico',
      date: new Date().toLocaleDateString('pt-BR'),
      type: 'Consulta',
      cid10: diagnosis.cid10Code || diagnosis.hypothesis || '-',
      chiefComplaint: anamnesis.chiefComplaint,
      conductPlan: diagnosis.observations || '',
      anamnesis: JSON.stringify(anamnesis),
      physicalExam: JSON.stringify({ ...physicalExam, ...vitalSigns }),
      prescriptions: JSON.stringify(prescriptions),
      signed: false,
    });

    // 2. Save exam requests to context
    if (examRequests.length > 0) {
      setExams(prev => [
        ...examRequests
          .filter(e => e.examType)
          .map(e => ({
            id: crypto.randomUUID(),
            patientName: patient.name,
            patientId: patient.id,
            examType: e.examType,
            requestDate: new Date().toLocaleDateString('pt-BR'),
            resultDate: null,
            status: 'solicitado' as const,
            laboratory: '-',
            requestedBy: currentUser?.name || 'Médico',
            priority: e.urgency === 'emergency' ? 'urgente' as const : e.urgency === 'urgent' ? 'urgente' as const : 'normal' as const,
            notes: e.indication,
          })),
        ...prev,
      ]);
    }

    // 3. Audit entry
    addAuditEntry({
      user: currentUser?.name || 'Médico',
      userRole: currentUser?.role || 'doctor',
      action: 'create',
      module: 'Consulta Médica',
      description: `Consulta finalizada para ${patient.name} — CID: ${diagnosis.cid10Code || '-'}`,
      status: 'success',
    });

    // 4. In-app notification
    addNotification({
      type: 'document',
      title: 'Consulta finalizada',
      message: `Atendimento de ${patient.name} concluído e prontuário salvo.`,
      urgent: false,
    });

    setSaving(false);
    medicalToast.recordSaved(patient.name);
    onFinish();
  };

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
          placeholder="Ex: Dor torácica há 3 dias..."
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
      {/* Vital Signs */}
      <div className="bg-blue-50 border border-blue-200 p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Sinais Vitais
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1">PA (mmHg)</label>
            <input
              type="text"
              value={vitalSigns.bloodPressure}
              onChange={(e) => setVitalSigns({ ...vitalSigns, bloodPressure: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="120/80"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">FC (bpm)</label>
            <input
              type="text"
              value={vitalSigns.heartRate}
              onChange={(e) => setVitalSigns({ ...vitalSigns, heartRate: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="72"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Temp (°C)</label>
            <input
              type="text"
              value={vitalSigns.temperature}
              onChange={(e) => setVitalSigns({ ...vitalSigns, temperature: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="36.5"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">FR (irpm)</label>
            <input
              type="text"
              value={vitalSigns.respiratoryRate}
              onChange={(e) => setVitalSigns({ ...vitalSigns, respiratoryRate: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="16"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">SpO₂ (%)</label>
            <input
              type="text"
              value={vitalSigns.oxygenSaturation}
              onChange={(e) => setVitalSigns({ ...vitalSigns, oxygenSaturation: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="98"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Peso (kg)</label>
            <input
              type="text"
              value={vitalSigns.weight}
              onChange={(e) => setVitalSigns({ ...vitalSigns, weight: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="70"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Altura (cm)</label>
            <input
              type="text"
              value={vitalSigns.height}
              onChange={(e) => setVitalSigns({ ...vitalSigns, height: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="170"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">IMC</label>
            <input
              type="text"
              value={vitalSigns.bmi}
              onChange={(e) => setVitalSigns({ ...vitalSigns, bmi: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              placeholder="24.2"
            />
          </div>
        </div>
      </div>

      {/* Physical Examination by System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Aparência Geral
          </label>
          <textarea
            value={physicalExam.generalAppearance}
            onChange={(e) => setPhysicalExam({ ...physicalExam, generalAppearance: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Estado geral, nível de consciência, hidratação..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sistema Cardiovascular
          </label>
          <textarea
            value={physicalExam.cardiovascular}
            onChange={(e) => setPhysicalExam({ ...physicalExam, cardiovascular: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Ausculta cardíaca, pulsos, edemas..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sistema Respiratório
          </label>
          <textarea
            value={physicalExam.respiratory}
            onChange={(e) => setPhysicalExam({ ...physicalExam, respiratory: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Ausculta pulmonar, padrão respiratório..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Abdome
          </label>
          <textarea
            value={physicalExam.abdomen}
            onChange={(e) => setPhysicalExam({ ...physicalExam, abdomen: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Inspeção, palpação, ausculta abdominal..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sistema Neurológico
          </label>
          <textarea
            value={physicalExam.neurological}
            onChange={(e) => setPhysicalExam({ ...physicalExam, neurological: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Estado mental, força, sensibilidade, reflexos..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sistema Musculoesquelético
          </label>
          <textarea
            value={physicalExam.musculoskeletal}
            onChange={(e) => setPhysicalExam({ ...physicalExam, musculoskeletal: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Articulações, mobilidade, deformidades..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Outras Observações
        </label>
        <textarea
          value={physicalExam.other}
          onChange={(e) => setPhysicalExam({ ...physicalExam, other: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Achados adicionais relevantes..."
        />
      </div>
    </div>
  );

  const renderDiagnosis = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hipótese Diagnóstica *
        </label>
        <textarea
          value={diagnosis.hypothesis}
          onChange={(e) => setDiagnosis({ ...diagnosis, hypothesis: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Descreva a hipótese diagnóstica principal..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CID-10 *
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={diagnosis.cid10Code}
            onChange={(e) => setDiagnosis({ ...diagnosis, cid10Code: e.target.value })}
            className="w-32 px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="I10"
          />
          <input
            type="text"
            value={diagnosis.cid10Description}
            onChange={(e) => setDiagnosis({ ...diagnosis, cid10Description: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            placeholder="Descrição do CID-10"
          />
          <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Search className="w-4 h-4" />
            Buscar CID
          </button>
        </div>
        <p className="text-xs text-gray-500">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Use a IA para sugestão automática de CID-10 baseado nos sintomas
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações Adicionais
        </label>
        <textarea
          value={diagnosis.observations}
          onChange={(e) => setDiagnosis({ ...diagnosis, observations: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
          placeholder="Diagnósticos diferenciais, prognóstico, orientações..."
        />
      </div>
    </div>
  );

  const renderPrescription = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Prescrição de Medicamentos</h3>
        <button
          onClick={handleAddPrescription}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Medicamento
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 border border-gray-200">
          <Pill className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Nenhum medicamento prescrito</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((prescription, index) => (
            <div key={prescription.id} className="p-4 border border-gray-300 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Medicamento {index + 1}</h4>
                <button
                  onClick={() => handleRemovePrescription(prescription.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-700 mb-1">Medicamento *</label>
                  <input
                    type="text"
                    value={prescription.medication}
                    onChange={(e) => {
                      const updated = prescriptions.map(p => 
                        p.id === prescription.id ? { ...p, medication: e.target.value } : p
                      );
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Ex: Losartana 50mg"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Dose</label>
                  <input
                    type="text"
                    value={prescription.dosage}
                    onChange={(e) => {
                      const updated = prescriptions.map(p => 
                        p.id === prescription.id ? { ...p, dosage: e.target.value } : p
                      );
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Ex: 1 comprimido"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Frequência</label>
                  <input
                    type="text"
                    value={prescription.frequency}
                    onChange={(e) => {
                      const updated = prescriptions.map(p => 
                        p.id === prescription.id ? { ...p, frequency: e.target.value } : p
                      );
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Ex: 1x ao dia"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Duração</label>
                  <input
                    type="text"
                    value={prescription.duration}
                    onChange={(e) => {
                      const updated = prescriptions.map(p => 
                        p.id === prescription.id ? { ...p, duration: e.target.value } : p
                      );
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Ex: 30 dias"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-700 mb-1">Instruções</label>
                  <input
                    type="text"
                    value={prescription.instructions}
                    onChange={(e) => {
                      const updated = prescriptions.map(p => 
                        p.id === prescription.id ? { ...p, instructions: e.target.value } : p
                      );
                      setPrescriptions(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Ex: Tomar pela manhã, em jejum"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {prescriptions.length > 0 && (
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors">
            <Printer className="w-4 h-4" />
            Imprimir Receita
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Signature className="w-4 h-4" />
            Assinar com ICP-Brasil
          </button>
        </div>
      )}
    </div>
  );

  const renderExams = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Solicitação de Exames</h3>
        <button
          onClick={handleAddExam}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Exame
        </button>
      </div>

      {examRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 border border-gray-200">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Nenhum exame solicitado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {examRequests.map((exam, index) => (
            <div key={exam.id} className="p-4 border border-gray-300 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Exame {index + 1}</h4>
                <button
                  onClick={() => handleRemoveExam(exam.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Tipo de Exame *</label>
                  <input
                    type="text"
                    value={exam.examType}
                    onChange={(e) => {
                      const updated = examRequests.map(ex => 
                        ex.id === exam.id ? { ...ex, examType: e.target.value } : ex
                      );
                      setExamRequests(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Ex: Hemograma completo"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Urgência</label>
                  <select
                    value={exam.urgency}
                    onChange={(e) => {
                      const updated = examRequests.map(ex => 
                        ex.id === exam.id ? { ...ex, urgency: e.target.value as 'routine' | 'urgent' | 'emergency' } : ex
                      );
                      setExamRequests(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                  >
                    <option value="routine">Rotina</option>
                    <option value="urgent">Urgente</option>
                    <option value="emergency">Emergência</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-700 mb-1">Indicação Clínica</label>
                  <textarea
                    value={exam.indication}
                    onChange={(e) => {
                      const updated = examRequests.map(ex => 
                        ex.id === exam.id ? { ...ex, indication: e.target.value } : ex
                      );
                      setExamRequests(updated);
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Motivo da solicitação..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {examRequests.length > 0 && (
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors">
            <Printer className="w-4 h-4" />
            Imprimir Pedido
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Signature className="w-4 h-4" />
            Assinar com ICP-Brasil
          </button>
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Documentos Médicos</h3>
        
        {/* Certificate */}
        <div className="border border-gray-300 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              id="certificate"
              checked={generateCertificate}
              onChange={(e) => setGenerateCertificate(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="certificate" className="text-sm font-medium text-gray-900">
              Gerar Atestado Médico
            </label>
          </div>
          
          {generateCertificate && (
            <div className="space-y-3 ml-7">
              <div>
                <label className="block text-xs text-gray-700 mb-1">Dias de Afastamento</label>
                <input
                  type="number"
                  value={certificateDays}
                  onChange={(e) => setCertificateDays(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Observações</label>
                <textarea
                  value={certificateText}
                  onChange={(e) => setCertificateText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                  placeholder="Motivo do afastamento..."
                />
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors text-sm">
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm">
                  <Signature className="w-4 h-4" />
                  Assinar e Gerar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Other Documents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button className="flex items-center gap-2 px-4 py-3 border border-gray-300 hover:bg-gray-50 transition-colors">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-900">Laudo Médico</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-3 border border-gray-300 hover:bg-gray-50 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-900">Declaração de Comparecimento</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-3 border border-gray-300 hover:bg-gray-50 transition-colors">
            <Printer className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-900">Relatório Médico</span>
          </button>
        </div>

        {/* Upload de documentos — Storage real */}
        <div className="border border-gray-200 p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-700">Anexar Documentos à Consulta</h4>
          </div>
          <FileUpload
            bucketType="documents"
            folder={`patients/${patient.id}/consultations/${sessionId}`}
            label="Arrastar ou selecionar arquivo"
            description="PDF, Word, JPG, PNG — máx. 20 MB"
            multiple
            entityType="appointment"
            entityId={sessionId}
            uploadedBy={currentUser?.name || ''}
            existingFiles={consultationAttachments}
            onUploadComplete={(file) => {
              addFileAttachment(file);
              setLocalUploadedIds(prev => [...prev, file.id]);
            }}
            onRemove={(id) => {
              deleteFileAttachment(id);
              setLocalUploadedIds(prev => prev.filter(fid => fid !== id));
            }}
          />
        </div>
      </div>
    </div>
  );

  const renderProcedures = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Procedimentos Realizados (TUSS)</h3>
        <button
          onClick={handleAddProcedure}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Procedimento
        </button>
      </div>

      {procedures.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 border border-gray-200">
          <Building className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Nenhum procedimento registrado</p>
          <p className="text-xs text-gray-400 mt-1">Adicione os procedimentos realizados durante a consulta</p>
        </div>
      ) : (
        <div className="space-y-4">
          {procedures.map((procedure, index) => (
            <div key={procedure.id} className="p-4 border border-gray-300 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Procedimento {index + 1}</h4>
                <button
                  onClick={() => handleRemoveProcedure(procedure.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Código TUSS *</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={procedure.tussCode}
                      onChange={(e) => {
                        const updated = procedures.map(p => 
                          p.id === procedure.id ? { ...p, tussCode: e.target.value } : p
                        );
                        setProcedures(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                      placeholder="10101012"
                    />
                    <button className="px-2 bg-gray-200 hover:bg-gray-300">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-700 mb-1">Descrição *</label>
                  <input
                    type="text"
                    value={procedure.description}
                    onChange={(e) => {
                      const updated = procedures.map(p => 
                        p.id === procedure.id ? { ...p, description: e.target.value } : p
                      );
                      setProcedures(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="Consulta médica em consultório"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Qtd</label>
                  <input
                    type="number"
                    value={procedure.quantity}
                    onChange={(e) => {
                      const updated = procedures.map(p => 
                        p.id === procedure.id ? { ...p, quantity: parseInt(e.target.value) || 1 } : p
                      );
                      setProcedures(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    min="1"
                  />
                </div>
                
                <div className="md:col-span-4">
                  <label className="block text-xs text-gray-700 mb-1">Valor Unitário</label>
                  <input
                    type="text"
                    value={procedure.value}
                    onChange={(e) => {
                      const updated = procedures.map(p => 
                        p.id === procedure.id ? { ...p, value: e.target.value } : p
                      );
                      setProcedures(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Valor Total da Consulta:</span>
              <span className="text-lg font-bold text-blue-600">
                R$ {calculateTotal().toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFinish = () => (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-green-50 border border-green-200 p-4">
        <h3 className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Resumo da Consulta
        </h3>
        <div className="grid grid-cols-2 gap-4 text-xs text-green-800">
          <div>
            <p className="font-medium">Anamnese:</p>
            <p>{anamnesis.chiefComplaint ? 'Preenchida' : 'Não preenchida'}</p>
          </div>
          <div>
            <p className="font-medium">Exame Físico:</p>
            <p>{vitalSigns.bloodPressure ? 'Preenchido' : 'Não preenchido'}</p>
          </div>
          <div>
            <p className="font-medium">Diagnóstico:</p>
            <p>{diagnosis.cid10Code || 'Não definido'}</p>
          </div>
          <div>
            <p className="font-medium">Prescrições:</p>
            <p>{prescriptions.length} medicamento(s)</p>
          </div>
          <div>
            <p className="font-medium">Exames Solicitados:</p>
            <p>{examRequests.length} exame(s)</p>
          </div>
          <div>
            <p className="font-medium">Procedimentos:</p>
            <p>{procedures.length} procedimento(s)</p>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="border border-gray-300 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          Pagamento da Consulta
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1">Valor Total</label>
            <input
              type="text"
              value={paymentValue || `R$ ${calculateTotal().toFixed(2).replace('.', ',')}`}
              onChange={(e) => setPaymentValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-700 mb-1">Forma de Pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
            >
              <option value="insurance">Convênio</option>
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
              <option value="pix">PIX</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="payment-confirmed"
            checked={paymentStatus === 'paid'}
            onChange={(e) => setPaymentStatus(e.target.checked ? 'paid' : 'pending')}
            className="w-4 h-4"
          />
          <label htmlFor="payment-confirmed" className="text-sm text-gray-700">
            Pagamento confirmado
          </label>
        </div>
      </div>

      {/* Follow-up */}
      <div className="border border-gray-300 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-blue-600" />
          Reagendamento
        </h3>
        
        <div className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            id="schedule-followup"
            checked={scheduleFollowUp}
            onChange={(e) => setScheduleFollowUp(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="schedule-followup" className="text-sm text-gray-700">
            Agendar consulta de retorno
          </label>
        </div>

        {scheduleFollowUp && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-7">
            <div>
              <label className="block text-xs text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700 mb-1">Horário</label>
              <input
                type="time"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Digital Signature */}
      <div className="bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Assinatura Digital ICP-Brasil</p>
            <p className="text-xs text-blue-700 mb-3">
              Ao finalizar, o prontuário será assinado digitalmente garantindo autenticidade e validade jurídica
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm">
              <Signature className="w-4 h-4" />
              Assinar Prontuário
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Atendimento Médico</h1>
              <p className="text-sm text-gray-500">
                {patient.name} • {patient.age} anos • {patient.cpf}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-gray-500">
              <p>{new Date().toLocaleDateString('pt-BR')}</p>
              <p>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button
              onClick={() => setShowDraftConfirm(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Rascunho
            </button>
          </div>
        </div>

        {/* Patient Info Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3" />
              <span>{patient.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3" />
              <span>{patient.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-3 h-3" />
              <span>{patient.insurance}</span>
            </div>
            {patient.allergies && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>Alergias: {patient.allergies}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.id as Step)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center border-2 transition-colors ${
                      isActive ? 'border-blue-600 bg-blue-50' : isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-300'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {currentStep === 'anamnesis' && renderAnamnesis()}
        {currentStep === 'physical' && renderPhysicalExam()}
        {currentStep === 'diagnosis' && renderDiagnosis()}
        {currentStep === 'prescription' && renderPrescription()}
        {currentStep === 'exams' && renderExams()}
        {currentStep === 'documents' && renderDocuments()}
        {currentStep === 'procedures' && renderProcedures()}
        {currentStep === 'finish' && renderFinish()}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-white flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            {currentStep === 'finish' ? (
              <button
                onClick={handleFinishConsultation}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finalizar Consulta
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
      </div>

      {/* ── Confirmação de rascunho (substitui confirm() nativo) ─────────── */}
      {showDraftConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Save className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Salvar rascunho e fechar?</h3>
                <p className="text-xs text-gray-500 mt-0.5">Os dados não finalizados serão descartados.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDraftConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowDraftConfirm(false); onClose(); }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}