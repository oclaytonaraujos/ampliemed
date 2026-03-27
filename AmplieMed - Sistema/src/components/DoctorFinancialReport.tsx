import { useState } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Calendar, Download, Printer, 
  Filter, X, FileText, BarChart, PieChart, CheckCircle, Clock, AlertCircle,
  Stethoscope, Building
} from 'lucide-react';
import type { UserRole } from '../App';
import { toastSuccess, toastInfo } from '../utils/toastService';
import { exportToPDF, exportToCSV } from '../utils/exportService';
import { useApp } from './AppContext';
import { calculateDoctorHonorarium, calculateTotalEarnings, calculateMarginPercentage, getPaymentModelLabel, isPaymentModelConfigured } from '../utils/financialCalculations';

interface DoctorFinancialReportProps {
  userRole: UserRole;
}

interface ConsultationRecord {
  id: string;
  date: string;
  patientName: string;
  doctorId: string;
  clinicId: string;
  tussCode: string;
  procedureName: string;
  value: number;
  paymentStatus: 'pago' | 'pendente' | 'cancelado';
}

export function DoctorFinancialReport({ userRole }: DoctorFinancialReportProps) {
  const { appointments, addAuditEntry, currentUser, professionals, clinicSettings } = useApp();
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showFilters, setShowFilters] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Map appointments → ConsultationRecord format (real data from context)
  const consultationRecords: ConsultationRecord[] = appointments
    .filter(a => a.status === 'realizado' || a.paymentStatus === 'pago')
    .map(a => {
      const doctorMatch = professionals.find(d => d.name === a.doctorName);
      return {
        id: a.id,
        date: a.date,
        patientName: a.patientName,
        doctorId: doctorMatch?.id || a.doctorName,
        clinicId: selectedClinicId || '',
        // ✅ Real tussCode from appointment (migration 20260317000002)
        tussCode: a.tussCode || '',
        procedureName: `Consulta — ${a.specialty}`,
        value: a.consultationValue || 0,
        paymentStatus: (a.paymentStatus === 'pago' ? 'pago' : 'pendente') as 'pago' | 'pendente' | 'cancelado',
      };
    });

  // Filtra registros
  const filteredRecords = consultationRecords.filter(record => {
    const matchesDoctor = !selectedDoctorId || record.doctorId === selectedDoctorId;
    const matchesClinic = !selectedClinicId || record.clinicId === selectedClinicId;
    const recordDate = record.date.slice(0, 7); // YYYY-MM
    const matchesMonth = recordDate === selectedMonth;
    return matchesDoctor && matchesClinic && matchesMonth;
  });

  // Calcula totais
  const totalBilled = filteredRecords.reduce((sum, r) => sum + r.value, 0);
  const totalPaid = filteredRecords.filter(r => r.paymentStatus === 'pago').reduce((sum, r) => sum + r.value, 0);
  const totalPending = filteredRecords.filter(r => r.paymentStatus === 'pendente').reduce((sum, r) => sum + r.value, 0);
  const totalCanceled = filteredRecords.filter(r => r.paymentStatus === 'cancelado').reduce((sum, r) => sum + r.value, 0);

  // Calcula honorários por médico usando dados REAIS (não mock)
  const calculateDoctorEarnings = (doctorId: string, records: ConsultationRecord[]) => {
    const doctor = professionals.find(doc => doc.id === doctorId);
    if (!doctor) return 0;

    const doctorRecords = records.filter(r => r.doctorId === doctorId && r.paymentStatus === 'pago');
    let totalHonorarium = 0;

    doctorRecords.forEach(record => {
      const honorarium = calculateDoctorHonorarium(doctor, record.tussCode, record.value);
      totalHonorarium += honorarium;
    });

    // Adiciona salário fixo para modelos fixo ou misto
    if (doctor.paymentModel === 'fixed' || doctor.paymentModel === 'mixed') {
      totalHonorarium += doctor.fixedSalary || 0;
    }

    return totalHonorarium;
  };

  // Agrupa por médico - FILTRA APENAS DOCTORS
  const doctorsSummary = professionals
    .filter(p => p.role === 'doctor')
    .filter(doc => {
      if (selectedDoctorId && doc.id !== selectedDoctorId) return false;
      const hasRecords = filteredRecords.some(r => r.doctorId === doc.id);
      return hasRecords || selectedDoctorId === doc.id;
    })
    .map(doctor => {
      const doctorRecords = filteredRecords.filter(r => r.doctorId === doctor.id);
      const paidRecords = doctorRecords.filter(r => r.paymentStatus === 'pago');
      const totalRevenue = doctorRecords.reduce((sum, r) => sum + r.value, 0);
      const totalHonorarium = calculateDoctorEarnings(doctor.id, filteredRecords);
      const clinicMargin = totalRevenue - totalHonorarium;
      const marginPercentage = calculateMarginPercentage(totalRevenue, totalHonorarium);
      const paymentModelLabel = getPaymentModelLabel(doctor.paymentModel);

      const paymentConfigured = isPaymentModelConfigured(doctor);

      return {
        doctor,
        consultationsCount: doctorRecords.length,
        paidConsultations: paidRecords.length,
        totalRevenue,
        totalHonorarium,
        clinicMargin,
        marginPercentage,
        paymentModelLabel,
        paymentConfigured,
      };
    });

  const handleExportPDF = () => {
    toastInfo('Exportação PDF', { description: 'Relatório financeiro exportado via PDF.' });
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    toastInfo('Exportação CSV', { description: 'Relatório financeiro exportado via CSV.' });
    exportToCSV(filteredRecords, 'relatorio_financiero_medicos.csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relatório Financeiro por Médico</h2>
          <p className="text-sm text-gray-600 mt-1">
            Análise de produtividade, honorários e margens de contribuição
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white hover:bg-pink-700"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Médico</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-pink-600"
              >
                <option value="">Todos os médicos</option>
                {professionals.filter(p => p.role === 'doctor').map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} - CRM: {doc.crm}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Clínica</label>
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-pink-600"
              >
                <option value="">Todas as clínicas</option>
                {clinicSettings.clinicName && (
                  <option value={clinicSettings.clinicName}>{clinicSettings.clinicName}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mês/Ano</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 bg-white focus:outline-none focus:border-pink-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-pink-50 border border-pink-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-pink-600" />
            <TrendingUp className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-sm text-pink-700">Faturamento Total</p>
          <p className="text-2xl font-bold text-pink-900">
            R$ {totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-green-700">Recebido</p>
          <p className="text-2xl font-bold text-green-900">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-sm text-yellow-700">Pendente</p>
          <p className="text-2xl font-bold text-yellow-900">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-red-700">Cancelado</p>
          <p className="text-2xl font-bold text-red-900">
            R$ {totalCanceled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Warning: doctors with unconfigured payment models */}
      {doctorsSummary.some(s => !s.paymentConfigured) && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 p-4">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-900">Modelo de pagamento não configurado</p>
            <p className="text-xs text-orange-700 mt-1">
              {doctorsSummary.filter(s => !s.paymentConfigured).map(s => s.doctor.name).join(', ')} não possui
              percentual ou modelo de pagamento configurado. Os honorários aparecem como "não configurado".
              Configure em <strong>Gestão de Médicos → Editar → Modelo de Pagamento</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Médicos */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-900">Detalhamento por Médico</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Médico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">CRM</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700">Consultas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Faturamento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Honorários</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Margem Clínica</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700">% Margem</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700">Modelo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {doctorsSummary.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Nenhum registro encontrado para o período selecionado
                  </td>
                </tr>
              ) : (
                doctorsSummary.map((summary) => (
                  <tr key={summary.doctor.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{summary.doctor.name}</p>
                          <p className="text-xs text-gray-500">{summary.doctor.specialty}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {summary.doctor.crm}/{summary.doctor.crmUf}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm font-medium text-gray-900">{summary.consultationsCount}</div>
                      <div className="text-xs text-gray-500">{summary.paidConsultations} pagas</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {!summary.paymentConfigured ? (
                        <span className="text-orange-500 text-xs">— não configurado</span>
                      ) : (
                        <span className="text-pink-600">
                          R$ {summary.totalHonorarium.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                      {!summary.paymentConfigured ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <span>R$ {summary.clinicMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!summary.paymentConfigured ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          sem config.
                        </span>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium ${
                          summary.marginPercentage >= 50 ? 'bg-green-100 text-green-800 border border-green-300' :
                          summary.marginPercentage >= 30 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {summary.marginPercentage.toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      <span className={!summary.doctor.paymentModel ? 'text-orange-500' : ''}>
                        {summary.paymentModelLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {doctorsSummary.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr className="font-bold">
                  <td colSpan={2} className="px-4 py-3 text-gray-900">TOTAL</td>
                  <td className="px-4 py-3 text-center text-gray-900">
                    {doctorsSummary.reduce((sum, s) => sum + s.consultationsCount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    R$ {doctorsSummary.reduce((sum, s) => sum + s.totalRevenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-pink-600">
                    R$ {doctorsSummary.reduce((sum, s) => sum + s.totalHonorarium, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    R$ {doctorsSummary.reduce((sum, s) => sum + s.clinicMargin, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Detalhamento de Procedimentos */}
      {filteredRecords.length > 0 && (
        <div className="border border-gray-300 bg-white">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-bold text-gray-900">Detalhamento de Procedimentos</h3>
          </div>
          
          <div className="overflow-x-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Médico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Clínica</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Procedimento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredRecords.map(record => {
                  const doctor = professionals.find(p => p.id === record.doctorId);
                  
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">
                        {new Date(record.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-gray-900">{record.patientName}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {doctor?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">
                        {clinicSettings.clinicName || 'Clínica Principal'}
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <p className="text-gray-900">{record.procedureName}</p>
                          {record.tussCode ? (
                            <p className="text-xs text-gray-500">TUSS {record.tussCode}</p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Código TUSS não informado</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        R$ {record.value.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium ${
                          record.paymentStatus === 'pago' ? 'bg-green-100 text-green-800 border border-green-300' :
                          record.paymentStatus === 'pendente' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                          'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {record.paymentStatus === 'pago' ? 'Pago' :
                           record.paymentStatus === 'pendente' ? 'Pendente' : 'Cancelado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}