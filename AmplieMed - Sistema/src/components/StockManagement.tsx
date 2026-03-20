import { useState, useEffect } from 'react';
import { Package, Search, Plus, AlertTriangle, Download, Filter, X, CheckCircle, Edit, Trash2, TrendingDown } from 'lucide-react';
import type { UserRole } from '../App';
import type { StockItem } from './AppContext';
import { useApp } from './AppContext';
import { medicalToast, toastError } from '../utils/toastService';
import { exportStock } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface StockManagementProps { userRole: UserRole; }

export function StockManagement({ userRole }: StockManagementProps) {
  const { stockItems, setStockItems, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState<Partial<StockItem>>({ category: 'medicamento', status: 'ok', unit: 'un' });

  // Check for critical/expiring items on load
  useEffect(() => {
    const critical = stockItems.filter(i => i.status === 'critico');
    const expiring = stockItems.filter(i => {
      if (!i.expiry) return false;
      const exp = new Date(i.expiry);
      const today = new Date();
      const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30 && diff > 0;
    });
    if (critical.length > 0) {
      addNotification({ type: 'stock', title: 'Estoque crítico', message: `${critical.length} item(s) com nível crítico: ${critical.slice(0, 2).map(i => i.name).join(', ')}`, urgent: true });
    }
    if (expiring.length > 0) {
      addNotification({ type: 'stock', title: 'Itens próximos do vencimento', message: `${expiring.length} item(s) vencem em até 30 dias`, urgent: false });
    }
  }, []); // run once on mount

  const computeStatus = (quantity: number, minQuantity: number, expiry: string): StockItem['status'] => {
    if (expiry) {
      const exp = new Date(expiry);
      if (exp < new Date()) return 'vencido';
    }
    if (quantity <= 0) return 'critico';
    if (quantity <= minQuantity) return quantity <= minQuantity * 0.5 ? 'critico' : 'baixo';
    return 'ok';
  };

  const filteredStock = stockItems.filter(item => {
    const ms = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const mStatus = filterStatus === 'all' || item.status === filterStatus;
    const mCat = filterCategory === 'all' || item.category === filterCategory;
    return ms && mStatus && mCat;
  });

  const statusInfo = (s: string) => {
    switch (s) {
      case 'ok': return { color: 'bg-green-100 text-green-700', label: 'Normal' };
      case 'baixo': return { color: 'bg-orange-100 text-orange-700', label: 'Estoque Baixo' };
      case 'critico': return { color: 'bg-red-100 text-red-700', label: 'Crítico' };
      case 'vencido': return { color: 'bg-gray-200 text-gray-700', label: 'Vencido' };
      default: return { color: 'bg-gray-100 text-gray-700', label: s };
    }
  };

  const criticalItems = stockItems.filter(i => i.status === 'critico' || i.status === 'baixo').length;
  const expiredItems = stockItems.filter(i => i.status === 'vencido').length;



  const openAdd = () => { setEditingItem(null); setFormData({ category: 'medicamento', status: 'ok', unit: 'un' }); setShowModal(true); };
  const openEdit = (item: StockItem) => { setEditingItem(item); setFormData({ ...item }); setShowModal(true); };

  const handleSave = () => {
    const qty = formData.quantity || 0;
    const minQty = formData.minQuantity || 0;
    const computedStatus = computeStatus(qty, minQty, formData.expiry || '');

    if (editingItem) {
      const updated: StockItem = { ...editingItem, ...formData, status: computedStatus } as StockItem;
      setStockItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
      if (computedStatus === 'critico') {
        addNotification({ type: 'stock', title: 'Item com estoque crítico', message: `${updated.name} atingiu nível crítico (${updated.quantity} ${updated.unit})`, urgent: true });
        medicalToast.stockCritical(updated.name);
      } else if (computedStatus === 'baixo') {
        addNotification({ type: 'stock', title: 'Estoque baixo', message: `${updated.name} está com estoque baixo (${updated.quantity} ${updated.unit})`, urgent: false });
      }
      medicalToast.stockItemUpdated(updated.name);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Estoque', description: `Item atualizado: ${updated.name}`, status: 'success' });
    } else {
      const newItem: StockItem = {
        id: crypto.randomUUID(),
        name: formData.name || '',
        category: formData.category || 'medicamento',
        quantity: qty,
        minQuantity: minQty,
        unit: formData.unit || 'un',
        batch: formData.batch || '',
        expiry: formData.expiry || '',
        supplier: formData.supplier || '',
        status: computedStatus,
        location: formData.location || '',
        unitCost: formData.unitCost,
      };
      setStockItems(prev => [...prev, newItem]);
      addNotification({ type: 'stock', title: 'Item adicionado ao estoque', message: `${newItem.name} adicionado — ${newItem.quantity} ${newItem.unit}`, urgent: false });
      medicalToast.stockItemAdded(newItem.name);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Estoque', description: `Item criado: ${newItem.name}`, status: 'success' });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    setStockItems(prev => prev.filter(i => i.id !== id));
    medicalToast.stockItemUpdated(`${name} removido do estoque`);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Estoque', description: `Item removido: ${name}`, status: 'success' });
  };

  const handleExport = () => {
    try {
      exportStock(filteredStock);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Estoque', description: `Exportação CSV: ${filteredStock.length} itens`, status: 'success' });
      medicalToast.exportSuccess(`estoque_${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toastError('Erro ao exportar estoque'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Controle de Estoque</h2>
          <p className="text-gray-600">Medicamentos, materiais e equipamentos com alertas automáticos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch">
            <div className="relative flex items-center w-64 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar item ou fornecedor..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm ${showFilters ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {canExport && (
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          {canCreate && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Novo Item
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <div className="flex gap-2">
              {['all', 'ok', 'baixo', 'critico', 'vencido'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 text-xs border transition-colors ${filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {s === 'all' ? 'Todos' : statusInfo(s).label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
            <div className="flex gap-2">
              {['all', 'medicamento', 'material', 'equipamento'].map(c => (
                <button key={c} onClick={() => setFilterCategory(c)}
                  className={`px-3 py-1.5 text-xs border transition-colors ${filterCategory === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {c === 'all' ? 'Todas' : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alert banners */}
      {criticalItems > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800"><strong>{criticalItems} item(s)</strong> com estoque crítico ou baixo. Verifique e faça novos pedidos.</p>
        </div>
      )}
      {expiredItems > 0 && (
        <div className="bg-gray-100 border border-gray-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-600 flex-shrink-0" />
          <p className="text-sm text-gray-700"><strong>{expiredItems} item(s)</strong> vencido(s). Descarte de acordo com as normas da ANVISA.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Itens', value: stockItems.length, icon: Package, color: 'text-blue-600' },
          { label: 'Críticos + Baixos', value: criticalItems, icon: TrendingDown, color: 'text-red-600' },
          { label: 'Vencidos', value: expiredItems, icon: AlertTriangle, color: 'text-gray-600' },
          { label: 'OK', value: stockItems.filter(i => i.status === 'ok').length, icon: CheckCircle, color: 'text-green-600' },
        ].map(s => { const Icon = s.icon; return (
          <div key={s.label} className="bg-white border border-gray-200 p-4 flex items-center gap-3">
            <div className={`p-2 bg-gray-50 ${s.color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{s.label}</p><p className="text-xl font-semibold text-gray-900">{s.value}</p></div>
          </div>
        ); })}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Item</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Categoria</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Qtd</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Mín</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Lote</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Validade</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Fornecedor</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStock.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum item no estoque</p>
                  <p className="text-sm text-gray-400 mt-1">Clique em "Novo Item" para adicionar medicamentos e materiais.</p>
                </td></tr>
              ) : filteredStock.map(item => {
                const si = statusInfo(item.status);
                const pct = item.minQuantity > 0 ? Math.min(100, Math.round((item.quantity / (item.minQuantity * 2)) * 100)) : 100;
                return (
                  <tr key={item.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.location && <p className="text-xs text-gray-400">{item.location}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 capitalize">{item.category}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{item.quantity}</span>
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>
                      <div className="w-20 h-1.5 bg-gray-100 mt-1">
                        <div className={`h-full ${pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{item.minQuantity} {item.unit}</td>
                    <td className="px-5 py-4 text-xs text-gray-500 font-mono">{item.batch || '-'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{item.expiry || '-'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{item.supplier}</td>
                    <td className="px-5 py-4"><span className={`text-xs px-2 py-1 ${si.color}`}>{si.label}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canUpdate && (
                          <button onClick={() => openEdit(item)} className="p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                        )}
                        {userRole === 'admin' && canDelete && (
                          <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">{editingItem ? 'Editar Item' : 'Novo Item no Estoque'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Nome *', key: 'name', type: 'text', colSpan: 2 },
                { label: 'Fornecedor', key: 'supplier', type: 'text' },
                { label: 'Local de armazenamento', key: 'location', type: 'text' },
                { label: 'Quantidade *', key: 'quantity', type: 'number' },
                { label: 'Quantidade mínima *', key: 'minQuantity', type: 'number' },
                { label: 'Lote', key: 'batch', type: 'text' },
                { label: 'Validade', key: 'expiry', type: 'date' },
                { label: 'Custo unitário (R$)', key: 'unitCost', type: 'number' },
              ].map(f => (
                <div key={f.key} className={f.colSpan === 2 ? 'col-span-2' : ''}>
                  <label className="block text-sm text-gray-700 mb-1.5">{f.label}</label>
                  <input type={f.type} value={(formData as any)[f.key] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Categoria</label>
                <select value={formData.category || 'medicamento'} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                  <option value="medicamento">Medicamento</option>
                  <option value="material">Material</option>
                  <option value="equipamento">Equipamento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Unidade</label>
                <select value={formData.unit || 'un'} onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                  {['un', 'cx', 'fr', 'amp', 'cp', 'ml', 'L', 'g', 'kg'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={!formData.name}
                className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}