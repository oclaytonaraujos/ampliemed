import { useState } from 'react';
import { FileText, Download, Calendar, DollarSign, Users, Activity, TrendingUp, TrendingDown, BarChart3, PieChart, Stethoscope } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserRole } from '../App';
import { EmptyState } from './EmptyState';
import { useApp } from './AppContext';
import { exportToCSV, exportToPDF } from '../utils/exportService';
import { toastSuccess } from '../utils/toastService';
import { DoctorFinancialReport } from './DoctorFinancialReport';

interface ReportsModuleProps {
  userRole: UserRole;
}

export function ReportsModule({ userRole }: ReportsModuleProps) {
  const { appointments, patients, exams, stockItems, financialPayments, financialReceivables, financialPayables, medicalRecords, addAuditEntry, currentUser } = useApp();
  const [reportType, setReportType] = useState<'financial' | 'operational' | 'clinical' | 'doctor'>('financial');
  const now = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  });
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  // ── Financial KPIs from real data ─────────────────────────────────────────
  const totalRevenue = financialPayments.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = financialPayables.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const totalReceivables = financialReceivables.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);

  // Revenue by payment method
  const methodMap: Record<string, number> = {};
  financialPayments.filter(p => p.status === 'received').forEach(p => { methodMap[p.method] = (methodMap[p.method] || 0) + p.amount; });
  const paymentMethodsData = Object.entries(methodMap).map(([name, value], index) => ({ 
    id: `payment-method-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`, 
    name, 
    value 
  }));

  // ── Operational KPIs ──────────────────────────────────────────────────────
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'realizado').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelado').length;
  const occupancyRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

  // Appointments by specialty
  const specialtyMap: Record<string, number> = {};
  appointments.forEach(a => { specialtyMap[a.specialty] = (specialtyMap[a.specialty] || 0) + 1; });
  const specialtiesData = Object.entries(specialtyMap).map(([name, value], index) => ({ 
    id: `specialty-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`, 
    name, 
    value 
  }));

  // Appointments by status (bar chart)
  const appointmentsData = [
    { status: 'Confirmado', value: appointments.filter(a => a.status === 'confirmado').length },
    { status: 'Realizado', value: completedAppointments },
    { status: 'Cancelado', value: cancelledAppointments },
    { status: 'Pendente', value: appointments.filter(a => a.status === 'pendente').length },
  ];

  // ── Clinical KPIs ─────────────────────────────────────────────────────────
  const totalPatients = patients.length;
  const activePatients = patients.filter(p => p.status === 'active').length;
  const totalRecords = medicalRecords.length;
  const signedRecords = medicalRecords.filter(r => r.signed).length;
  const pendingExams = exams.filter(e => e.status === 'solicitado').length;
  const urgentExams = exams.filter(e => e.priority === 'urgente').length;

  // CID-10 distribution from records
  const cid10Map: Record<string, number> = {};
  medicalRecords.filter(r => r.cid10 && r.cid10 !== '-').forEach(r => { const code = r.cid10.split(' - ')[0]; cid10Map[code] = (cid10Map[code] || 0) + 1; });
  const diagnosisData = Object.entries(cid10Map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const handleExport = () => {
    const label = reportType === 'financial' ? 'Financeiro' : reportType === 'operational' ? 'Operacional' : 'Clínico';
    const filename = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}`;

    if (exportFormat === 'csv') {
      let rows: Record<string, unknown>[] = [];
      let cols: { key: string; label: string }[] = [];

      if (reportType === 'financial') {
        rows = [
          { metrica: 'Receita Total', valor: `R$ ${totalRevenue.toFixed(2)}` },
          { metrica: 'Despesas', valor: `R$ ${totalExpenses.toFixed(2)}` },
          { metrica: 'Lucro Líquido', valor: `R$ ${netProfit.toFixed(2)}` },
          { metrica: 'Margem', valor: `${marginPct}%` },
          { metrica: 'A Receber', valor: `R$ ${totalReceivables.toFixed(2)}` },
        ];
        cols = [{ key: 'metrica', label: 'Métrica' }, { key: 'valor', label: 'Valor' }];
      } else if (reportType === 'operational') {
        rows = [
          { metrica: 'Total de Consultas', valor: String(totalAppointments) },
          { metrica: 'Realizadas', valor: String(completedAppointments) },
          { metrica: 'Canceladas', valor: String(cancelledAppointments) },
          { metrica: 'Taxa de Ocupação', valor: `${occupancyRate}%` },
          { metrica: 'Exames Pendentes', valor: String(pendingExams) },
          { metrica: 'Exames Urgentes', valor: String(urgentExams) },
        ];
        cols = [{ key: 'metrica', label: 'Métrica' }, { key: 'valor', label: 'Valor' }];
      } else {
        rows = [
          { metrica: 'Pacientes Ativos', valor: String(activePatients) },
          { metrica: 'Total de Pacientes', valor: String(totalPatients) },
          { metrica: 'Prontuários', valor: String(totalRecords) },
          { metrica: 'Prontuários Assinados', valor: String(signedRecords) },
          { metrica: 'Exames Pendentes', valor: String(pendingExams) },
          { metrica: 'Itens Estoque OK', valor: String(stockItems.filter(s => s.status === 'ok').length) },
          { metrica: 'Itens Críticos', valor: String(stockItems.filter(s => s.status === 'critico').length) },
        ];
        cols = [{ key: 'metrica', label: 'Métrica' }, { key: 'valor', label: 'Valor' }];
      }

      exportToCSV(rows, filename, cols);
    } else {
      // PDF export
      const summaryRows = reportType === 'financial'
        ? [
          { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}` },
          { label: 'Lucro', value: `R$ ${netProfit.toFixed(2)}` },
          { label: 'Margem', value: `${marginPct}%` },
        ]
        : reportType === 'operational'
        ? [
          { label: 'Consultas', value: String(totalAppointments) },
          { label: 'Realizadas', value: String(completedAppointments) },
          { label: 'Ocupação', value: `${occupancyRate}%` },
        ]
        : [
          { label: 'Pacientes', value: String(activePatients) },
          { label: 'Prontuários', value: String(totalRecords) },
          { label: 'Exames Pend.', value: String(pendingExams) },
        ];

      exportToPDF(
        `Relatório ${label}`,
        `Período: ${dateRange.start} a ${dateRange.end}`,
        [{ header: 'Métrica', dataKey: 'metrica' }, { header: 'Valor', dataKey: 'valor' }],
        reportType === 'financial'
          ? [
            { metrica: 'Receita Total', valor: `R$ ${totalRevenue.toFixed(2)}` },
            { metrica: 'Despesas', valor: `R$ ${totalExpenses.toFixed(2)}` },
            { metrica: 'Lucro Líquido', valor: `R$ ${netProfit.toFixed(2)}` },
            { metrica: 'Margem', valor: `${marginPct}%` },
          ]
          : [{ metrica: label, valor: 'Ver CSV para dados completos' }],
        filename,
        summaryRows
      );
    }

    addAuditEntry({ user: currentUser?.name || 'Sistema', userRole: currentUser?.role || 'admin', action: 'export', module: 'Relatórios', description: `Relatório ${label} exportado (${exportFormat.toUpperCase()})`, status: 'success' });
    toastSuccess(`Relatório ${label} exportado!`, { description: `Arquivo ${exportFormat.toUpperCase()} gerado.` });
  };

  const renderFinancialReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-600', sub: `${financialPayments.filter(p => p.status === 'received').length} recebimentos` },
          { label: 'Despesas', value: `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-red-600', sub: `${financialPayables.filter(p => p.status === 'paid').length} pagamentos` },
          { label: 'Lucro Líquido', value: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: netProfit >= 0 ? 'text-blue-600' : 'text-red-600', sub: `Margem: ${marginPct}%` },
          { label: 'A Receber', value: `R$ ${totalReceivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Activity, color: 'text-orange-600', sub: `${financialReceivables.filter(r => r.status === 'pending').length} pendências` },
        ].map(k => { const Icon = k.icon; return (
          <div key={k.label} className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-500">{k.label}</p><Icon className={`w-5 h-5 ${k.color}`} /></div>
            <p className="text-xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-2">{k.sub}</p>
          </div>
        ); })}
      </div>

      {paymentMethodsData.length > 0 ? (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Receita por Forma de Pagamento</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RPieChart>
              <Pie data={paymentMethodsData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {paymentMethodsData.map((entry) => <Cell key={`cell-${entry.id}`} fill={COLORS[paymentMethodsData.indexOf(entry) % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
            </RPieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={DollarSign} title="Sem dados financeiros no período" description="Registre recebimentos e pagamentos para visualizar gráficos financeiros." />
      )}
    </div>
  );

  const renderOperationalReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Consultas', value: totalAppointments, icon: Calendar, color: 'text-blue-600', sub: 'No período' },
          { label: 'Realizadas', value: completedAppointments, icon: Activity, color: 'text-green-600', sub: `Taxa: ${occupancyRate}%` },
          { label: 'Cancelamentos', value: cancelledAppointments, icon: TrendingDown, color: 'text-red-600', sub: `${totalAppointments > 0 ? Math.round(cancelledAppointments / totalAppointments * 100) : 0}% do total` },
          { label: 'Exames Pendentes', value: pendingExams, icon: BarChart3, color: 'text-orange-600', sub: `${urgentExams} urgentes` },
        ].map(k => { const Icon = k.icon; return (
          <div key={k.label} className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-500">{k.label}</p><Icon className={`w-5 h-5 ${k.color}`} /></div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-2">{k.sub}</p>
          </div>
        ); })}
      </div>

      {appointmentsData.some(d => d.value > 0) ? (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Distribuição de Consultas por Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={appointmentsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" name="Consultas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState icon={Calendar} title="Sem consultas no período" description="Agende e realize consultas para ver gráficos operacionais." /> }

      {specialtiesData.length > 0 && (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Distribuição por Especialidade</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RPieChart>
              <Pie data={specialtiesData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {specialtiesData.map((entry) => <Cell key={`cell-${entry.id}`} fill={COLORS[specialtiesData.indexOf(entry) % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </RPieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  const renderClinicalReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pacientes Ativos', value: activePatients, icon: Users, color: 'text-blue-600', sub: `${totalPatients} total` },
          { label: 'Prontuários', value: totalRecords, icon: FileText, color: 'text-purple-600', sub: `${signedRecords} assinados` },
          { label: 'Exames Realizados', value: exams.filter(e => e.status === 'concluido').length, icon: Activity, color: 'text-green-600', sub: `${pendingExams} pendentes` },
          { label: 'Estoque OK', value: stockItems.filter(s => s.status === 'ok').length, icon: BarChart3, color: 'text-gray-600', sub: `${stockItems.filter(s => s.status === 'critico').length} críticos` },
        ].map(k => { const Icon = k.icon; return (
          <div key={k.label} className="bg-white border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-sm text-gray-500">{k.label}</p><Icon className={`w-5 h-5 ${k.color}`} /></div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-2">{k.sub}</p>
          </div>
        ); })}
      </div>

      {diagnosisData.length > 0 ? (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top 5 Diagnósticos (CID-10)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={diagnosisData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" name="Casos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState icon={Activity} title="Sem diagnósticos registrados" description="Crie prontuários com CID-10 para ver distribuição de diagnósticos." /> }
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatórios Gerenciais</h1>
          <p className="text-sm text-gray-500">Análise completa e exportação de dados</p>
        </div>
        {reportType !== 'doctor' && (
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Exportar Relatório
        </button>
        )}
      </div>

      {/* Report Type Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'financial', label: 'Financeiro', icon: DollarSign },
          { key: 'operational', label: 'Operacional', icon: Calendar },
          { key: 'clinical', label: 'Clínico', icon: Activity },
          { key: 'doctor', label: 'Por Médico', icon: Stethoscope },
        ] as const).map(tab => {
          const Icon = tab.icon;
          const active = reportType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters — hidden for doctor report (has its own) */}
      {reportType !== 'doctor' && (
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
            <select
              value={dateRange.start}
              onChange={(e) => setDateRange({ start: e.target.value, end: dateRange.end })}
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600"
            >
              <option value="2026-01-01">Janeiro 2026</option>
              <option value="2026-02-01">Fevereiro 2026</option>
              <option value="2026-03-01">Março 2026</option>
              <option value="2026-04-01">Abril 2026</option>
              <option value="2026-05-01">Maio 2026</option>
              <option value="2026-06-01">Junho 2026</option>
              <option value="2026-07-01">Julho 2026</option>
              <option value="2026-08-01">Agosto 2026</option>
              <option value="2026-09-01">Setembro 2026</option>
              <option value="2026-10-01">Outubro 2026</option>
              <option value="2026-11-01">Novembro 2026</option>
              <option value="2026-12-01">Dezembro 2026</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Formato de Exportação</label>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-600">
              <option value="pdf">PDF</option>
              <option value="csv">CSV / Excel</option>
            </select>
          </div>
        </div>
      </div>
      )}

      {/* Content */}
      {reportType === 'financial' && renderFinancialReport()}
      {reportType === 'operational' && renderOperationalReport()}
      {reportType === 'clinical' && renderClinicalReport()}
      {reportType === 'doctor' && <DoctorFinancialReport userRole={userRole} />}
    </div>
  );
}