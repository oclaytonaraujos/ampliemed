import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CreditCard, 
  Download, 
  Plus,
  FileText,
  Calendar,
  Search,
  Filter,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
  Receipt,
  Wallet,
  ArrowRightLeft
} from 'lucide-react';
import type { UserRole } from '../App';
import { EmptyState } from './EmptyState';
import { useApp } from './AppContext';
import type { FinancialBilling, FinancialPayment, FinancialReceivable, FinancialPayable } from './AppContext';
import { medicalToast, toastSuccess, toastError } from '../utils/toastService';
import { exportFinancial, exportFinancialPDF } from '../utils/exportService';
import { usePermission } from './PermissionGuard';
import { syncBillings, syncPayments, syncReceivables, syncPayables } from '../utils/api';

interface FinancialModuleProps {
  userRole: UserRole;
}

interface Commission {
  id: string;
  doctor: string;
  crm: string;
  period: string;
  procedures: number;
  gross: string;
  commission: string;
  value: string;
  status: string;
}

interface Glosa {
    id: string;
    insurance: string;
    patient: string;
    procedure: string;
    date: string;
    value: string;
    reason: string;
    status: string;
}

type TabType = 'billing' | 'payments' | 'commissions' | 'receivables' | 'payables' | 'cashflow' | 'glosas';

