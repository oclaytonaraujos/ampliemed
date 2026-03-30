import { useState, useMemo } from 'react';
import { FileText, Plus, Search, Edit, Trash2, Copy, CheckCircle, X, Download, Upload, Filter, ChevronDown, User, Users } from 'lucide-react';
import type { UserRole } from '../App';
import type { AppTemplate, Patient } from './AppContext';
import { useApp } from './AppContext';
import { generatePrescriptionHTML, generateCertificateHTML, downloadPDF } from '../utils/documentGenerators';
import { toastSuccess, toastInfo } from '../utils/toastService';
import { exportToCSV } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface TemplatesModuleProps { userRole: UserRole; }

// ─── Helper: extract variable placeholders from template content ─────────────
const VARIABLE_REGEX = /\[([A-ZÀ-Ú_\s]+)\]/g;

function extractVariables(content: string): string[] {
  const vars = new Set<string>();
  let match;
  while ((match = VARIABLE_REGEX.exec(content)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

function replaceVariables(content: string, values: Record<string, string>): string {
  return content.replace(VARIABLE_REGEX, (full, key) => values[key] || full);
}

// ─── Reusable Template Picker Modal (exported for other modules) ─────────────
interface TemplatePickerModalProps {
  category?: AppTemplate['category'];
  onSelect: (content: string, template: AppTemplate) => void;
  onClose: () => void;
  patientName?: string;
  doctorName?: string;
  crm?: string;
}

export function TemplatePickerModal({ category, onSelect, onClose, patientName, doctorName, crm }: TemplatePickerModalProps) {
  const { appTemplates } = useApp();
  const [search, setSearch] = useState('');

  const templates = useMemo(() => {
    let list = appTemplates;
    if (category) list = list.filter(t => t.category === category);
    if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.specialty.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [appTemplates, category, search]);

  const categoryLabel = (c: string) => ({ prescription: 'Prescrição', certificate: 'Atestado', record: 'Prontuário', report: 'Relatório' }[c] || c);

  const handleSelect = (t: AppTemplate) => {
    // Auto-replace known variables
    let content = t.content;
    if (patientName) {
      content = content.replace(/\[NOME\]/g, patientName);
      content = content.replace(/\[PACIENTE\]/g, patientName);
    }
    if (doctorName) {
      content = content.replace(/\[MÉDICO\]/g, doctorName);
      content = content.replace(/\[MÉDICA\]/g, doctorName);
    }
    if (crm) content = content.replace(/\[CRM\]/g, crm);
    
    const now = new Date();
    content = content.replace(/\[DATA\]/g, now.toLocaleDateString('pt-BR'));
    content = content.replace(/\[HORA\]/g, now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    
    onSelect(content, t);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white max-w-lg w-full max-h-[70vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900 font-medium">Selecionar Template</h3>
            <p className="text-xs text-gray-500 mt-0.5">{category ? categoryLabel(category) + 's disponíveis' : 'Todos os templates'}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nenhum template encontrado</p>
            </div>
          ) : templates.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              className="w-full text-left p-3 border border-gray-200 hover:bg-pink-50 hover:border-pink-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <span className="text-xs text-gray-400">{t.specialty}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.content.slice(0, 100)}...</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function TemplatesModule({ userRole }: TemplatesModuleProps) {
  const { appTemplates, setAppTemplates, addNotification, currentUser, addAuditEntry, patients, clinicSettings } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('templates');
  const [activeCategory, setActiveCategory] = useState<'all' | AppTemplate['category']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [formData, setFormData] = useState<Partial<AppTemplate>>({ category: 'prescription', specialty: 'Geral', content: '' });

  // "Usar Template" modal state
  const [useTemplate, setUseTemplate] = useState<AppTemplate | null>(null);
  const [usePatientId, setUsePatientId] = useState('');
  const [usePatientSearch, setUsePatientSearch] = useState('');
  const [useVariables, setUseVariables] = useState<Record<string, string>>({});

  const filtered = appTemplates.filter(t => {
    const mc = activeCategory === 'all' || t.category === activeCategory;
    const ms = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    return mc && ms;
  });

  const categoryLabel = (c: string) => ({ prescription: 'Prescrição', certificate: 'Atestado', record: 'Prontuário', report: 'Relatório' }[c] || c);
  const categoryColor = (c: string) => ({ prescription: 'bg-pink-100 text-pink-700', certificate: 'bg-green-100 text-green-700', record: 'bg-purple-100 text-purple-700', report: 'bg-orange-100 text-orange-700' }[c] || 'bg-gray-100 text-gray-600');

  const openAdd = () => { setEditingId(null); setFormData({ category: 'prescription', specialty: 'Geral', content: '' }); setShowModal(true); };
  const openEdit = (t: AppTemplate) => { setEditingId(t.id); setFormData({ ...t }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.name?.trim() || !formData.content?.trim()) return;
    const today = new Date().toLocaleDateString('pt-BR');
    if (editingId) {
      setAppTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...formData } as AppTemplate : t));
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Templates', description: `Template atualizado: ${formData.name}`, status: 'success' });
      toastSuccess('Template atualizado!');
    } else {
      const newT: AppTemplate = { id: crypto.randomUUID(), name: formData.name || '', category: formData.category || 'prescription', specialty: formData.specialty || 'Geral', isFavorite: false, usageCount: 0, content: formData.content || '', createdAt: today };
      setAppTemplates(prev => [...prev, newT]);
      addNotification({ type: 'document', title: 'Template criado', message: `Template "${newT.name}" criado com sucesso`, urgent: false });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Templates', description: `Template criado: ${newT.name}`, status: 'success' });
      toastSuccess('Template criado!');
    }
    setShowModal(false);
  };

  const handleDelete = (t: AppTemplate) => {
    setAppTemplates(prev => prev.filter(x => x.id !== t.id));
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Templates', description: `Template excluído: ${t.name}`, status: 'success' });
    toastSuccess('Template excluído');
  };

  // Open "Usar" modal with editable variables
  const openUseModal = (t: AppTemplate) => {
    setUseVariables({});
    setUsePatientId('');
    setUsePatientSearch('');
    setUseTemplate(t);
  };

  // When a patient is selected, auto-fill [NOME]
  const handlePatientSelect = (p: Patient) => {
    setUsePatientId(p.id);
    setUsePatientSearch(p.name);
  };

  // Final generation with real data
  const handleGenerateDocument = () => {
    if (!useTemplate) return;
    const finalVars = getComputedVariables();
    const finalContent = replaceVariables(useTemplate.content, finalVars);
    const patientName = finalVars['PACIENTE'] || finalVars['NOME'] || 'Paciente';
    const doctorName = currentUser?.name || 'Médico';
    const crm = currentUser?.crm || '';

    // Increment usage count
    setAppTemplates(prev => prev.map(x => x.id === useTemplate.id ? { ...x, usageCount: x.usageCount + 1 } : x));

    let city = 'Cidade';
    if (clinicSettings.address) {
      const parts = clinicSettings.address.split('-');
      if (parts.length > 1) {
        city = parts[parts.length - 1].split('/')[0].trim();
      }
    }
    const clinicData = {
      name: clinicSettings.clinicName,
      address: clinicSettings.address,
      phone: clinicSettings.phone,
      city
    };

    // Generate document based on category
    let html = '';
    if (useTemplate.category === 'prescription') {
      html = generatePrescriptionHTML({ doctorName, crm, patientName, medications: [{ medication: useTemplate.name, dosage: '', frequency: '', duration: '', instructions: finalContent }], clinicData });
    } else if (useTemplate.category === 'certificate') {
      html = generateCertificateHTML({ doctorName, crm, patientName, content: finalContent, clinicData });
    } else {
      html = `<html><head><style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.6}h1{color:#333;border-bottom:2px solid #e91e8c;padding-bottom:10px}pre{white-space:pre-wrap;font-family:Arial,sans-serif}</style></head><body><h1>${useTemplate.name}</h1><p><strong>Paciente:</strong> ${patientName}</p><p><strong>Médico:</strong> ${doctorName} — CRM: ${crm}</p><p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p><hr/><pre>${finalContent}</pre></body></html>`;
    }
    downloadPDF(html, `${useTemplate.name}_${patientName}`);
    addNotification({ type: 'document', title: 'Template utilizado', message: `Template "${useTemplate.name}" gerado para ${patientName}`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'read', module: 'Templates', description: `Template utilizado: ${useTemplate.name} — Paciente: ${patientName}`, status: 'success' });
    toastSuccess(`Documento "${useTemplate.name}" gerado para ${patientName}!`);
    setUseTemplate(null);
  };

  const handleCopy = (content: string, name: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    toastInfo(`"${name}" copiado para a área de transferência`);
  };

  const handleExportCSV = () => {
    exportToCSV(appTemplates as unknown as Record<string, unknown>[], 'templates_medicos', [
      { key: 'name', label: 'Nome' },
      { key: 'category', label: 'Categoria' },
      { key: 'specialty', label: 'Especialidade' },
      { key: 'usageCount', label: 'Usos' },
      { key: 'createdAt', label: 'Criado em' },
    ]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Templates', description: `${appTemplates.length} templates exportados`, status: 'success' });
    toastSuccess('Templates exportados!');
  };

  const previewTemplate = previewId ? appTemplates.find(t => t.id === previewId) : null;

  // Stats
  const stats = {
    total: appTemplates.length,
    prescriptions: appTemplates.filter(t => t.category === 'prescription').length,
    certificates: appTemplates.filter(t => t.category === 'certificate').length,
    totalUses: appTemplates.reduce((s, t) => s + t.usageCount, 0),
  };

  // Specialty options for filter
  const specialtyOptions = Array.from(new Set(appTemplates.map(t => t.specialty).filter(Boolean))).sort();

  // Main variables known to the system that shouldn't be manually edited if we auto-fill them
  const AUTO_VARIABLES = ['NOME', 'PACIENTE', 'CPF', 'RG', 'NASCIMENTO', 'IDADE', 'ENDEREÇO', 'MÉDICO', 'MÉDICA', 'CRM', 'ESPECIALIDADE', 'DATA', 'HORA'];

  // Calculate dynamic variables based on context
  const getComputedVariables = () => {
    const computed = { ...useVariables };
    const selectedPatient = patients.find(p => p.id === usePatientId);

    // Doctor
    computed['MÉDICO'] = currentUser?.name || '';
    computed['MÉDICA'] = currentUser?.name || '';
    computed['CRM'] = currentUser?.crm || '';
    computed['ESPECIALIDADE'] = currentUser?.specialty || '';

    // Date/Time
    const now = new Date();
    computed['DATA'] = now.toLocaleDateString('pt-BR');
    computed['HORA'] = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Patient
    if (selectedPatient) {
      computed['NOME'] = selectedPatient.name;
      computed['PACIENTE'] = selectedPatient.name;
      computed['CPF'] = selectedPatient.cpf;
      computed['RG'] = selectedPatient.rg || '';
      computed['NASCIMENTO'] = selectedPatient.birthDate || '';
      computed['IDADE'] = selectedPatient.age ? String(selectedPatient.age) : '';
      if (selectedPatient.address) {
        computed['ENDEREÇO'] = `${selectedPatient.address.street}, ${selectedPatient.address.number} - ${selectedPatient.address.city}/${selectedPatient.address.state}`;
      }
    }

    return computed;
  };

  const computedVariables = useTemplate ? getComputedVariables() : {};
  const useTemplateVars = useTemplate ? extractVariables(useTemplate.content) : [];
  const editableVars = useTemplateVars.filter(v => !AUTO_VARIABLES.includes(v));

  // Live preview
  const livePreview = useTemplate ? replaceVariables(useTemplate.content, computedVariables) : '';

  // Patient search for "Usar" modal
  const filteredPatients = useMemo(() => {
    if (!usePatientSearch || usePatientSearch.length < 2) return [];
    return patients.filter(p => p.name.toLowerCase().includes(usePatientSearch.toLowerCase()) || p.cpf.includes(usePatientSearch)).slice(0, 8);
  }, [patients, usePatientSearch]);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Templates Médicos</h2>
          <p className="text-gray-600">Prescrições, atestados e prontuários padronizados com geração de PDF</p>
        </div>

        {/* Search and Filters + New Template Button */}
        <div className="flex items-center gap-3">
          {/* Search and Filters */}
          <div className="relative bg-white border border-gray-200 flex items-stretch w-max">
            <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou especialidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none focus:ring-0 focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                showFilters ? 'bg-pink-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">Filtros</span>
            </button>
          </div>

          {canCreate && (
            <button
              onClick={openAdd}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Novo Template
            </button>
          )}
        </div>
      </div>

      {/* Stats - Collapsible Summary */}
      <div>
        <button
          onClick={() => setStatsExpanded(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? '' : '-rotate-90'}`} />
          <span>
            Resumo — Total: <span className="text-pink-600 font-semibold">{stats.total}</span>
            {' · '}Prescrições: <span className="text-green-600 font-semibold">{stats.prescriptions}</span>
            {' · '}Atestados: <span className="text-blue-600 font-semibold">{stats.certificates}</span>
            {' · '}Usos totais: <span className="text-purple-600 font-semibold">{stats.totalUses}</span>
          </span>
        </button>
        {statsExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-pink-600' },
              { label: 'Prescrições', value: stats.prescriptions, color: 'text-green-600' },
              { label: 'Atestados', value: stats.certificates, color: 'text-blue-600' },
              { label: 'Usos totais', value: stats.totalUses, color: 'text-purple-600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Categoria</label>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="all">Todas</option>
                <option value="prescription">Prescrições</option>
                <option value="certificate">Atestados</option>
                <option value="record">Prontuários</option>
                <option value="report">Relatórios</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Especialidade</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setSearchTerm(e.target.value);
                  } else {
                    setSearchTerm('');
                  }
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              >
                <option value="">Todas</option>
                {specialtyOptions.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={() => { setActiveCategory('all'); setSearchTerm(''); }}
              className="text-xs text-pink-600 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* All templates */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum template encontrado</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Template</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Categoria</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Especialidade</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Usos</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Criado</th>
                <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase">Ações</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{t.content.slice(0, 60)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`text-xs px-2 py-0.5 ${categoryColor(t.category)}`}>{categoryLabel(t.category)}</span></td>
                    <td className="px-5 py-4 text-sm text-gray-600">{t.specialty}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{t.usageCount}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{t.createdAt}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openUseModal(t)} className="px-3 py-1.5 bg-pink-600 text-white text-xs hover:bg-pink-700 flex items-center gap-1">
                          <Download className="w-3 h-3" /> Usar
                        </button>
                        {canUpdate && (
                          <button onClick={() => openEdit(t)} className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"><Edit className="w-4 h-4" /></button>
                        )}
                        {canDelete && userRole === 'admin' && (
                          <button onClick={() => handleDelete(t)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900">{previewTemplate.name}</h3>
                <p className="text-xs text-gray-500">{previewTemplate.specialty} • {categoryLabel(previewTemplate.category)}</p>
              </div>
              <button onClick={() => setPreviewId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 p-4 border border-gray-200">{previewTemplate.content}</pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => handleCopy(previewTemplate.content, previewTemplate.name)} className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"><Copy className="w-4 h-4" /> Copiar</button>
              <button onClick={() => { openUseModal(previewTemplate); setPreviewId(null); }} className="px-4 py-2.5 bg-pink-600 text-white text-sm hover:bg-pink-700 flex items-center gap-2"><Download className="w-4 h-4" /> Usar Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ── USE TEMPLATE MODAL — with editable variables & patient selector ──── */}
      {useTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between z-10">
              <div>
                <h3 className="text-gray-900 font-medium">Usar Template: {useTemplate.name}</h3>
                <p className="text-xs text-gray-500">{useTemplate.specialty} • {categoryLabel(useTemplate.category)}</p>
              </div>
              <button onClick={() => setUseTemplate(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-pink-600" />
                  Selecionar Paciente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar paciente por nome ou CPF..."
                    value={usePatientSearch}
                    onChange={(e) => { setUsePatientSearch(e.target.value); setUsePatientId(''); }}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                  {filteredPatients.length > 0 && !usePatientId && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg z-20 max-h-48 overflow-y-auto">
                      {filteredPatients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handlePatientSelect(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-pink-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white text-xs flex-shrink-0">
                            {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.cpf} • {p.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {usePatientId && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 border border-green-200">
                    <CheckCircle className="w-4 h-4" />
                    Paciente selecionado: <strong>{usePatientSearch}</strong>
                  </div>
                )}
              </div>

              {/* Editable Variables */}
              {editableVars.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campos customizados do template
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {editableVars.map(v => (
                      <div key={v}>
                        <label className="block text-xs text-gray-600 mb-1">[{v}]</label>
                        <input
                          type="text"
                          value={useVariables[v] || ''}
                          onChange={(e) => setUseVariables(prev => ({ ...prev, [v]: e.target.value }))}
                          className={`w-full px-3 py-2 border text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 ${
                            useVariables[v] ? 'bg-white border-green-300' : 'bg-gray-50 border-gray-200'
                          }`}
                          placeholder={`Preencher ${v.toLowerCase()}...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pré-visualização do documento
                </label>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 p-4 border border-gray-200 max-h-64 overflow-y-auto">
                  {livePreview}
                </pre>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setUseTemplate(null)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => { handleCopy(livePreview, useTemplate.name); }}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copiar Texto
              </button>
              <button
                onClick={handleGenerateDocument}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">{editingId ? 'Editar Template' : 'Novo Template'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1.5">Nome *</label>
                  <input type="text" value={formData.name || ''} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none" placeholder="Ex: Prescrição Anti-inflamatório" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Categoria</label>
                  <select value={formData.category || 'prescription'} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                    <option value="prescription">Prescrição</option>
                    <option value="certificate">Atestado</option>
                    <option value="record">Prontuário</option>
                    <option value="report">Relatório</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Especialidade</label>
                  <input type="text" value={formData.specialty || ''} onChange={(e) => setFormData(p => ({ ...p, specialty: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none" placeholder="Cardiologia, Geral..." />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Conteúdo *</label>
                <p className="text-xs text-gray-400 mb-2">Use [NOME], [DATA], [MÉDICO], [CRM] como variáveis substituíveis.</p>
                <textarea rows={10} value={formData.content || ''} onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none resize-y font-mono text-sm" placeholder="Conteúdo do template..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700">
                {editingId ? 'Salvar' : 'Criar Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}