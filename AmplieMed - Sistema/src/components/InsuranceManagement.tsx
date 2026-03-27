import { useState } from 'react';
import { CreditCard, Plus, Search, Edit, Trash2, CheckCircle, XCircle, FileText, DollarSign, Calendar, AlertCircle, Filter, Building2, X, Download } from 'lucide-react';
import { UserRole } from '../App';
import type { Insurance } from './AppContext';
import { useApp } from './AppContext';
import { validateCNPJ } from '../utils/validators';
import { tussDatabase } from '../data/tussDatabase';
import { medicalToast, toastError, toastSuccess } from '../utils/toastService';
import { exportToCSV } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface InsuranceManagementProps { userRole: UserRole; }

export function InsuranceManagement({ userRole }: InsuranceManagementProps) {
  const { insurances, addInsurance, updateInsurance, deleteInsurance, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('insurance');
  const [activeView, setActiveView] = useState<'list' | 'procedures' | 'authorizations'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<Insurance>>({
    type: 'health', status: 'active', gracePeriod: 30, coveragePercentage: 100,
  });

  const filteredInsurances = insurances.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.cnpj.includes(searchTerm) ||
    i.register.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const openAdd = () => {
    setEditingId(null);
    setFormData({ type: 'health', status: 'active', gracePeriod: 30, coveragePercentage: 100 });
    setErrors({});
    setShowAddModal(true);
  };

  const openEdit = (ins: Insurance) => {
    setEditingId(ins.id);
    setFormData({ ...ins });
    setErrors({});
    setShowAddModal(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name?.trim()) e.name = 'Nome obrigatório';
    if (!formData.cnpj?.trim()) e.cnpj = 'CNPJ obrigatório';
    else if (!validateCNPJ(formData.cnpj)) e.cnpj = 'CNPJ inválido';
    if (!formData.register?.trim()) e.register = 'Registro ANS obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const data: Omit<Insurance, 'id'> = {
      name: formData.name || '',
      cnpj: formData.cnpj || '',
      register: formData.register || '',
      type: formData.type || 'health',
      status: formData.status || 'active',
      phone: formData.phone || '',
      email: formData.email || '',
      contractDate: formData.contractDate || '',
      expirationDate: formData.expirationDate || '',
      gracePeriod: formData.gracePeriod || 30,
      coveragePercentage: formData.coveragePercentage || 100,
    };
    if (editingId) {
      updateInsurance(editingId, data);
      addNotification({ type: 'info', title: 'Convênio atualizado', message: `Dados de ${data.name} atualizados`, urgent: false });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Convênios', description: `Convênio atualizado: ${data.name}`, status: 'success' });
      toastSuccess('Convênio atualizado!');
    } else {
      addInsurance(data);
      addNotification({ type: 'info', title: 'Convênio cadastrado', message: `${data.name} cadastrado com registro ANS ${data.register}`, urgent: false });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Convênios', description: `Convênio criado: ${data.name}`, status: 'success' });
      toastSuccess('Convênio cadastrado!');
    }
    setShowAddModal(false);
  };

  const handleDelete = (ins: Insurance) => {
    deleteInsurance(ins.id);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Convênios', description: `Convênio removido: ${ins.name}`, status: 'success' });
    toastSuccess(`${ins.name} removido`);
  };

  const isExpiring = (date: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 60 && diff > 0;
  };

  const typeLabel = (t: string) => t === 'health' ? 'Saúde' : t === 'dental' ? 'Odontológico' : 'Saúde + Odonto';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Gestão de Convênios</h2>
          <p className="text-gray-600">Contratos, tabelas TUSS e autorizações de procedimentos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 bg-white">
            {[{ id: 'list', label: 'Convênios' }, { id: 'procedures', label: 'Procedimentos TUSS' }, { id: 'authorizations', label: 'Autorizações' }].map(v => (
              <button key={v.id} onClick={() => setActiveView(v.id as any)}
                className={`px-4 py-2.5 text-sm border-r last:border-0 border-gray-200 transition-colors ${activeView === v.id ? 'bg-pink-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                {v.label}
              </button>
            ))}
          </div>
          {activeView === 'list' && (
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700">
              <Plus className="w-4 h-4" /> Novo Convênio
            </button>
          )}
        </div>
      </div>

      {activeView === 'list' && (
        <>
          <div className="relative bg-white border border-gray-200 flex items-stretch w-max">
            <div className="relative flex items-center w-80 px-2">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por nome, CNPJ ou registro ANS..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border-0 text-sm focus:outline-none" />
            </div>
          </div>

          {filteredInsurances.length === 0 ? (
            <div className="bg-white border border-gray-200 p-16 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum convênio cadastrado</p>
              <p className="text-sm text-gray-400 mt-1">Cadastre os convênios aceitos pela clínica.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInsurances.map(ins => (
                <div key={ins.id} className="bg-white border border-gray-200 p-6 hover:border-pink-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-pink-50"><CreditCard className="w-6 h-6 text-pink-600" /></div>
                      <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-medium text-gray-900">{ins.name}</h3>
                          <span className={`text-xs px-2 py-0.5 flex items-center gap-1 ${ins.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {ins.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {ins.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">{typeLabel(ins.type)}</span>
                          {isExpiring(ins.expirationDate) && (
                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Contrato vencendo
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-500">
                          <span>CNPJ: <span className="font-mono">{ins.cnpj}</span></span>
                          <span>ANS: <span className="font-mono">{ins.register}</span></span>
                          <span>Cobertura: {ins.coveragePercentage}%</span>
                          <span>Carência: {ins.gracePeriod} dias</span>
                          {ins.expirationDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vigência até: {ins.expirationDate}</span>}
                          {ins.phone && <span>{ins.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { setSelectedInsuranceId(ins.id); setActiveView('procedures'); }} className="px-3 py-1.5 text-xs text-pink-600 border border-pink-200 hover:bg-pink-50">
                        Ver Tabela TUSS
                      </button>
                      <button onClick={() => openEdit(ins)} className="p-2 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded"><Edit className="w-4 h-4" /></button>
                      {userRole === 'admin' && (
                        <button onClick={() => handleDelete(ins)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeView === 'procedures' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {insurances.length > 0 && (
              <select value={selectedInsuranceId} onChange={(e) => setSelectedInsuranceId(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-sm focus:outline-none">
                <option value="">Selecionar convênio...</option>
                {insurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            )}
            <button onClick={() => setActiveView('list')} className="text-sm text-pink-600 hover:underline">← Voltar</button>
          </div>
          <div className="bg-white border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Tabela de Procedimentos TUSS</h3>
              {selectedInsuranceId ? <p className="text-xs text-gray-500">Convênio: {insurances.find(i => i.id === selectedInsuranceId)?.name}</p> : <p className="text-xs text-gray-500">Selecione um convênio acima para ver a tabela</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Código TUSS</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Procedimento</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Categoria</th>
                  <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Tipo</th>
                  <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase">Valor (R$)</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {tussDatabase.slice(0, 20).map(t => (
                    <tr key={t.code} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-pink-700">{t.code}</td>
                      <td className="px-5 py-3 text-sm text-gray-800">{t.description}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{t.category}</td>
                      <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 capitalize">{t.type}</span></td>
                      <td className="px-5 py-3 text-sm text-gray-900 text-right">{t.value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'authorizations' && (
        <div className="space-y-4">
          <button onClick={() => setActiveView('list')} className="text-sm text-pink-600 hover:underline">← Voltar</button>
          <div className="bg-white border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma autorização pendente</p>
            <p className="text-sm text-gray-400 mt-1">As solicitações de autorização prévia aparecem aqui conforme criadas.</p>
            <button className="mt-4 px-5 py-2.5 bg-pink-600 text-white text-sm hover:bg-pink-700">Nova Solicitação</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">{editingId ? 'Editar Convênio' : 'Novo Convênio'}</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Nome do Convênio *', key: 'name', type: 'text', span: 2 },
                { label: 'CNPJ *', key: 'cnpj', type: 'text', placeholder: '00.000.000/0001-00' },
                { label: 'Registro ANS *', key: 'register', type: 'text', placeholder: '000000' },
                { label: 'Telefone', key: 'phone', type: 'text' },
                { label: 'E-mail', key: 'email', type: 'email' },
                { label: 'Data de Contrato', key: 'contractDate', type: 'date' },
                { label: 'Vencimento do Contrato', key: 'expirationDate', type: 'date' },
                { label: 'Carência (dias)', key: 'gracePeriod', type: 'number' },
                { label: 'Cobertura (%)', key: 'coveragePercentage', type: 'number' },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                  <label className="block text-sm text-gray-700 mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={(f as any).placeholder || ''} value={(formData as any)[f.key] || ''}
                    onChange={(e) => setFormData(p => ({ ...p, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                    className={`w-full px-3 py-2.5 bg-gray-50 border focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white ${errors[f.key] ? 'border-red-400' : 'border-gray-200'}`} />
                  {errors[f.key] && <p className="text-xs text-red-600 mt-1">{errors[f.key]}</p>}
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Tipo</label>
                <select value={formData.type || 'health'} onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                  <option value="health">Saúde</option>
                  <option value="dental">Odontológico</option>
                  <option value="both">Saúde + Odonto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Status</label>
                <select value={formData.status || 'active'} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700">
                {editingId ? 'Salvar Alterações' : 'Cadastrar Convênio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}