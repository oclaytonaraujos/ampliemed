import { useState, useEffect } from 'react';
import { FileText, Search, Plus, Upload, Download, CheckCircle, Clock, AlertCircle, Filter, X, Eye, Trash2, Paperclip, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router';
import type { UserRole } from '../App';
import type { Exam } from './AppContext';
import { useApp } from './AppContext';
import { BackToPatientBanner } from './BackToPatientBanner';
import { FileUpload } from './FileUpload';
import { tussDatabase } from '../data/tussDatabase';
import { medicalToast, toastError, toastSuccess } from '../utils/toastService';
import { exportExams } from '../utils/exportService';
import { usePermission } from './PermissionGuard';

interface ExamsManagementProps { userRole: UserRole; }

export function ExamsManagement({ userRole }: ExamsManagementProps) {
  const { exams, setExams, patients, professionals, addNotification, addAuditEntry, currentUser, addFileAttachment, deleteFileAttachment, getAttachmentsByEntity } = useApp();
  const { canCreate, canUpdate, canDelete, canExport } = usePermission('exams');
  const [searchTerm, setSearchTerm] = useState('');
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [tussSearch, setTussSearch] = useState('');
  const [showTussDropdown, setShowTussDropdown] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [formData, setFormData] = useState<Partial<Exam>>({ status: 'solicitado', priority: 'normal' });

  const filteredExams = exams.filter(exam => {
    const ms = exam.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.examType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const mf = filterStatus === 'todos' || exam.status === filterStatus;
    return ms && mf;
  });

  const filteredTuss = tussSearch.length >= 2
    ? tussDatabase.filter(t =>
        t.description.toLowerCase().includes(tussSearch.toLowerCase()) ||
        t.code.includes(tussSearch) ||
        t.category.toLowerCase().includes(tussSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const filteredPatients = patientSearch.length >= 2
    ? patients.filter(p =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        (p.cpf && p.cpf.includes(patientSearch))
      ).slice(0, 8)
    : [];

  const statusInfo = (s: string) => {
    switch (s) {
      case 'concluido': return { color: 'bg-green-100 text-green-700', label: 'Concluído', icon: <CheckCircle className="w-4 h-4" /> };
      case 'em_andamento': return { color: 'bg-pink-100 text-pink-700', label: 'Em Andamento', icon: <Clock className="w-4 h-4" /> };
      case 'atrasado': return { color: 'bg-red-100 text-red-700', label: 'Atrasado', icon: <AlertCircle className="w-4 h-4" /> };
      default: return { color: 'bg-orange-100 text-orange-700', label: 'Solicitado', icon: <FileText className="w-4 h-4" /> };
    }
  };

  const stats = {
    total: exams.length,
    concluido: exams.filter(e => e.status === 'concluido').length,
    em_andamento: exams.filter(e => e.status === 'em_andamento').length,
    atrasado: exams.filter(e => e.status === 'atrasado').length,
  };

  // Pre-fill from navigation state (PatientDetailView → Solicitar Exame)
  const location = useLocation();
  const [preselectedPatientInfo, setPreselectedPatientInfo] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    const state = location.state as any;
    if (state?.preselectedPatient) {
      const p = state.preselectedPatient;
      const found = patients.find(pt => pt.id === p.id);
      setEditingExam(null);
      setFormData({
        status: 'solicitado',
        priority: 'normal',
        patientName: found?.name || p.name || '',
        patientId: p.id || '',
        requestDate: new Date().toISOString().split('T')[0],
        requestedBy: currentUser?.name || '',
      });
      setTussSearch('');
      setPatientSearch(found?.name || p.name || '');
      setShowModal(true);
      setPreselectedPatientInfo({ id: p.id, name: p.name });
      toastSuccess(`Paciente pré-selecionado: ${p.name}`, { description: 'Selecione o exame desejado.' });
      window.history.replaceState({}, '');
    }
  }, [location.state, patients, currentUser]);

  const openAdd = () => { setEditingExam(null); setFormData({ status: 'solicitado', priority: 'normal' }); setTussSearch(''); setPatientSearch(''); setShowModal(true); };
  const openEdit = (e: Exam) => { setEditingExam(e); setFormData({ ...e }); setTussSearch(e.examType); setPatientSearch(e.patientName); setShowModal(true); };

  const handleSave = () => {
    if (!formData.patientName || !formData.examType) return;
    if (editingExam) {
      setExams(prev => prev.map(e => e.id === editingExam.id ? { ...e, ...formData } as Exam : e));
      toastSuccess('Exame atualizado', { description: formData.patientName });
      addNotification({ type: 'exam', title: 'Exame atualizado', message: `Exame de ${formData.patientName} atualizado para ${formData.status}`, urgent: formData.status === 'atrasado' });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Exames', description: `Exame atualizado: ${formData.examType} — ${formData.patientName}`, status: 'success' });
    } else {
      const newExam: Exam = {
        id: crypto.randomUUID(),
        patientName: formData.patientName || '',
        patientId: formData.patientId,
        examType: formData.examType || '',
        requestDate: formData.requestDate || new Date().toISOString().split('T')[0],
        resultDate: formData.resultDate || null,
        status: formData.status as Exam['status'] || 'solicitado',
        laboratory: formData.laboratory || '',
        requestedBy: formData.requestedBy || '',
        priority: formData.priority as Exam['priority'] || 'normal',
        tussCode: formData.tussCode,
        notes: formData.notes,
      };
      setExams(prev => [newExam, ...prev]);
      medicalToast.examRequested(newExam.examType, newExam.patientName);
      addNotification({ type: 'exam', title: 'Exame solicitado', message: `Exame ${newExam.examType} solicitado para ${newExam.patientName} — Prioridade: ${newExam.priority}`, urgent: newExam.priority === 'urgente' });
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Exames', description: `Exame solicitado: ${newExam.examType} para ${newExam.patientName}`, status: 'success' });
    }
    setShowModal(false);
  };

  const handleUpdateStatus = (id: string, newStatus: Exam['status'], patientName: string) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, status: newStatus, resultDate: newStatus === 'concluido' ? new Date().toISOString().split('T')[0] : e.resultDate } : e));
    if (newStatus === 'concluido') {
      addNotification({ type: 'exam', title: 'Exame concluído', message: `Resultado do exame de ${patientName} disponível`, urgent: false });
      medicalToast.examCompleted(patientName);
    } else {
      toastSuccess(`Status atualizado`, { description: `${patientName} → ${newStatus}` });
    }
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'update', module: 'Exames', description: `Status atualizado: ${patientName} → ${newStatus}`, status: 'success' });
  };

  const handleDelete = (id: string, name: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    toastSuccess('Exame removido', { description: name });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'delete', module: 'Exames', description: `Exame removido: ${name}`, status: 'success' });
  };

  const handleExport = () => {
    try {
      exportExams(filteredExams);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Exames', description: `Exportação CSV: ${filteredExams.length} exames`, status: 'success' });
      medicalToast.exportSuccess(`exames_${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toastError('Erro ao exportar exames'); }
  };

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
        <div>
          <h2 className="text-gray-900 mb-2">Gestão de Exames</h2>
          <p className="text-gray-600">Solicitações, rastreamento e resultados de exames — base TUSS integrada</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative bg-white border border-gray-200 flex items-stretch">
            <div className="relative flex items-center w-64 px-2 border-r border-gray-200">
              <Search className="absolute left-4 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar exames..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 bg-gray-50 border-0 text-sm focus:outline-none" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm ${showFilters ? 'bg-pink-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <Filter className="w-4 h-4 text-gray-600" />
            </button>
            {showFilters && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 p-3 shadow-lg z-10 min-w-[250px]">
                <div className="grid grid-cols-2 gap-2">
                  {['todos', 'solicitado', 'em_andamento', 'concluido', 'atrasado'].map(s => (
                    <button key={s} onClick={() => { setFilterStatus(s); setShowFilters(false); }}
                      className={`px-3 py-2 border text-sm ${filterStatus === s ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                      {s === 'todos' ? 'Todos' : statusInfo(s).label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {canExport && (
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Exportar
            </button>
          )}
          {canCreate && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 transition-colors">
              <Plus className="w-4 h-4" /> Novo Exame
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div>
        <button
          onClick={() => setStatsExpanded(v => !v)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsExpanded ? '' : '-rotate-90'}`} />
          <span>Resumo — Total: <span className="text-pink-600 font-semibold">{stats.total}</span> · Concluídos: <span className="text-green-600 font-semibold">{stats.concluido}</span> · Em Andamento: <span className="text-yellow-500 font-semibold">{stats.em_andamento}</span> · Atrasados: <span className="text-red-600 font-semibold">{stats.atrasado}</span></span>
        </button>
        {statsExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-pink-600' },
              { label: 'Concluídos', value: stats.concluido, color: 'text-green-600' },
              { label: 'Em Andamento', value: stats.em_andamento, color: 'text-yellow-500' },
              { label: 'Atrasados', value: stats.atrasado, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 p-3 text-center">
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Paciente</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Exame</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Solicitante</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Solicitado em</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Prioridade</th>
                <th className="px-5 py-3 text-left text-xs text-gray-600 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs text-gray-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExams.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum exame encontrado</p>
                </td></tr>
              ) : filteredExams.map(exam => {
                const si = statusInfo(exam.status);
                return (
                  <tr key={exam.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-4 text-sm text-gray-900">{exam.patientName}</td>
                    <td className="px-5 py-4">
                      <div><p className="text-sm text-gray-900">{exam.examType}</p>
                      {exam.tussCode && <p className="text-xs text-gray-400 font-mono">TUSS: {exam.tussCode}</p>}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{exam.requestedBy || '-'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{exam.requestDate}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 ${exam.priority === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {exam.priority === 'urgente' ? '🔴 Urgente' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <select value={exam.status}
                        onChange={(e) => handleUpdateStatus(exam.id, e.target.value as Exam['status'], exam.patientName)}
                        className={`text-xs px-2 py-1 border ${si.color} cursor-pointer focus:outline-none`}>
                        <option value="solicitado">Solicitado</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="atrasado">Atrasado</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {getAttachmentsByEntity('exam', exam.id).length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-pink-600">
                            <Paperclip className="w-3 h-3" />
                            {getAttachmentsByEntity('exam', exam.id).length}
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(exam)} className="p-1.5 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded"><Eye className="w-4 h-4" /></button>
                          {userRole === 'admin' && (
                            <button onClick={() => handleDelete(exam.id, exam.patientName)} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
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
              <h3 className="text-gray-900">{editingExam ? 'Editar Exame' : 'Nova Solicitação de Exame'}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Patient select */}
                {/* Patient autocomplete */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-1.5">Paciente *</label>
                  <input type="text" placeholder="Buscar por nome ou CPF..." value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                      setFormData(prev => ({ ...prev, patientName: e.target.value, patientId: undefined }));
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  
                  {showPatientDropdown && filteredPatients.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredPatients.map(p => (
                        <button key={p.id} onClick={() => { 
                          setFormData(prev => ({ ...prev, patientName: p.name, patientId: p.id })); 
                          setPatientSearch(p.name); 
                          setShowPatientDropdown(false); 
                        }}
                          className="w-full text-left px-3 py-2.5 hover:bg-pink-50 border-b border-gray-100 last:border-0 flex flex-col">
                          <span className="text-gray-800 text-sm">{p.name}</span>
                          {p.cpf && <span className="text-gray-400 text-xs">CPF: {p.cpf}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {showPatientDropdown && patientSearch.length >= 2 && filteredPatients.length === 0 && (
                     <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 shadow-lg mt-1 p-3 text-sm text-gray-500 text-center">
                       Nenhum paciente encontrado. Pressione Enter ou clique fora para usar o nome digitado.
                     </div>
                  )}
                </div>

                {/* TUSS Exam Search */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-1.5">Tipo de Exame * (Base TUSS)</label>
                  <input type="text" placeholder="Buscar por nome ou código TUSS..." value={tussSearch}
                    onChange={(e) => { setTussSearch(e.target.value); setShowTussDropdown(true); setFormData(prev => ({ ...prev, examType: e.target.value })); }}
                    onFocus={() => setShowTussDropdown(true)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  {formData.tussCode && <p className="text-xs text-pink-600 mt-0.5">TUSS: {formData.tussCode}</p>}
                  {showTussDropdown && filteredTuss.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredTuss.map(t => (
                        <button key={t.code} onClick={() => { setFormData(prev => ({ ...prev, examType: t.description, tussCode: t.code })); setTussSearch(t.description); setShowTussDropdown(false); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-pink-50 border-b border-gray-100 last:border-0">
                          <span className="font-mono text-pink-700 text-xs">{t.code}</span>
                          <span className="text-gray-800 text-sm ml-2">{t.description}</span>
                          <span className="text-gray-400 text-xs ml-1">— R$ {t.value.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Solicitado por</label>
                  <select
                    value={formData.requestedBy || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Selecione um profissional...</option>
                    {professionals.filter(p => p.role === 'doctor').map(p => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Laboratório</label>
                  <input type="text" value={formData.laboratory || ''} onChange={(e) => setFormData(prev => ({ ...prev, laboratory: e.target.value }))}
                    placeholder="Laboratório" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Data de Solicitação</label>
                  <input type="date" value={formData.requestDate || new Date().toISOString().split('T')[0]} onChange={(e) => setFormData(prev => ({ ...prev, requestDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Prioridade</label>
                  <select value={formData.priority || 'normal'} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                {editingExam && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">Status</label>
                    <select value={formData.status || 'solicitado'} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none">
                      <option value="solicitado">Solicitado</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluido">Concluído</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Observações</label>
                <textarea rows={3} value={formData.notes || ''} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informações adicionais, preparo do paciente..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 focus:outline-none resize-none" />
              </div>

              {/* Laudos e resultados — só exibe quando editando exame existente */}
              {editingExam && (
                <div className="border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                    <label className="text-sm text-gray-700">Laudos e Resultados</label>
                    {getAttachmentsByEntity('exam', editingExam.id).length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700">
                        {getAttachmentsByEntity('exam', editingExam.id).length}
                      </span>
                    )}
                  </div>
                  <FileUpload
                    bucketType="documents"
                    folder={`exams/${editingExam.id}`}
                    label="Anexar laudo ou resultado"
                    description="PDF, JPG, PNG — máx. 20 MB"
                    compact
                    multiple
                    entityType="exam"
                    entityId={editingExam.id}
                    uploadedBy={currentUser?.name || ''}
                    existingFiles={getAttachmentsByEntity('exam', editingExam.id)}
                    onUploadComplete={(file) => {
                      addFileAttachment(file);
                      // Auto-atualiza status para concluído se ainda não estiver
                      if (formData.status === 'solicitado' || formData.status === 'em_andamento') {
                        setFormData(prev => ({ ...prev, status: 'concluido' }));
                      }
                    }}
                    onRemove={(id) => deleteFileAttachment(id)}
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={!formData.patientName || !formData.examType}
                className="px-5 py-2.5 bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50">
                {editingExam ? 'Salvar Alterações' : 'Solicitar Exame'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
