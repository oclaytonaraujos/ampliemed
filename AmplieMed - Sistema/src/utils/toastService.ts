/**
 * AmplieMed — Toast Service
 * Centraliza todos os feedbacks visuais via Sonner.
 * Importe e use em qualquer módulo: import { toastSuccess, toastError, ... } from '../utils/toastService';
 */

import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ToastOptions = {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

// ─── Helpers genéricos ────────────────────────────────────────────────────────

export const toastSuccess = (message: string, options?: ToastOptions) =>
  toast.success(message, { description: options?.description, duration: options?.duration ?? 3000, action: options?.action });

export const toastError = (message: string, options?: ToastOptions) =>
  toast.error(message, { description: options?.description, duration: options?.duration ?? 5000, action: options?.action });

export const toastWarning = (message: string, options?: ToastOptions) =>
  toast.warning(message, { description: options?.description, duration: options?.duration ?? 4000, action: options?.action });

export const toastInfo = (message: string, options?: ToastOptions) =>
  toast.info(message, { description: options?.description, duration: options?.duration ?? 3500, action: options?.action });

export const toastLoading = (message: string) => toast.loading(message);

export const toastDismiss = (id?: string | number) => toast.dismiss(id);

export function toastPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}

// ─── Toasts médicos contextualizados ──────────────────────────────────────────

export const medicalToast = {
  // Pacientes
  patientCreated: (name: string) => toastSuccess(`Paciente cadastrado`, { description: `${name} foi adicionado com sucesso.` }),
  patientUpdated: (name: string) => toastSuccess(`Paciente atualizado`, { description: `Dados de ${name} foram salvos.` }),
  patientDeleted: (name: string) => toastSuccess(`Paciente removido`, { description: `${name} foi excluído do sistema.` }),

  // Agendamentos
  appointmentCreated: (patient: string, time: string) => toastSuccess(`Consulta agendada`, { description: `${patient} — ${time}` }),
  appointmentUpdated: () => toastSuccess(`Agendamento atualizado`),
  appointmentCancelled: (patient: string) => toastWarning(`Consulta cancelada`, { description: `Agendamento de ${patient} foi cancelado.` }),
  appointmentCompleted: (patient: string) => toastSuccess(`Consulta finalizada`, { description: `Atendimento de ${patient} concluído.` }),

  // Pagamentos
  paymentRegistered: (value: number) => toastSuccess(`Pagamento registrado`, { description: `R$ ${value.toFixed(2)} recebido com sucesso.` }),
  paymentPending: (patient: string) => toastWarning(`Pagamento pendente`, { description: `${patient} possui pendência financeira.` }),

  // Prontuários
  recordSaved: (patient: string) => toastSuccess(`Prontuário salvo`, { description: `Registro de ${patient} persistido.` }),
  recordSigned: (patient: string) => toastSuccess(`Prontuário assinado`, { description: `Assinatura digital ICP-Brasil aplicada para ${patient}.` }),

  // Exames
  examRequested: (type: string, patient: string) => toastSuccess(`Exame solicitado`, { description: `${type} para ${patient}.` }),
  examCompleted: (type: string) => toastSuccess(`Exame concluído`, { description: `Resultado de ${type} disponível.` }),

  // Estoque
  stockCritical: (item: string) => toastWarning(`Estoque crítico`, { description: `${item} está abaixo do nível mínimo.`, duration: 6000 }),
  stockExpiring: (item: string, days: number) => toastWarning(`Item vencendo`, { description: `${item} vence em ${days} dias.`, duration: 5000 }),
  stockItemAdded: (item: string) => toastSuccess(`Item adicionado ao estoque`, { description: item }),
  stockItemUpdated: (item: string) => toastSuccess(`Estoque atualizado`, { description: item }),

  // Interações medicamentosas
  drugInteractionWarning: (drug1: string, drug2: string) => toastWarning(`⚠ Interação medicamentosa`, { description: `${drug1} + ${drug2} — verifique antes de prescrever.`, duration: 8000 }),
  drugInteractionSevere: (drug1: string, drug2: string) => toastError(`🚨 Interação GRAVE`, { description: `${drug1} + ${drug2} — interação perigosa detectada!`, duration: 10000 }),

  // Documentos
  documentGenerated: (type: string) => toastSuccess(`${type} gerado`, { description: 'Arquivo disponível para download.' }),
  documentSigned: () => toastSuccess(`Documento assinado`, { description: 'Assinatura digital ICP-Brasil aplicada.' }),

  // Telemedicina
  teleconsultStarted: (patient: string) => toastInfo(`Teleconsulta iniciada`, { description: `Sessão com ${patient} em andamento.` }),
  teleconsultEnded: (patient: string) => toastSuccess(`Teleconsulta encerrada`, { description: `Sessão com ${patient} finalizada.` }),

  // Sistema
  backupCreated: () => toastSuccess(`Backup realizado`, { description: 'Dados exportados com sucesso.' }),
  backupRestored: () => toastSuccess(`Backup restaurado`, { description: 'Dados importados com sucesso. Recarregue a página.' }),
  exportSuccess: (filename: string) => toastSuccess(`Arquivo exportado`, { description: filename }),
  importSuccess: (count: number, entity: string) => toastSuccess(`Importação concluída`, { description: `${count} ${entity} importados com sucesso.` }),
  settingsSaved: () => toastSuccess(`Configurações salvas`),
  permissionDenied: (action: string) => toastError(`Acesso negado`, { description: `Você não tem permissão para ${action}.` }),
};