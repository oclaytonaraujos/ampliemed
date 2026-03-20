import { useState } from 'react';
import { Shield, Search, Filter, Download, FileText, Edit, Trash2, Eye, Lock, X, Calendar } from 'lucide-react';
import { UserRole } from '../App';
import type { AuditEntry } from './AppContext';
import { useApp } from './AppContext';
import { exportAuditLog, exportAuditLogPDF } from '../utils/exportService';
import { toastSuccess, toastError } from '../utils/toastService';

interface AuditLogProps { userRole: UserRole; }

export function AuditLog({ userRole }: AuditLogProps) {
  const { auditLog } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterModule, setFilterModule] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const filteredEntries = auditLog.filter(entry => {
    const ms = entry.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.module.toLowerCase().includes(searchTerm.toLowerCase());
    const ma = filterAction === 'all' || entry.action === filterAction;
    const mm = filterModule === 'all' || entry.module === filterModule;
    const ms2 = statusFilter === 'all' || entry.status === statusFilter;
    return ms && ma && mm && ms2;
  });

  const totalPages = Math.ceil(filteredEntries.length / PER_PAGE);
  const pagedEntries = filteredEntries.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const uniqueModules = Array.from(new Set(auditLog.map(e => e.module)));

  const actionIcon = (a: string) => {
    switch (a) {
      case 'create': return <FileText className="w-3 h-3" />;
      case 'read': return <Eye className="w-3 h-3" />;
      case 'update': return <Edit className="w-3 h-3" />;
      case 'delete': return <Trash2 className="w-3 h-3" />;
      case 'login': return <Lock className="w-3 h-3" />;
      case 'logout': return <Lock className="w-3 h-3" />;
      case 'export': return <Download className="w-3 h-3" />;
      case 'sign': return <Shield className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const actionColor = (a: string) => {
    switch (a) {
      case 'create': return 'bg-green-50 text-green-700 border-green-200';
      case 'read': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'update': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'delete': return 'bg-red-50 text-red-700 border-red-200';
      case 'login': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'logout': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'export': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'sign': return 'bg-teal-50 text-teal-700 border-teal-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const actionLabel = (a: string) => {
    const map: Record<string, string> = {
      create: 'Criação', read: 'Leitura', update: 'Atualização', delete: 'Exclusão',
      login: 'Login', logout: 'Logout', export: 'Exportação', sign: 'Assinatura',
    };
    return map[a] || a;
  };

  const handleExportCSV = () => {
    try {
      exportAuditLog(filteredEntries);
      toastSuccess('Log exportado (CSV)', { description: `${filteredEntries.length} registros` });
    } catch { toastError('Erro ao exportar'); }
  };

  const handleExportPDF = async () => {
    try {
      exportAuditLogPDF(filteredEntries);
      toastSuccess('Log exportado (PDF)', { description: `${filteredEntries.length} registros` });
    } catch { toastError('Erro ao gerar PDF'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">Log de Auditoria</h2>
          <p className="text-gray-600">Rastreabilidade completa de todas as ações — conformidade LGPD/CFM</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch">
            <div className="relative flex items-center w-72 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por usuário, módulo ou descrição..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm ${showFilters ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 text-sm">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Ação</label>
            <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none">
              <option value="all">Todas</option>
              {['create', 'update', 'delete', 'read', 'login', 'logout', 'export', 'sign'].map(a => (
                <option key={a} value={a}>{actionLabel(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Módulo</label>
            <select value={filterModule} onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none">
              <option value="all">Todos</option>
              {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 text-sm focus:outline-none">
              <option value="all">Todos</option>
              <option value="success">Sucesso</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
          <button onClick={() => { setFilterAction('all'); setFilterModule('all'); setStatusFilter('all'); setSearchTerm(''); }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de Registros', value: auditLog.length, color: 'text-blue-600' },
          { label: 'Hoje', value: auditLog.filter(e => e.timestamp.startsWith(new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-').slice(0, 10)) || e.timestamp.includes(new Date().toLocaleDateString('pt-BR').split('/').slice(0, 2).join('/'))).length, color: 'text-green-600' },
          { label: 'Ações de Exclusão', value: auditLog.filter(e => e.action === 'delete').length, color: 'text-red-600' },
          { label: 'Filtrados', value: filteredEntries.length, color: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 p-4">
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* LGPD badge */}
      <div className="bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>Conformidade LGPD/CFM:</strong> Este log registra automaticamente todas as ações críticas do sistema — criação, edição, exclusão, login/logout e exportações. Dados de saúde devem ser retidos por mínimo de 20 anos (CFM 1638/2002).
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Usuário</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Ação</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Módulo</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Descrição</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedEntries.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma entrada de auditoria encontrada</p>
                  <p className="text-sm text-gray-400 mt-1">As ações do sistema serão registradas automaticamente aqui.</p>
                </td></tr>
              ) : pagedEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">{entry.timestamp}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{entry.user}</p>
                    <p className="text-xs text-gray-400 capitalize">{entry.userRole}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border ${actionColor(entry.action)}`}>
                      {actionIcon(entry.action)}{actionLabel(entry.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{entry.module}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry.ipAddress}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 ${entry.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {entry.status === 'success' ? 'Sucesso' : 'Falhou'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredEntries.length)} de {filteredEntries.length}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50">Anterior</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}