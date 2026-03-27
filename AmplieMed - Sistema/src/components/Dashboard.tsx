import { useState } from 'react';
import { Users, Calendar, DollarSign, Activity, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { UserRole } from '../App';
import { useApp } from './AppContext';

interface DashboardProps {
  userRole: UserRole;
}

export function Dashboard({ userRole }: DashboardProps) {
  const { patients, appointments, exams, stockItems, financialPayments, financialReceivables, financialPayables, medicalRecords, professionals } = useApp();

  const today = new Date().toISOString().split('T')[0];

  // ── Real KPIs derived from context ──────────────────────────────────────────
  const activePatients = patients.filter(p => p.status === 'active').length;
  const todayAppointments = appointments.filter(a => a.date === today);
  const todayCount = todayAppointments.length;
  const confirmedToday = todayAppointments.filter(a => a.status === 'confirmado').length;

  // Monthly revenue from paid appointments
  const now = new Date();
  const monthlyRevenue = appointments
    .filter(a => {
      if (!a.date || a.paymentStatus !== 'pago') return false;
      const d = new Date(a.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, a) => sum + (a.paidAmount || a.consultationValue || 0), 0);

  // Occupancy: confirmed / total today (or 0 if no appointments today)
  const occupancy = todayCount > 0 ? Math.round((confirmedToday / todayCount) * 100) : 0;

  // Extra KPIs
  const totalRevenue = financialPayments.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0);
  const overdueReceivables = financialReceivables.filter(r => r.status === 'overdue').length;
  const criticalStock = stockItems.filter(s => s.status === 'critico' || s.status === 'baixo').length;
  const pendingExams = exams.filter(e => e.status === 'solicitado' || e.status === 'em_andamento').length;
  const signedRecords = medicalRecords.filter(r => r.signed).length;
  const totalRecords = medicalRecords.length;

  // ── Chart data derived from context ─────────────────────────────────────────
  // Build last-6-months revenue array
  const revenueData = (() => {
    const months: { id: string; month: string; receita: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      const id = `month-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const receita = appointments
        .filter(a => {
          if (!a.date || a.paymentStatus !== 'pago') return false;
          const ad = new Date(a.date);
          return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
        })
        .reduce((s, a) => s + (a.paidAmount || a.consultationValue || 0), 0);
      const despesas = financialPayables
        .filter(p => {
          if (!p.dueDate || p.status !== 'paid') return false;
          const pd = new Date(p.dueDate);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((s, p) => s + p.amount, 0);
      months.push({ id, month: label, receita, despesas });
    }
    return months;
  })();

  // Appointments per weekday
  const appointmentsData = (() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days.map((day, index) => ({
      id: `weekday-${index}`,
      day,
      consultas: appointments.filter(a => {
        if (!a.date) return false;
        return new Date(a.date).getDay() === index;
      }).length,
      faltas: appointments.filter(a => {
        if (!a.date) return false;
        return new Date(a.date).getDay() === index && a.status === 'cancelado';
      }).length,
    }));
  })();

  // Specialty distribution
  const specialtyData = (() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      if (a.specialty) counts[a.specialty] = (counts[a.specialty] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      id: name.toLowerCase().replace(/\s+/g, '-'), 
      name, 
      value 
    }));
  })();

  const COLORS = ['#ec4899', '#db2777', '#f472b6', '#be185d', '#f9a8d4', '#9d174d'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Visão geral e métricas em tempo real</p>
      </div>

      {/* KPI Cards — Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: 'kpi-patients', label: 'Pacientes Ativos', value: activePatients, sub: `${patients.length} total`, icon: Users, color: 'bg-pink-600', alert: false },
          { id: 'kpi-appointments', label: 'Consultas Hoje', value: todayCount, sub: `${confirmedToday} confirmadas`, icon: Calendar, color: 'bg-pink-600', alert: false },
          { id: 'kpi-revenue', label: 'Receita Mensal', value: `R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'mês atual', icon: DollarSign, color: 'bg-pink-600', alert: false },
          { id: 'kpi-occupancy', label: 'Taxa de Ocupação', value: `${occupancy}%`, sub: 'hoje', icon: Activity, color: 'bg-pink-600', alert: false },
        ].map(k => { const Icon = k.icon; return (
          <div key={k.id} className="bg-white border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 ${k.color} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div><span className="text-xs text-gray-400">{k.sub}</span></div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{k.value}</p>
            <p className="text-sm text-gray-600">{k.label}</p>
          </div>
        ); })}
      </div>

      {/* KPI Cards — Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { id: 'kpi-records', label: 'Prontuários', value: totalRecords, sub: `${signedRecords} assinados`, icon: CheckCircle, color: 'bg-pink-600', alert: totalRecords > signedRecords },
          { id: 'kpi-exams', label: 'Exames Pendentes', value: pendingExams, sub: `${exams.length} total`, icon: Activity, color: 'bg-pink-600', alert: pendingExams > 0 },
          { id: 'kpi-stock', label: 'Estoque Crítico', value: criticalStock, sub: `${stockItems.length} itens`, icon: TrendingDown, color: 'bg-pink-600', alert: criticalStock > 0 },
          { id: 'kpi-overdue', label: 'A Receber Vencido', value: overdueReceivables, sub: 'contas vencidas', icon: Clock, color: 'bg-pink-600', alert: overdueReceivables > 0 },
        ].map(k => { const Icon = k.icon; return (
          <div key={k.id} className={`bg-white border p-5 ${k.alert ? 'border-orange-200' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 ${k.color} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div><span className="text-xs text-gray-400">{k.sub}</span></div>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{k.value}</p>
            <p className="text-sm text-gray-600">{k.label}</p>
          </div>
        ); })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-gray-900 mb-1">Receitas vs Despesas</h3>
            <p className="text-sm text-gray-600">Últimos 6 meses</p>
          </div>
          {revenueData.every(d => d.receita === 0) ? (
            <div className="flex items-center justify-center h-[280px] text-gray-400">
              <div className="text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sem dados de receita ainda</p>
                <p className="text-xs mt-1 text-gray-300">Agende consultas para ver métricas</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0px' }} />
                <Legend />
                <Area key="area-receita" type="monotone" dataKey="receita" stackId="1" stroke="#ec4899" fill="#ec4899" fillOpacity={0.6} name="Receita" />
                <Area key="area-despesas" type="monotone" dataKey="despesas" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Appointments Chart */}
        <div className="bg-white border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-gray-900 mb-1">Consultas por Dia da Semana</h3>
            <p className="text-sm text-gray-600">Distribuição semanal</p>
          </div>
          {appointments.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-gray-400">
              <div className="text-center">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sem dados de consultas ainda</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={appointmentsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0px' }} />
                <Legend />
                <Bar key="bar-consultas" dataKey="consultas" fill="#ec4899" name="Consultas" />
                <Bar key="bar-faltas" dataKey="faltas" fill="#ef4444" name="Faltas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Specialty Distribution */}
        <div className="bg-white border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-gray-900 mb-1">Distribuição por Especialidade</h3>
            <p className="text-sm text-gray-600">Percentual de consultas</p>
          </div>
          {specialtyData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <div className="text-center">
                <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sem dados de especialidades ainda</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie data={specialtyData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                    {specialtyData.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={COLORS[specialtyData.indexOf(entry) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 pl-4">
                {specialtyData.map((item, index) => (
                  <div key={`legend-${item.id}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-gray-600 flex-1">{item.name}</span>
                    <span className="text-xs text-gray-900 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Today's Appointments List */}
        <div className="bg-white border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-gray-900 mb-1">Consultas de Hoje</h3>
            <p className="text-sm text-gray-600">{todayCount} agendadas</p>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              <div className="text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sem consultas hoje</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {todayAppointments
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(apt => (
                  <div key={apt.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors">
                    <div className="text-xs text-gray-500 w-10 flex-shrink-0">{apt.time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{apt.patientName}</p>
                      <p className="text-xs text-gray-500 truncate">{apt.doctorName}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 flex-shrink-0 ${
                      apt.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                      apt.status === 'pendente' ? 'bg-orange-100 text-orange-700' :
                      apt.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                      'bg-pink-100 text-pink-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}