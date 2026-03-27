import { useState } from 'react';
import { ClipboardList, Plus, Search, Edit, Trash2, CheckCircle, ChevronDown, ChevronUp, X, Star, Download } from 'lucide-react';
import type { UserRole } from '../App';
import type { Protocol } from './AppContext';
import { useApp } from './AppContext';
import { toastSuccess, toastError } from '../utils/toastService';
import { exportToCSV, exportToPDF } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface ClinicalProtocolsProps { userRole: UserRole; }

export function ClinicalProtocols({ userRole }: ClinicalProtocolsProps) {
  const { protocols, addProtocol, updateProtocol, deleteProtocol, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('protocols');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [formData, setFormData] = useState<Partial<Protocol>>({ category: 'tratamento', active: true, usage: 0, steps: [{ step: 1, title: '', description: '', mandatory: true }] });

  const filtered = protocols.filter(p => {
    const ms = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const mc = filterCategory === 'all' || p.category === filterCategory;
    const msp = filterSpecialty === 'all' || p.specialty === filterSpecialty;
    return ms && mc && msp;
  });

  const uniqueSpecialties = Array.from(new Set(protocols.map(p => p.specialty)));

  const openAdd = () => {
    setEditingId(null);
    setFormData({ category: 'tratamento', active: true, usage: 0, steps: [{ step: 1, title: '', description: '', mandatory: true }] });
    setShowModal(true);
  };

  const openEdit = (p: Protocol) => {
    setEditingId(p.id);
    setFormData({ ...p });
    setShowModal(true);
  };

  const handleSave = () => {
    const data = { ...formData };
    if (!data.title?.trim()) return;
    const today = new Date().toLocaleDateString('pt-BR');
    if (editingId) {
      updateProtocol(editingId, { ...data, lastUpdate: today });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Protocolos Clínicos', description: `Protocolo atualizado: ${data.title}`, status: 'success' });
      toastSuccess('Protocolo atualizado!');
    } else {
      addProtocol({ title: data.title || '', specialty: data.specialty || '', category: data.category || 'tratamento', lastUpdate: today, steps: data.steps || [], usage: 0, active: true });
      addNotification({ type: 'info', title: 'Protocolo criado', message: `Protocolo "${data.title}" adicionado ao sistema`, urgent: false });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Protocolos Clínicos', description: `Protocolo criado: ${data.title}`, status: 'success' });
      toastSuccess('Protocolo criado!');
    }
    setShowModal(false);
  };

  const handleDelete = (p: Protocol) => {
    deleteProtocol(p.id);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Protocolos Clínicos', description: `Protocolo excluído: ${p.title}`, status: 'success' });
    toastSuccess(`Protocolo "${p.title}" excluído`);
  };

  const handleApply = (p: Protocol) => {
    updateProtocol(p.id, { usage: p.usage + 1 });
    setExpandedId(p.id);
    addNotification({ type: 'info', title: 'Protocolo iniciado', message: `Protocolo "${p.title}" aplicado — ${p.steps.length} passos`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'read', module: 'Protocolos Clínicos', description: `Protocolo aplicado: ${p.title}`, status: 'success' });
    toastSuccess(`Protocolo "${p.title}" iniciado!`, { description: `${p.steps.length} passos para completar` });
  };

  const toggleStep = (protocolId: string, stepNum: number) => {
    setCompletedSteps(prev => {
      const current = new Set(prev[protocolId] || []);
      if (current.has(stepNum)) current.delete(stepNum);
      else current.add(stepNum);
      return { ...prev, [protocolId]: current };
    });
  };

  const categoryColor = (c: string) => ({
    diagnóstico: 'bg-pink-100 text-pink-700',
    tratamento: 'bg-green-100 text-green-700',
    emergência: 'bg-red-100 text-red-700',
    prevenção: 'bg-orange-100 text-orange-700',
  }[c] || 'bg-gray-100 text-gray-700');

  const addStep = () => {
    const steps = formData.steps || [];
    setFormData(p => ({ ...p, steps: [...steps, { step: steps.length + 1, title: '', description: '', mandatory: false }] }));
  };

  const removeStep = (idx: number) => {
    const steps = (formData.steps || []).filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
    setFormData(p => ({ ...p, steps }));
  };

  const handleExportCSV = () => {
    exportToCSV(protocols as unknown as Record<string, unknown>[], 'protocolos_clinicos', [
      { key: 'title', label: 'Título' },
      { key: 'specialty', label: 'Especialidade' },
      { key: 'category', label: 'Categoria' },
      { key: 'lastUpdate', label: 'Última Atualização' },
      { key: 'usage', label: 'Usos' },
      { key: 'active', label: 'Ativo' },
    ]);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Protocolos Clínicos', description: `${protocols.length} protocolos exportados`, status: 'success' });
    toastSuccess('Protocolos exportados!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Protocolos Clínicos</h2>
          <p className="text-gray-600">Fluxos padronizados por especialidade com checklist interativo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch">
            <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar protocolos..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none" />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-sm text-gray-700 focus:outline-none">
              <option value="all">Categoria</option>
              <option value="diagnóstico">Diagnóstico</option>
              <option value="tratamento">Tratamento</option>
              <option value="emergência">Emergência</option>
              <option value="prevenção">Prevenção</option>
            </select>
          </div>
          {canExport && (
            <button onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          {canCreate && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700">
              <Plus className="w-4 h-4" /> Novo Protocolo
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: protocols.length, color: 'text-pink-600' },
          { label: 'Ativos', value: protocols.filter(p => p.active).length, color: 'text-green-600' },
          { label: 'Emergências', value: protocols.filter(p => p.category === 'emergência').length, color: 'text-red-600' },
          { label: 'Usos totais', value: protocols.reduce((s, p) => s + p.usage, 0), color: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 p-4">
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 p-16 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum protocolo encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const isExpanded = expandedId === p.id;
            const stepsCompleted = completedSteps[p.id] || new Set();
            const completionPct = p.steps.length > 0 ? Math.round((stepsCompleted.size / p.steps.length) * 100) : 0;
            return (
              <div key={p.id} className={`bg-white border ${isExpanded ? 'border-pink-300' : 'border-gray-200'} transition-colors`}>
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-medium text-gray-900">{p.title}</h3>
                      <span className={`text-xs px-2 py-0.5 capitalize ${categoryColor(p.category)}`}>{p.category}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">{p.specialty}</span>
                      {!p.active && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600">Inativo</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{p.steps.length} passos</span>
                      <span>Última atualização: {p.lastUpdate}</span>
                      <span>{p.usage} uso(s)</span>
                    </div>
                    {isExpanded && p.steps.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-gray-100"><div className="h-full bg-pink-600 transition-all" style={{ width: `${completionPct}%` }} /></div>
                          <span className="text-xs text-gray-500">{completionPct}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleApply(p)}
                      className="px-3 py-1.5 text-xs bg-pink-600 text-white hover:bg-pink-700 flex items-center gap-1">
                      <Star className="w-3 h-3" /> Aplicar
                    </button>
                    {canUpdate && (
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded"><Edit className="w-4 h-4" /></button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(p)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-5">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Checklist de Passos</h4>
                    <div className="space-y-2">
                      {p.steps.map(step => {
                        const done = stepsCompleted.has(step.step);
                        return (
                          <div key={step.step} onClick={() => toggleStep(p.id, step.step)}
                            className={`flex items-start gap-3 p-3 cursor-pointer border transition-all ${done ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-pink-200 hover:bg-pink-50'}`}>
                            <div className={`w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center rounded-full border-2 ${done ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                              {done && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-mono">Passo {step.step}</span>
                                {step.mandatory && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600">Obrigatório</span>}
                              </div>
                              <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{step.title}</p>
                              {step.description && <p className="text-xs text-gray-600 mt-0.5">{step.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">{editingId ? 'Editar Protocolo' : 'Novo Protocolo'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700 mb-1.5">Título *</label>
                  <input type="text" value={formData.title || ''} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none" placeholder="Ex: Protocolo de Hipertensão" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Especialidade</label>
                  <input type="text" value={formData.specialty || ''} onChange={(e) => setFormData(p => ({ ...p, specialty: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none" placeholder="Cardiologia" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Categoria</label>
                  <select value={formData.category || 'tratamento'} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                    <option value="diagnóstico">Diagnóstico</option>
                    <option value="tratamento">Tratamento</option>
                    <option value="emergência">Emergência</option>
                    <option value="prevenção">Prevenção</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-700">Passos do Protocolo</label>
                  <button onClick={addStep} className="text-xs text-pink-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Adicionar passo</button>
                </div>
                <div className="space-y-3">
                  {(formData.steps || []).map((step, idx) => (
                    <div key={idx} className="border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 font-mono">Passo {step.step}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={step.mandatory}
                              onChange={(e) => { const s = [...(formData.steps || [])]; s[idx] = { ...s[idx], mandatory: e.target.checked }; setFormData(p => ({ ...p, steps: s })); }}
                              className="w-3.5 h-3.5" />
                            Obrigatório
                          </label>
                          {(formData.steps || []).length > 1 && (
                            <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                      <input type="text" placeholder="Título do passo" value={step.title}
                        onChange={(e) => { const s = [...(formData.steps || [])]; s[idx] = { ...s[idx], title: e.target.value }; setFormData(p => ({ ...p, steps: s })); }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:outline-none text-sm mb-2" />
                      <textarea placeholder="Descrição" rows={2} value={step.description}
                        onChange={(e) => { const s = [...(formData.steps || [])]; s[idx] = { ...s[idx], description: e.target.value }; setFormData(p => ({ ...p, steps: s })); }}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:outline-none text-sm resize-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700">
                {editingId ? 'Salvar Alterações' : 'Criar Protocolo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}