export function FinancialModule({ userRole }: FinancialModuleProps) {
  const { financialBillings, setFinancialBillings, financialPayments, setFinancialPayments, financialReceivables, setFinancialReceivables, financialPayables, setFinancialPayables, appointments, patients, insurances, addNotification, addAuditEntry, currentUser } = useApp();
  const { canCreate, canExport } = usePermission('financial');

  const [activeTab, setActiveTab] = useState<TabType>('billing');
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showGlosaModal, setShowGlosaModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [billingForm, setBillingForm] = useState<Partial<FinancialBilling>>({ status: 'pending', insurance: '', patient: '' });
  const [paymentForm, setPaymentForm] = useState<Partial<FinancialPayment>>({ status: 'pending', method: 'pix', type: 'Consulta' });
  const [receivableForm, setReceivableForm] = useState<Partial<FinancialReceivable>>({ status: 'pending' });
  const [payableForm, setPayableForm] = useState<Partial<FinancialPayable>>({ status: 'pending' });
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [glosas, setGlosas] = useState<Glosa[]>([]);

  useEffect(() => {
    // Calculate commissions
    const commissionData = financialPayments.reduce((acc, payment) => {
      const doctor = patients.find(p => p.name === payment.patient)?.doctor;
      if (doctor) {
        if (!acc[doctor]) {
          acc[doctor] = { id: doctor, doctor, crm: '123456', period: 'Mar/2026', procedures: 0, gross: 0, commission: '50%', value: 0, status: 'pending' };
        }
        acc[doctor].procedures += 1;
        acc[doctor].gross += payment.amount;
        acc[doctor].value += payment.amount * 0.5;
      }
      return acc;
    }, {} as Record<string, any>);
    setCommissions(Object.values(commissionData).map(c => ({ ...c, gross: `R$ ${c.gross.toFixed(2)}`, value: `R$ ${c.value.toFixed(2)}` })));

    // Filter glosas
    const glosaData = financialBillings
      .filter(b => b.status === 'contested' || (b.glosaNum && b.glosaNum > 0))
      .map(b => ({
        id: b.id,
        insurance: b.insurance,
        patient: b.patient,
        procedure: 'Procedimento',
        date: b.date,
        value: `R$ ${b.glosaNum.toFixed(2)}`,
        reason: 'Motivo da glosa',
        status: b.status,
      }));
    setGlosas(glosaData);
  }, [financialPayments, financialBillings, patients]);

  const filteredBillings = financialBillings.filter(b => !searchTerm || b.insurance.toLowerCase().includes(searchTerm.toLowerCase()) || b.patient.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPayments = financialPayments.filter(p => !searchTerm || p.patient.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredReceivables = financialReceivables.filter(r => !searchTerm || r.patient.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPayables = financialPayables.filter(p => !searchTerm || p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

  // Cashflow from real data
  const cashflowItems = [
    ...financialPayments.filter(p => p.status === 'received').map((p, i, arr) => ({ date: p.date, desc: `Recebimento — ${p.patient}`, type: 'entrada', value: p.amount })),
    ...financialPayables.filter(p => p.status === 'paid').map((p, i, arr) => ({ date: p.dueDate, desc: `Pagamento — ${p.supplier}`, type: 'saida', value: p.amount })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Compute running balance
  let runningBalance = 0;
  const cashflowWithBalance = cashflowItems.map(item => {
    if (item.type === 'entrada') runningBalance += item.value;
    else runningBalance -= item.value;
    return { ...item, balance: runningBalance };
  });

  // CRUD handlers
  const handleAddBilling = async () => {
    if (!billingForm.insurance) return;
    const b: FinancialBilling = { id: crypto.randomUUID(), patient: billingForm.patient || '', insurance: billingForm.insurance || '', date: billingForm.date || new Date().toISOString().split('T')[0], amount: billingForm.amount || 0, status: billingForm.status || 'pending', items: billingForm.items || 1, glosaNum: 0 };
    const updatedBillings = [b, ...financialBillings];
    setFinancialBillings(updatedBillings);
    await syncBillings(updatedBillings);
    addNotification({ type: 'payment', title: 'Faturamento criado', message: `Faturamento TISS para ${b.insurance} — R$ ${b.amount.toFixed(2)}`, urgent: false });
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Financeiro', description: `Faturamento: ${b.insurance} R$ ${b.amount.toFixed(2)}`, status: 'success' });
    toastSuccess('Faturamento criado!', { description: `${b.insurance} — R$ ${b.amount.toFixed(2)}` }); setShowBillingModal(false); setBillingForm({ status: 'pending' });
  };
  const handleAddPayment = async () => {
    if (!paymentForm.patient) return;
    const p: FinancialPayment = { id: crypto.randomUUID(), patient: paymentForm.patient || '', type: paymentForm.type || 'Consulta', date: paymentForm.date || new Date().toISOString().split('T')[0], amount: paymentForm.amount || 0, method: paymentForm.method || 'pix', status: paymentForm.status || 'pending' };
    const updatedPayments = [p, ...financialPayments];
    setFinancialPayments(updatedPayments);
    await syncPayments(updatedPayments);
    if (p.status === 'received') {
      addNotification({ type: 'payment', title: 'Pagamento recebido', message: `R$ ${p.amount.toFixed(2)} recebido de ${p.patient}`, urgent: false });
      medicalToast.paymentRegistered(p.amount);
    } else {
      toastSuccess('Pagamento registrado!', { description: `${p.patient} — R$ ${p.amount.toFixed(2)}` });
    }
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Financeiro', description: `Pagamento: ${p.patient} R$ ${p.amount.toFixed(2)}`, status: 'success' });
    setShowPaymentModal(false); setPaymentForm({ status: 'pending', method: 'pix', type: 'Consulta' });
  };
  const handleAddReceivable = async () => {
    if (!receivableForm.patient) return;
    const r: FinancialReceivable = { id: crypto.randomUUID(), patient: receivableForm.patient || '', description: receivableForm.description || '', dueDate: receivableForm.dueDate || '', amount: receivableForm.amount || 0, status: receivableForm.status || 'pending' };
    const updatedReceivables = [r, ...financialReceivables];
    setFinancialReceivables(updatedReceivables);
    await syncReceivables(updatedReceivables);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Financeiro', description: `A receber: ${r.patient} R$ ${r.amount.toFixed(2)}`, status: 'success' });
    toastSuccess('Conta a receber criada!'); setShowReceivableModal(false); setReceivableForm({ status: 'pending' });
  };
  const handleAddPayable = async () => {
    if (!payableForm.supplier) return;
    const p: FinancialPayable = { id: crypto.randomUUID(), supplier: payableForm.supplier || '', description: payableForm.description || '', dueDate: payableForm.dueDate || '', amount: payableForm.amount || 0, status: payableForm.status || 'pending' };
    const updatedPayables = [p, ...financialPayables];
    setFinancialPayables(updatedPayables);
    await syncPayables(updatedPayables);
    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'create', module: 'Financeiro', description: `A pagar: ${p.supplier} R$ ${p.amount.toFixed(2)}`, status: 'success' });
    toastSuccess('Conta a pagar criada!'); setShowPayableModal(false); setPayableForm({ status: 'pending' });
  };

  const handleUpdatePaymentStatus = async (id: string, s: FinancialPayment['status'], pt: string) => {
    const updatedPayments = financialPayments.map(p => p.id === id ? { ...p, status: s } : p);
    setFinancialPayments(updatedPayments);
    await syncPayments(updatedPayments);
    if (s === 'received') { addNotification({ type: 'payment', title: 'Pagamento recebido', message: `Pagamento de ${pt} confirmado`, urgent: false }); medicalToast.paymentRegistered(0); }
    else toastSuccess('Status atualizado!');
  };
  const handleUpdateReceivableStatus = async (id: string, s: FinancialReceivable['status'], pt: string) => {
    const updatedReceivables = financialReceivables.map(r => r.id === id ? { ...r, status: s } : r);
    setFinancialReceivables(updatedReceivables);
    await syncReceivables(updatedReceivables);
    if (s === 'received') addNotification({ type: 'payment', title: 'Recebível liquidado', message: `Conta de ${pt} recebida`, urgent: false });
    toastSuccess('Status atualizado!');
  };
  const handleUpdatePayableStatus = async (id: string, s: FinancialPayable['status'], sup: string) => {
    const updatedPayables = financialPayables.map(p => p.id === id ? { ...p, status: s } : p);
    setFinancialPayables(updatedPayables);
    await syncPayables(updatedPayables);
    if (s === 'paid') addNotification({ type: 'payment', title: 'Pagamento efetuado', message: `Conta com ${sup} paga`, urgent: false });
    toastSuccess('Status atualizado!');
  };


  const handleExportCSV = () => {
    try {
      exportFinancial(financialPayments);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Financeiro', description: `Exportação CSV: ${financialPayments.length} pagamentos`, status: 'success' });
      medicalToast.exportSuccess(`financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    } catch { toastError('Erro ao exportar'); }
  };

  const handleExportPDF = () => {
    try {
      exportFinancialPDF(financialPayments, financialReceivables, financialPayables);
      addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Financeiro', description: 'Relatório financeiro PDF gerado', status: 'success' });
      medicalToast.exportSuccess('relatorio_financeiro.pdf');
    } catch { toastError('Erro ao gerar relatório'); }
  };

  // Derived KPIs from real appointment data
  const totalPaid = appointments
    .filter(a => a.paymentStatus === 'pago')
    .reduce((s, a) => s + (a.paidAmount || a.consultationValue || 0), 0);
  const totalPending = appointments
    .filter(a => a.paymentStatus === 'pendente')
    .reduce((s, a) => s + (a.consultationValue || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'received': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'contested': return 'bg-orange-100 text-orange-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'sent': return 'Enviado';
      case 'received': return 'Recebido';
      case 'overdue': return 'Vencido';
      case 'contested': return 'Contestado';
      case 'resolved': return 'Resolvido';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-gray-900 mb-2">Módulo Financeiro Completo</h2>
          <p className="text-gray-600">Faturamento TISS, fluxo de caixa, contas a receber/pagar e gestão de glosas</p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <>
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
                <FileText className="w-4 h-4" /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-1 px-6 min-w-max">
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'billing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Faturamento TISS
            </button>
            <button
              onClick={() => setActiveTab('receivables')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'receivables'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Contas a Receber
            </button>
            <button
              onClick={() => setActiveTab('payables')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'payables'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Contas a Pagar
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Pagamentos
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'commissions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Comissionamento
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'cashflow'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Fluxo de Caixa
            </button>
            <button
              onClick={() => setActiveTab('glosas')}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'glosas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Gestão de Glosas
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {/* Faturamento TISS Tab */}
          {activeTab === 'billing' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar faturamento..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </button>
                </div>
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Novo Faturamento
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Convênio</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Período</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Procedimentos</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor Bruto</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Glosas</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor Líquido</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Prazo</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBillings.length === 0 ? (
                      <tr><td colSpan={9}><EmptyState icon={FileText} title="Nenhum faturamento registrado" description="Os faturamentos TISS aparecerão aqui conforme forem criados. Clique em 'Novo Faturamento' para começar." /></td></tr>
                    ) : filteredBillings.map((billing) => (
                      <tr key={billing.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{billing.insurance}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{billing.month}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{billing.procedures}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{billing.value}</td>
                        <td className="px-6 py-4 text-sm text-orange-600">{billing.glosa}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          R$ {(billing.valueNum - billing.glosaNum).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{billing.deadline}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(billing.status)}`}>
                            {getStatusLabel(billing.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Download className="w-3 h-3" />
                              XML
                            </button>
                            <button className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              <FileText className="w-3 h-3" />
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Contas a Receber Tab */}
          {activeTab === 'receivables' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar contas..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Todos os status</option>
                    <option value="pending">Pendente</option>
                    <option value="overdue">Vencido</option>
                    <option value="received">Recebido</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowReceivableModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nova Conta a Receber
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Vencimento</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Prazo</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReceivables.length === 0 ? (
                      <tr><td colSpan={7}><EmptyState icon={DollarSign} title="Nenhuma conta a receber" description="As contas a receber aparecerão aqui conforme forem cadastradas." /></td></tr>
                    ) : filteredReceivables.map((receivable) => (
                      <tr key={receivable.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{receivable.description}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {receivable.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{receivable.value}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{receivable.dueDate}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{receivable.days}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(receivable.status)}`}>
                            {getStatusLabel(receivable.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {receivable.status === 'pending' && (
                              <button className="px-3 py-1 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                Confirmar Recebimento
                              </button>
                            )}
                            <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Contas a Pagar Tab */}
          {activeTab === 'payables' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar contas..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Todas as categorias</option>
                    <option value="comissao">Comissão</option>
                    <option value="fixo">Fixo</option>
                    <option value="variavel">Variável</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowPayableModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Nova Conta a Pagar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Fornecedor</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Vencimento</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPayables.length === 0 ? (
                      <tr><td colSpan={7}><EmptyState icon={DollarSign} title="Nenhuma conta a pagar" description="As contas a pagar aparecerão aqui conforme forem cadastradas." /></td></tr>
                    ) : filteredPayables.map((payable) => (
                      <tr key={payable.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{payable.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payable.supplier}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            payable.category === 'Comissão' ? 'bg-purple-100 text-purple-700' :
                            payable.category === 'Fixo' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {payable.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{payable.value}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payable.dueDate}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(payable.status)}`}>
                            {getStatusLabel(payable.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {payable.status === 'pending' && (
                              <button className="px-3 py-1 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                Pagar
                              </button>
                            )}
                            <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagamentos Tab */}
          {activeTab === 'payments' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por paciente ou CPF..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-80"
                    />
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Todas as formas</option>
                    <option value="pix">Pix</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="convenio">Convênio</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Pagamento
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Paciente</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">CPF</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Procedimento</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Data</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Forma de Pagamento</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPayments.length === 0 ? (
                      <tr><td colSpan={8}><EmptyState icon={CreditCard} title="Nenhum pagamento registrado" description="Os pagamentos de consultas aparecerão aqui conforme forem registrados." /></td></tr>
                    ) : filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{payment.patient}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payment.cpf}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payment.procedure}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{payment.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{payment.value}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                            <CreditCard className="w-3 h-3" />
                            {payment.method}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Receipt className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comissionamento Tab */}
          {activeTab === 'commissions' && (
            <div>
              <div className="p-4 bg-purple-50 border-b border-purple-200">
                <p className="text-sm text-gray-900 mb-1">Gestão de Comissionamento Médico</p>
                <p className="text-xs text-gray-600">
                  Cálculo automático de repasse com regras personalizadas por profissional e procedimento
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Profissional</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">CRM</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Período</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Procedimentos</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor Bruto</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">% Comissão</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor Repasse</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {commissions.length === 0 ? (
                      <tr><td colSpan={9}><EmptyState icon={DollarSign} title="Nenhuma comissão registrada" description="As comissões são calculadas com base nos honorários do Relatório Financeiro por Médico." /></td></tr>
                    ) : commissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{commission.doctor}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{commission.crm}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{commission.period}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{commission.procedures}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{commission.gross}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{commission.commission}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{commission.value}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(commission.status)}`}>
                            {getStatusLabel(commission.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {commission.status === 'pending' && (
                              <button className="px-3 py-1 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                Aprovar Pagamento
                              </button>
                            )}
                            <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fluxo de Caixa Tab */}
          {activeTab === 'cashflow' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    Fluxo de Caixa — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{cashflowWithBalance.length} movimentação(ões)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Data</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Descrição</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Categoria</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cashflowWithBalance.length === 0 ? (
                      <tr><td colSpan={6}><EmptyState icon={DollarSign} title="Nenhuma movimentação registrada" description="O fluxo de caixa será exibido conforme pagamentos e despesas forem registrados." /></td></tr>
                    ) : cashflowWithBalance.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {transaction.date ? new Date(transaction.date).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{transaction.desc}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {transaction.type === 'entrada' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                            transaction.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {transaction.type === 'entrada' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {transaction.type === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-medium ${transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'entrada' ? '+' : '-'} R$ {transaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          R$ {transaction.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gestão de Glosas Tab */}
          {activeTab === 'glosas' && (
            <div>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar glosas..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">Todos os status</option>
                    <option value="pending">Pendente</option>
                    <option value="contested">Contestado</option>
                    <option value="resolved">Resolvido</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowGlosaModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Glosa
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Convênio</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Paciente</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Procedimento</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Data</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Valor</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Motivo</th>
                      <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {glosas.length === 0 ? (
                      <tr><td colSpan={8}><EmptyState icon={FileText} title="Nenhuma glosa registrada" description="As glosas de convênios aparecerão aqui para contestação e acompanhamento." /></td></tr>
                    ) : glosas.map((glosa) => (
                      <tr key={glosa.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {glosa.insurance}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{glosa.patient}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{glosa.procedure}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{glosa.date}</td>
                        <td className="px-6 py-4 text-sm text-orange-600">{glosa.value}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{glosa.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(glosa.status)}`}>
                            {getStatusLabel(glosa.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {glosa.status === 'pending' && (
                              <button className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                Contestar
                              </button>
                            )}
                            <button className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Novo Faturamento TISS</h3>
              <button onClick={() => setShowBillingModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Convênio *</label>
                  <select
                    value={billingForm.insurance || ''}
                    onChange={e => setBillingForm({ ...billingForm, insurance: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {insurances.length > 0
                      ? insurances.map(i => <option key={i.id} value={i.name}>{i.name}</option>)
                      : <option disabled>Nenhum convênio cadastrado</option>
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Paciente</label>
                  <select
                    value={billingForm.patient || ''}
                    onChange={e => setBillingForm({ ...billingForm, patient: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {patients.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Data *</label>
                  <input
                    type="date"
                    value={billingForm.date || ''}
                    onChange={e => setBillingForm({ ...billingForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Nº de Procedimentos</label>
                  <input
                    type="number"
                    value={billingForm.items || ''}
                    onChange={e => setBillingForm({ ...billingForm, items: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                    min={1}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Valor Total (R$) *</label>
                <input
                  type="number"
                  value={billingForm.amount || ''}
                  onChange={e => setBillingForm({ ...billingForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Status</label>
                <select
                  value={billingForm.status || 'pending'}
                  onChange={e => setBillingForm({ ...billingForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pendente</option>
                  <option value="sent">Enviado</option>
                  <option value="paid">Pago</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowBillingModal(false); setBillingForm({ status: 'pending', insurance: '', patient: '' }); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBilling}
                disabled={!billingForm.insurance || !billingForm.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Gerar Faturamento
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Registrar Pagamento</h3>
              <button onClick={() => { setShowPaymentModal(false); setPaymentForm({ status: 'pending', method: 'pix', type: 'Consulta' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Paciente *</label>
                <select
                  value={paymentForm.patient || ''}
                  onChange={e => setPaymentForm({ ...paymentForm, patient: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.name}>{p.name}{p.cpf ? ` — ${p.cpf}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Tipo / Procedimento *</label>
                  <select
                    value={paymentForm.type || 'Consulta'}
                    onChange={e => setPaymentForm({ ...paymentForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Consulta">Consulta</option>
                    <option value="Exame">Exame</option>
                    <option value="Procedimento">Procedimento</option>
                    <option value="Telemedicina">Telemedicina</option>
                    <option value="Retorno">Retorno</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={paymentForm.amount || ''}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Forma de Pagamento *</label>
                  <select
                    value={paymentForm.method || 'pix'}
                    onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pix">PIX</option>
                    <option value="credito">Cartão de Crédito</option>
                    <option value="debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="convenio">Convênio</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Data do Pagamento *</label>
                  <input
                    type="date"
                    value={paymentForm.date || new Date().toISOString().split('T')[0]}
                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Status</label>
                <select
                  value={paymentForm.status || 'pending'}
                  onChange={e => setPaymentForm({ ...paymentForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="received">Recebido</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Vencido</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentForm({ status: 'pending', method: 'pix', type: 'Consulta' }); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPayment}
                disabled={!paymentForm.patient || !paymentForm.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceivableModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Nova Conta a Receber</h3>
              <button onClick={() => { setShowReceivableModal(false); setReceivableForm({ status: 'pending' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Paciente / Devedor *</label>
                <select
                  value={receivableForm.patient || ''}
                  onChange={e => setReceivableForm({ ...receivableForm, patient: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  value={receivableForm.description || ''}
                  onChange={e => setReceivableForm({ ...receivableForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Faturamento Unimed — Janeiro/2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={receivableForm.amount || ''}
                    onChange={e => setReceivableForm({ ...receivableForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={receivableForm.dueDate || ''}
                    onChange={e => setReceivableForm({ ...receivableForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Status</label>
                <select
                  value={receivableForm.status || 'pending'}
                  onChange={e => setReceivableForm({ ...receivableForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pendente</option>
                  <option value="received">Recebido</option>
                  <option value="overdue">Vencido</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowReceivableModal(false); setReceivableForm({ status: 'pending' }); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddReceivable}
                disabled={!receivableForm.patient || !receivableForm.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Conta a Receber
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayableModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Nova Conta a Pagar</h3>
              <button onClick={() => { setShowPayableModal(false); setPayableForm({ status: 'pending' }); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Fornecedor / Credor *</label>
                <input
                  type="text"
                  value={payableForm.supplier || ''}
                  onChange={e => setPayableForm({ ...payableForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do fornecedor ou credor"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  value={payableForm.description || ''}
                  onChange={e => setPayableForm({ ...payableForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Aluguel da clínica, fornecedor de materiais..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={payableForm.amount || ''}
                    onChange={e => setPayableForm({ ...payableForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Data de Vencimento *</label>
                  <input
                    type="date"
                    value={payableForm.dueDate || ''}
                    onChange={e => setPayableForm({ ...payableForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Status</label>
                <select
                  value={payableForm.status || 'pending'}
                  onChange={e => setPayableForm({ ...payableForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                  <option value="overdue">Vencido</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowPayableModal(false); setPayableForm({ status: 'pending' }); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPayable}
                disabled={!payableForm.supplier || !payableForm.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Salvar Conta a Pagar
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlosaModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">Registrar Glosa</h3>
              <button onClick={() => setShowGlosaModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Convênio *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    <option value="unimed">Unimed</option>
                    <option value="bradesco">Bradesco Saúde</option>
                    <option value="amil">Amil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Paciente *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do paciente"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Procedimento *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Consulta Cardiologia"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Valor *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Motivo da Glosa *</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  <option value="codigo">Código TUSS incorreto</option>
                  <option value="autorizacao">Falta de autorização prévia</option>
                  <option value="prazo">Prazo de validade expirado</option>
                  <option value="documentacao">Documentação incompleta</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Observações</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalhes adicionais sobre a glosa..."
                ></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowGlosaModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowGlosaModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Registrar Glosa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
