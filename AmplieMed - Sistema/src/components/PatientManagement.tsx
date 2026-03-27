import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Edit, FileText, Shield, CheckCircle, XCircle, Filter, 
  Download, Trash2, User, MapPin, Phone, Mail, Calendar, CreditCard,
  AlertCircle, X, ChevronDown, Eye, EyeOff, Upload, Users, ArrowLeft,
  Clock, DollarSign, Activity, MessageSquare, Video, Printer, Send,
  ChevronRight, Building, Stethoscope, History, Paperclip
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import type { UserRole } from '../App';
import type { Patient } from './AppContext';
import { useApp } from './AppContext';
import { PatientDetailView } from './PatientDetailView';
import { medicalToast, toastError, toastWarning, toastSuccess } from '../utils/toastService';
import { exportPatients, exportPatientsPDF, importFromCSV } from '../utils/exportService';
import { usePermission } from './PermissionGuard';
import { estados } from '../utils/brasilLocations';

interface PatientManagementProps {
  userRole: UserRole;
}

type FilterType = 'all' | 'active' | 'inactive' | 'lgpd-pending' | 'insurance';

export function PatientManagement({ userRole }: PatientManagementProps) {
  const { patients, addPatient, updatePatient, deletePatient, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('patients');
  const navigate = useNavigate();
  const location = useLocation();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCpf, setShowCpf] = useState(false);
  const [formData, setFormData] = useState<Partial<Patient>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'lastVisit'>('name');

  const itemsPerPage = 10;

  // Cidades disponíveis baseadas no estado selecionado (API IBGE - todas as cidades)
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const fetchCities = useCallback(async (uf: string) => {
    if (!uf) {
      setAvailableCities([]);
      return;
    }
    setLoadingCities(true);
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const data = await response.json();
      setAvailableCities(data.map((city: any) => city.nome));
    } catch (error) {
      console.error('Erro ao buscar cidades do IBGE:', error);
      setAvailableCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    fetchCities(formData.address?.state || '');
  }, [formData.address?.state, fetchCities]);

  // Auto-open patient detail when returning from another module
  useEffect(() => {
    const state = location.state as any;
    if (state?.viewPatientId) {
      const found = patients.find(p => p.id === state.viewPatientId);
      if (found) {
        setViewingPatient(found);
        toastSuccess(`Retorno ao cadastro de ${found.name}`);
      }
      window.history.replaceState({}, '');
    }
  }, [location.state, patients]);

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  };

  // Máscaras
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const maskDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\/\d{4})\d+?$/, '$1');
  };

  // Validações do formulário
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Nome completo é obrigatório';
    }

    if (!formData.cpf) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }

    if (!formData.birthDate) {
      errors.birthDate = 'Data de nascimento é obrigatória';
    }

    if (!formData.phone) {
      errors.phone = 'Telefone é obrigatório';
    }

    if (!formData.email) {
      errors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'E-mail inválido';
    }

    if (!formData.motherName?.trim()) {
      errors.motherName = 'Nome da mãe é obrigatório';
    }

    if (!formData.address?.cep) {
      errors.cep = 'CEP é obrigatório';
    }

    if (!formData.address?.street) {
      errors.street = 'Endereço é obrigatório';
    }

    if (!formData.address?.number) {
      errors.number = 'Número é obrigatório';
    }

    if (!formData.lgpdConsent) {
      errors.lgpd = 'É necessário aceitar os termos LGPD';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Filtros
  const getFilteredPatients = () => {
    let filtered = patients;

    // Filtro de busca
    if (searchTerm) {
      // Remove máscaras para comparação (apenas números)
      const cleanSearchTerm = searchTerm.replace(/\D/g, '').toLowerCase();
      
      filtered = filtered.filter(
        (patient) => {
          // Busca por nome e e-mail (case insensitive)
          const matchesName = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesEmail = patient.email.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Busca por CPF e telefone (remove máscaras antes de comparar)
          const cleanCpf = patient.cpf.replace(/\D/g, '');
          const cleanPhone = patient.phone.replace(/\D/g, '');
          const matchesCpf = cleanCpf.includes(cleanSearchTerm);
          const matchesPhone = cleanPhone.includes(cleanSearchTerm);
          
          return matchesName || matchesEmail || matchesCpf || matchesPhone;
        }
      );
    }

    // Filtros por tipo
    switch (filterType) {
      case 'active':
        filtered = filtered.filter((p) => p.status === 'active');
        break;
      case 'inactive':
        filtered = filtered.filter((p) => p.status === 'inactive');
        break;
      case 'lgpd-pending':
        filtered = filtered.filter((p) => !p.lgpdConsent);
        break;
      case 'insurance':
        filtered = filtered.filter((p) => p.insurance !== 'Particular');
        break;
    }

    // Ordenação
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.lastVisit.split('/').reverse().join('-')).getTime() - 
               new Date(a.lastVisit.split('/').reverse().join('-')).getTime();
      }
    });

    return filtered;
  };

  const filteredPatients = getFilteredPatients();
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Estatísticas
  const stats = {
    total: patients.length,
    active: patients.filter((p) => p.status === 'active').length,
    lgpdPending: patients.filter((p) => !p.lgpdConsent).length,
    newThisMonth: patients.filter((p) => {
      if (!p.createdAt) return false;
      const created = new Date(p.createdAt.split('/').reverse().join('-'));
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setFormData({
      gender: 'M',
      maritalStatus: 'Solteiro',
      insurance: 'Particular',
      status: 'active',
      lgpdConsent: false,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    setFormErrors({});
    setShowModal(true);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await importFromCSV(file);
      let imported = 0;
      rows.forEach((row) => {
        const name = row['Nome'] || row['name'];
        if (!name) return;
        addPatient({
          name,
          cpf: row['CPF'] || row['cpf'] || '',
          rg: row['RG'] || row['rg'] || '',
          birthDate: row['Data de Nascimento'] || row['birthDate'] || '',
          age: parseInt(row['Idade'] || '0') || 0,
          gender: (row['Sexo'] || row['gender'] || 'M') as 'M' | 'F' | 'Outro',
          phone: row['Telefone'] || row['phone'] || '',
          email: row['E-mail'] || row['email'] || '',
          address: {
            cep: '', street: row['Endereço'] || '', number: '',
            neighborhood: '', city: row['Cidade'] || '', state: row['Estado'] || '',
          },
          motherName: row['Nome da Mãe'] || row['motherName'] || '-',
          maritalStatus: row['Estado Civil'] || '',
          occupation: row['Profissão'] || '',
          insurance: row['Convênio'] || row['insurance'] || 'Particular',
          lgpdConsent: true,
          lgpdConsentDate: new Date().toLocaleDateString('pt-BR'),
          status: 'active' as const,
          lastVisit: '-',
        });
        imported++;
      });
      addAuditEntry({
        user: currentUser?.name || 'Sistema',
        userRole: currentUser?.role || 'admin',
        action: 'create',
        module: 'Pacientes',
        description: `Importação CSV: ${imported} pacientes importados`,
        status: 'success',
      });
      toastSuccess('Importação concluída', { description: `${imported} paciente(s) importado(s) com sucesso.` });
    } catch (err) {
      toastError('Erro na importação', { description: String(err) });
    }
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleDeletePatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDeleteModal(true);
  };

  const handleSavePatient = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (selectedPatient) {
      updatePatient(selectedPatient.id, formData as Partial<Patient>);
      addNotification({
        type: 'info',
        title: 'Paciente atualizado',
        message: `Dados de ${selectedPatient.name} foram atualizados com sucesso.`,
        urgent: false,
      });
    } else {
      const created = addPatient({
        ...(formData as Omit<Patient, 'id' | 'createdAt' | 'totalVisits'>),
        lastVisit: '-',
        totalVisits: 0,
      });
      addNotification({
        type: 'info',
        title: 'Paciente cadastrado',
        message: `${created.name} foi cadastrado com sucesso no sistema.`,
        urgent: false,
      });
    }

    setSaving(false);
    setShowModal(false);
    if (selectedPatient) {
      medicalToast.patientUpdated(formData.name || '');
    } else {
      medicalToast.patientCreated(formData.name || '');
    }
  };

  const confirmDelete = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const name = selectedPatient.name;
    deletePatient(selectedPatient.id);
    addNotification({ type: 'info', title: 'Paciente removido', message: `${name} foi removido do sistema.`, urgent: false });
    setSaving(false);
    setShowDeleteModal(false);
    medicalToast.patientDeleted(name);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpar erro do campo ao digitar
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...(prev.address || {}), [field]: value } as any,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleViewPatient = (patient: Patient) => {
    setViewingPatient(patient);
  };

  // Se está visualizando um paciente, mostrar a tela de detalhes
  if (viewingPatient) {
    return (
      <PatientDetailView
        patient={viewingPatient}
        onClose={() => setViewingPatient(null)}
        onEdit={() => {
          setSelectedPatient(viewingPatient);
          setFormData(viewingPatient);
          setFormErrors({});
          setViewingPatient(null);
          setShowModal(true);
        }}
        onDelete={() => {
          setSelectedPatient(viewingPatient);
          setViewingPatient(null);
          setShowDeleteModal(true);
        }}
        userRole={userRole}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="w-1/2">
          <h2 className="text-gray-900 mb-2">Gestão de Pacientes</h2>
          <p className="text-gray-600">Cadastro completo com validação de CPF e conformidade LGPD</p>
        </div>
        
        {/* Search and Filters + New Patient Button */}
        <div className="flex items-center gap-3">
          {/* Search and Filters */}
          <div className="relative bg-white border border-gray-200 flex items-stretch w-max">
            <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF, e-mail ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none focus:ring-0 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 text-sm transition-colors ${
                showFilters ? 'bg-pink-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">Filtros</span>
            </button>
            <button
              onClick={() => { exportPatients(filteredPatients); medicalToast.exportSuccess(`pacientes_${new Date().toISOString().split('T')[0]}.csv`); }}
              title="Exportar CSV"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm transition-colors"
            >
              <Download className="w-4 h-4 text-gray-600" />
            </button>

            {/* Filtros avançados */}
            {showFilters && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 p-3 shadow-lg z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-2 border text-sm transition-colors ${
                      filterType === 'all'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterType('active')}
                    className={`px-3 py-2 border text-sm transition-colors ${
                      filterType === 'active'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Ativos
                  </button>
                  <button
                    onClick={() => setFilterType('inactive')}
                    className={`px-3 py-2 border text-sm transition-colors ${
                      filterType === 'inactive'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Inativos
                  </button>
                  <button
                    onClick={() => setFilterType('lgpd-pending')}
                    className={`px-3 py-2 border text-sm transition-colors ${
                      filterType === 'lgpd-pending'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    LGPD Pendente
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleNewPatient}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </button>

          {/* Hidden CSV import input */}
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            title="Importar pacientes via CSV"
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Paciente
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  CPF
                </th>
                <th className="px-6 py-4 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-4 text-right text-xs text-gray-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPatients.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center"><div className="flex flex-col items-center"><Users className="w-12 h-12 text-gray-300 mb-3" /><p className="text-gray-500 mb-1">Nenhum paciente cadastrado</p><p className="text-sm text-gray-400">Cadastre pacientes para começar a gerenciar prontuários e agendamentos.</p></div></td></tr>
              ) : paginatedPatients.map((patient) => (
                <tr key={patient.id} onClick={() => handleViewPatient(patient)} className="hover:bg-gray-50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                        {patient.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500">
                          {patient.age} anos • {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {showCpf ? patient.cpf : '***.***.***-**'}
                      </span>
                      <button
                        onClick={() => setShowCpf(!showCpf)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title={showCpf ? 'Ocultar CPF' : 'Mostrar CPF'}
                      >
                        {showCpf ? (
                          <EyeOff className="w-3 h-3 text-gray-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {patient.phone}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {patient.email}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPatient(patient);
                        }}
                        className="p-2 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded transition-all"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/prontuarios'); }}
                        className="p-2 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded transition-all"
                        title="Prontuário"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {userRole === 'admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePatient(patient);
                          }}
                          className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-sm transition-colors ${
                    currentPage === page
                      ? 'bg-pink-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900">
                  {selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Preencha todos os campos obrigatórios (*)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Dados Pessoais */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-gray-600" />
                  <h4 className="text-gray-900">Dados Pessoais</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.name ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">CPF *</label>
                    <input
                      type="text"
                      value={formData.cpf || ''}
                      onChange={(e) => handleInputChange('cpf', maskCPF(e.target.value))}
                      maxLength={14}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.cpf ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.cpf ? (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.cpf}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        Validação automática
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">RG</label>
                    <input
                      type="text"
                      value={formData.rg || ''}
                      onChange={(e) => handleInputChange('rg', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Data de Nascimento *</label>
                    <input
                      type="text"
                      value={formData.birthDate || ''}
                      onChange={(e) => handleInputChange('birthDate', maskDate(e.target.value))}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.birthDate ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.birthDate && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.birthDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Sexo *</label>
                    <select
                      value={formData.gender || 'M'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-2">Nome da Mãe *</label>
                    <input
                      type="text"
                      value={formData.motherName || ''}
                      onChange={(e) => handleInputChange('motherName', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.motherName ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.motherName && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.motherName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Estado Civil</label>
                    <select
                      value={formData.maritalStatus || 'Solteiro'}
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    >
                      <option value="Solteiro">Solteiro(a)</option>
                      <option value="Casado">Casado(a)</option>
                      <option value="Divorciado">Divorciado(a)</option>
                      <option value="Viúvo">Viúvo(a)</option>
                      <option value="União Estável">União Estável</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Profissão</label>
                    <input
                      type="text"
                      value={formData.occupation || ''}
                      onChange={(e) => handleInputChange('occupation', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <h4 className="text-gray-900">Contato</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Telefone Principal *</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.phone ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.phone && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Telefone Secundário</label>
                    <input
                      type="text"
                      value={formData.phone2 || ''}
                      onChange={(e) => handleInputChange('phone2', maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-2">E-mail *</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.email ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <h4 className="text-gray-900">Endereço</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">CEP *</label>
                    <input
                      type="text"
                      value={formData.address?.cep || ''}
                      onChange={(e) => handleAddressChange('cep', maskCEP(e.target.value))}
                      placeholder="00000-000"
                      maxLength={9}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.cep ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.cep && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.cep}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-700 mb-2">Endereço *</label>
                    <input
                      type="text"
                      value={formData.address?.street || ''}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.street ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.street && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.street}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Número *</label>
                    <input
                      type="text"
                      value={formData.address?.number || ''}
                      onChange={(e) => handleAddressChange('number', e.target.value)}
                      className={`w-full px-4 py-3 bg-gray-50 border ${
                        formErrors.number ? 'border-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all`}
                    />
                    {formErrors.number && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.number}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Complemento</label>
                    <input
                      type="text"
                      value={formData.address?.complement || ''}
                      onChange={(e) => handleAddressChange('complement', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Bairro</label>
                    <input
                      type="text"
                      value={formData.address?.neighborhood || ''}
                      onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Estado</label>
                    <select
                      value={formData.address?.state || ''}
                      onChange={(e) => {
                        handleAddressChange('state', e.target.value);
                        // Limpar cidade quando mudar o estado
                        handleAddressChange('city', '');
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    >
                      <option value="">Selecione...</option>
                      {estados.map((estado) => (
                        <option key={estado.uf} value={estado.uf}>
                          {estado.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Cidade</label>
                    <select
                      value={formData.address?.city || ''}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      disabled={!formData.address?.state || loadingCities}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">{loadingCities ? 'Carregando cidades...' : 'Selecione...'}</option>
                      {availableCities.map((cidade) => (
                        <option key={cidade} value={cidade}>
                          {cidade}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    {/* Espaço vazio para alinhamento */}
                  </div>
                </div>
              </div>

              {/* Convênio */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <h4 className="text-gray-900">Convênio</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Tipo de Convênio</label>
                    <select
                      value={formData.insurance || 'Particular'}
                      onChange={(e) => handleInputChange('insurance', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all"
                    >
                      <option value="Particular">Particular</option>
                      <option value="Unimed">Unimed</option>
                      <option value="Bradesco Saúde">Bradesco Saúde</option>
                      <option value="Amil">Amil</option>
                      <option value="SulAmérica">SulAmérica</option>
                      <option value="NotreDame Intermédica">NotreDame Intermédica</option>
                      <option value="Hapvida">Hapvida</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Número da Carteirinha</label>
                    <input
                      type="text"
                      value={formData.insuranceNumber || ''}
                      onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
                      disabled={formData.insurance === 'Particular'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Validade</label>
                    <input
                      type="text"
                      value={formData.insuranceValidity || ''}
                      onChange={(e) => handleInputChange('insuranceValidity', e.target.value)}
                      placeholder="MM/AAAA"
                      disabled={formData.insurance === 'Particular'}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Informações Médicas */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h4 className="text-gray-900">Informações Médicas</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Alergias</label>
                    <textarea
                      value={formData.allergies || ''}
                      onChange={(e) => handleInputChange('allergies', e.target.value)}
                      rows={2}
                      placeholder="Informe alergias conhecidas..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Medicamentos em Uso</label>
                    <textarea
                      value={formData.medications || ''}
                      onChange={(e) => handleInputChange('medications', e.target.value)}
                      rows={2}
                      placeholder="Liste medicamentos de uso contínuo..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Observações</label>
                    <textarea
                      value={formData.observations || ''}
                      onChange={(e) => handleInputChange('observations', e.target.value)}
                      rows={3}
                      placeholder="Observações gerais sobre o paciente..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* LGPD */}
              <div className={`p-5 border ${formErrors.lgpd ? 'bg-red-50 border-red-300' : 'bg-pink-50 border-pink-200'}`}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={formData.lgpdConsent || false}
                    onChange={(e) => handleInputChange('lgpdConsent', e.target.checked)}
                    className="mt-1 w-5 h-5 border-pink-300 text-pink-600 focus:ring-2 focus:ring-pink-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-pink-600" />
                      <span className="text-sm text-gray-900">Consentimento LGPD *</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Autorizo o tratamento dos meus dados pessoais conforme a Lei Geral de Proteção de
                      Dados (LGPD - Lei 13.709/2018). Os dados serão utilizados exclusivamente para fins
                      de atendimento médico e gestão da clínica. Estou ciente de que posso revogar este
                      consentimento a qualquer momento.
                    </p>
                    {formErrors.lgpd && (
                      <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.lgpd}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-8 py-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePatient}
                disabled={saving}
                className="px-6 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>Salvar Paciente</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-gray-900 mb-2">Excluir Paciente</h3>
              <p className="text-gray-600 mb-4">
                Tem certeza que deseja excluir o paciente <strong>{selectedPatient.name}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="bg-red-50 border border-red-200 p-3 mb-6">
                <p className="text-sm text-red-800">
                  ⚠️ Atenção: Todos os prontuários, agendamentos e histórico médico deste paciente
                  serão permanentemente excluídos.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Excluir Paciente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}