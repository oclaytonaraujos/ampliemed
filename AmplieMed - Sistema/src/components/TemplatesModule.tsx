import { useState } from 'react';
import { FileText, Plus, Star, StarOff, Search, Edit, Trash2, Copy, CheckCircle, X, Download, Upload } from 'lucide-react';
import type { UserRole } from '../App';
import type { AppTemplate } from './AppContext';
import { useApp } from './AppContext';
import { generatePrescriptionHTML, generateCertificateHTML, downloadPDF } from '../utils/documentGenerators';
import { toastSuccess, toastInfo } from '../utils/toastService';
import { exportToCSV } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface TemplatesModuleProps { userRole: UserRole; }

export function TemplatesModule({ userRole }: TemplatesModuleProps) {
  const { appTemplates, setAppTemplates, addNotification, currentUser, addAuditEntry } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('templates');
  const [activeCategory, setActiveCategory] = useState<'all' | AppTemplate['category']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AppTemplate>>({ category: 'prescription', specialty: 'Geral', isFavorite: false, content: '' });

  const filtered = appTemplates.filter(t => {
    const mc = activeCategory === 'all' || t.category === activeCategory;
    const ms = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    return mc && ms;
  });

  const categoryLabel = (c: string) => ({ prescription: 'Prescrição', certificate: 'Atestado', record: 'Prontuário', report: 'Relatório' }[c] || c);
  const categoryColor = (c: string) => ({ prescription: 'bg-blue-100 text-blue-700', certificate: 'bg-green-100 text-green-700', record: 'bg-purple-100 text-purple-700', report: 'bg-orange-100 text-orange-700' }[c] || 'bg-gray-100 text-gray-600');

  const openAdd = () => { setEditingId(null); setFormData({ category: 'prescription', specialty: 'Geral', isFavorite: false, content: '' }); setShowModal(true); };
  const openEdit = (t: AppTemplate) => { setEditingId(t.id); setFormData({ ...t }); setShowModal(true); };

  const handleSave = () => {
    if (!formData.name?.trim() || !formData.content?.trim()) return;
    const today = new Date().toLocaleDateString('pt-BR');
    if (editingId) {
      setAppTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...formData } as AppTemplate : t));
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Templates', description: `Template atualizado: ${formData.name}`, status: 'success' });
      toastSuccess('Template atualizado!');
    } else {
      const newT: AppTemplate = { id: crypto.randomUUID(), name: formData.name || '', category: formData.category || 'prescription', specialty: formData.specialty || 'Geral', isFavorite: formData.isFavorite || false, usageCount: 0, content: formData.content || '', createdAt: today };
      setAppTemplates(prev => [...prev, newT]);
      addNotification({ type: 'document', title: 'Template criado', message: `Template "${newT.name}" adicionado aos favoritos`, urgent: false });
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

  const handleToggleFavorite = (id: string) => {
    setAppTemplates(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
  };

  const handleUse = (t: AppTemplate) => {
    setAppTemplates(prev => prev.map(x => x.id === t.id ? { ...x, usageCount: x.usageCount + 1 } : x));
    // Generate document based on category
    let html = '';
    if (t.category === 'prescription') {
      html = generatePrescriptionHTML({ doctorName: currentUser?.name || 'Médico', crm: currentUser?.crm || '', patientName: 'Paciente', medications: [{ medication: t.name, dosage: '', frequency: '', duration: '', instructions: t.content }] });
    } else if (t.category === 'certificate') {
      html = generateCertificateHTML({ doctorName: currentUser?.name || 'Médico', crm: currentUser?.crm || '', patientName: 'Paciente', content: t.content });
    } else {
      html = `<html><body><h1>${t.name}</h1><pre>${t.content}</pre></body></html>`;
    }
    downloadPDF(html, t.name);
    addNotification({ type: 'document', title: 'Template utilizado', message: `Template "${t.name}" gerado e baixado`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'read', module: 'Templates', description: `Template utilizado: ${t.name}`, status: 'success' });
    toastSuccess(`Template "${t.name}" utilizado!`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Templates Médicos</h2>
          <p className="text-gray-600">Prescrições, atestados e prontuários padronizados com geração de PDF</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch">
            <div className="relative flex items-center w-64 px-2">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar templates..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border-0 text-sm focus:outline-none" />
            </div>
          </div>
          {canExport && (
            <button onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          {canCreate && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Novo Template
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', label: 'Todos' }, { id: 'prescription', label: 'Prescrições' }, { id: 'certificate', label: 'Atestados' }, { id: 'record', label: 'Prontuários' }, { id: 'report', label: 'Relatórios' }].map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id as any)}
            className={`px-4 py-2 text-sm whitespace-nowrap border transition-colors ${activeCategory === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: appTemplates.length },
          { label: 'Favoritos', value: appTemplates.filter(t => t.isFavorite).length },
          { label: 'Prescrições', value: appTemplates.filter(t => t.category === 'prescription').length },
          { label: 'Usos totais', value: appTemplates.reduce((s, t) => s + t.usageCount, 0) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 p-4">
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Favorites section */}
      {appTemplates.filter(t => t.isFavorite).length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2"><Star className="w-3 h-3 text-yellow-500" /> Favoritos</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {appTemplates.filter(t => t.isFavorite && (activeCategory === 'all' || t.category === activeCategory)).map(t => (
              <button key={t.id} onClick={() => handleUse(t)}
                className="p-4 border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left group">
                <div className="flex items-start justify-between mb-2">
                  <div className={`text-xs px-2 py-0.5 ${categoryColor(t.category)}`}>{categoryLabel(t.category)}</div>
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-1">{t.specialty} • {t.usageCount} uso(s)</p>
              </button>
            ))}
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
                        <button onClick={() => handleToggleFavorite(t.id)} className="p-1.5 text-gray-400 hover:text-yellow-500 rounded">
                          {t.isFavorite ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setPreviewId(t.id)} className="p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => handleCopy(t.content, t.name)} className="p-1.5 text-gray-600 hover:bg-green-50 hover:text-green-600 rounded"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => handleUse(t)} className="px-3 py-1.5 bg-blue-600 text-white text-xs hover:bg-blue-700 flex items-center gap-1">
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
              <button onClick={() => { handleUse(previewTemplate); setPreviewId(null); }} className="px-4 py-2.5 bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2"><Download className="w-4 h-4" /> Usar Template</button>
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
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.isFavorite || false} onChange={(e) => setFormData(p => ({ ...p, isFavorite: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Marcar como favorito</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700">
                {editingId ? 'Salvar' : 'Criar Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}