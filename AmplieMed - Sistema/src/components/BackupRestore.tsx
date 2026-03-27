import { useState, useRef, useEffect } from 'react';
import {
  Database, Download, Upload, Clock, CheckCircle, AlertTriangle,
  HardDrive, Trash2, RefreshCw, Shield, Info
} from 'lucide-react';
import {
  downloadBackup, restoreBackup, saveAutoBackup,
  getAutoBackupIndex, downloadAutoBackup, getStorageStats,
  type AutoBackupEntry, type AppStateSnapshot
} from '../utils/backupService';
import { toastSuccess, toastError, toastWarning } from '../utils/toastService';
import { useApp } from './AppContext';

// ─── Component ────────────────────────────────────────────────────────────────

export function BackupRestore() {
  const app = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoBackups, setAutoBackups] = useState<AutoBackupEntry[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Build snapshot from AppContext
  const getSnapshot = (): AppStateSnapshot => ({
    patients: app.patients,
    appointments: app.appointments,
    medicalRecords: app.medicalRecords,
    exams: app.exams,
    stockItems: app.stockItems,
    queueEntries: app.queueEntries,
    notifications: app.notifications,
    financialBillings: app.financialBillings,
    financialPayments: app.financialPayments,
    financialReceivables: app.financialReceivables,
    financialPayables: app.financialPayables,
    professionals: app.professionals,
    insurances: app.insurances,
    protocols: app.protocols,
    auditLog: app.auditLog,
    telemedicineSessions: app.telemedicineSessions,
    systemUsers: app.systemUsers,
    appTemplates: app.appTemplates,
    clinicSettings: app.clinicSettings,
  });

  const stats = getStorageStats(getSnapshot());

  useEffect(() => {
    setAutoBackups(getAutoBackupIndex());
  }, []);

  const handleManualBackup = () => {
    try {
      downloadBackup(getSnapshot());
      const now = new Date().toLocaleString('pt-BR');
      setLastBackup(now);
      toastSuccess('Backup realizado', { description: 'Arquivo JSON exportado com sucesso.' });
    } catch (err) {
      toastError('Erro ao criar backup', { description: String(err) });
    }
  };

  const handleAutoBackup = () => {
    try {
      saveAutoBackup(getSnapshot());
      setAutoBackups(getAutoBackupIndex());
      toastSuccess('Auto-backup salvo', { description: 'Snapshot salvo em memória.' });
    } catch (err) {
      toastError('Erro no auto-backup', { description: String(err) });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toastError('Arquivo inválido', { description: 'Selecione um arquivo .json de backup do AmplieMed.' });
      return;
    }
    setPendingFile(file);
    setShowConfirm(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestoreConfirm = async () => {
    if (!pendingFile) return;
    setRestoring(true);
    setShowConfirm(false);

    try {
      const result = await restoreBackup(pendingFile);
      if (result.success && result.data) {
        // Apply restored data to AppContext state
        const e = result.data.entities;
        if (e.patients) app.setPatients(e.patients as any);
        if (e.appointments) app.setAppointments(e.appointments as any);
        if (e.medicalRecords) app.setMedicalRecords(e.medicalRecords as any);
        if (e.exams) app.setExams(e.exams as any);
        if (e.stockItems) app.setStockItems(e.stockItems as any);
        if (e.queueEntries) app.setQueueEntries(e.queueEntries as any);
        if (e.notifications) app.setNotifications(e.notifications as any);
        if (e.financialBillings) app.setFinancialBillings(e.financialBillings as any);
        if (e.financialPayments) app.setFinancialPayments(e.financialPayments as any);
        if (e.financialReceivables) app.setFinancialReceivables(e.financialReceivables as any);
        if (e.financialPayables) app.setFinancialPayables(e.financialPayables as any);
        if (e.professionals) app.setProfessionals(e.professionals as any);
        if (e.insurances) app.setInsurances(e.insurances as any);
        if (e.protocols) app.setProtocols(e.protocols as any);
        if (e.telemedicineSessions) app.setTelemedicineSessions(e.telemedicineSessions as any);
        if (e.systemUsers) app.setSystemUsers(e.systemUsers as any);
        if (e.appTemplates) app.setAppTemplates(e.appTemplates as any);

        toastSuccess('Backup restaurado!', {
          description: `${result.count} registros recuperados. Os dados serão sincronizados automaticamente com o Supabase.`,
          duration: 8000,
        });
      } else {
        toastError('Erro na restauração', { description: result.message });
      }
    } catch (err) {
      toastError('Erro na restauração', { description: String(err) });
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; }
  };

  return (
    <div className="space-y-6">

      {/* Storage stats */}
      <div className="bg-white border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-pink-600" />
          <h3 className="text-sm font-medium text-gray-900">Uso do Armazenamento (Supabase)</h3>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${stats.percentUsed > 80 ? 'bg-red-500' : stats.percentUsed > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.max(stats.percentUsed, 1)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${stats.percentUsed > 80 ? 'text-red-600' : 'text-gray-700'}`}>
            {stats.percentUsed}%
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>Dados em memória: <strong>{stats.usedMB} MB</strong></span>
          <span>Coleções: <strong>{stats.keys}</strong></span>
          <span className="flex items-center gap-1 text-green-700">
            <CheckCircle className="w-3.5 h-3.5" />
            Sincronizado com Supabase
          </span>
        </div>
      </div>

      {/* Backup manual */}
      <div className="bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-900">Backup Manual</h3>
          </div>
          {lastBackup && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              Último backup: {lastBackup}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Exporta todos os dados do sistema em um arquivo JSON para armazenamento externo.
          Inclui pacientes, consultas, prontuários, financeiro e todos os outros módulos.
        </p>
        <button
          onClick={handleManualBackup}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Backup Completo
        </button>
      </div>

      {/* Auto-backup */}
      <div className="bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-pink-600" />
            <h3 className="text-sm font-medium text-gray-900">Auto-Backup (Sessão)</h3>
          </div>
          <button
            onClick={handleAutoBackup}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border border-pink-300 text-pink-700 hover:bg-pink-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Criar agora
          </button>
        </div>
        {autoBackups.length === 0 ? (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 p-3">
            Nenhum auto-backup salvo nesta sessão. Clique em "Criar agora" para salvar um snapshot.
          </div>
        ) : (
          <div className="space-y-2">
            {autoBackups.map(backup => (
              <div key={backup.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100">
                <Clock className="w-4 h-4 text-pink-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800">{formatDate(backup.createdAt)}</p>
                  <p className="text-xs text-gray-500">{backup.records} registros • {formatSize(backup.size)}</p>
                </div>
                <button
                  onClick={() => downloadAutoBackup(backup)}
                  className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 text-gray-600 hover:bg-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore */}
      <div className="bg-white border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-orange-600" />
          <h3 className="text-sm font-medium text-gray-900">Restaurar Backup</h3>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800">
            <strong>Atenção:</strong> A restauração substitui todos os dados atuais pelos dados do backup.
            Os novos dados serão sincronizados automaticamente com o Supabase. Faça um backup atual antes de restaurar.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
          className="flex items-center gap-2 px-4 py-2.5 border border-orange-300 text-orange-700 text-sm hover:bg-orange-50 disabled:opacity-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          {restoring ? 'Restaurando...' : 'Selecionar arquivo de backup (.json)'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* LGPD note */}
      <div className="bg-pink-50 border border-pink-200 p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-pink-900">Conformidade LGPD — Retenção de Dados</p>
          <p className="text-xs text-pink-700 mt-0.5">
            Dados de saúde devem ser retidos por no mínimo 20 anos (CFM). Mantenha backups regulares
            em local seguro. Os dados são persistidos no Supabase com sincronização automática.
          </p>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && pendingFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-medium">Confirmar restauração</h3>
                <p className="text-xs text-gray-500">Arquivo: {pendingFile.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Todos os dados atuais serão substituídos pelos dados do backup. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setPendingFile(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="flex-1 px-4 py-2.5 bg-orange-600 text-white text-sm hover:bg-orange-700"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
