import { useState } from 'react';
import { Clock, User, Calendar, FileText, DollarSign, Eye, X, Shield, Package, Activity } from 'lucide-react';
import { useApp } from './AppContext';
import type { AuditEntry } from './AppContext';

interface RecentActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string, data?: any) => void;
}

function getTypeFromModule(entry: AuditEntry): 'patient' | 'appointment' | 'record' | 'financial' | 'security' | 'stock' | 'other' {
  const mod = entry.module.toLowerCase();
  if (mod.includes('paciente')) return 'patient';
  if (mod.includes('agenda') || mod.includes('consulta') || mod.includes('telemedicina')) return 'appointment';
  if (mod.includes('prontuário') || mod.includes('prontuario') || mod.includes('exame')) return 'record';
  if (mod.includes('financeiro') || mod.includes('pagamento')) return 'financial';
  if (mod.includes('segurança') || mod.includes('usuário') || mod.includes('auth') || mod.includes('login')) return 'security';
  if (mod.includes('estoque')) return 'stock';
  return 'other';
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'patient': return User;
    case 'appointment': return Calendar;
    case 'record': return FileText;
    case 'financial': return DollarSign;
    case 'security': return Shield;
    case 'stock': return Package;
    default: return Activity;
  }
}

function getCategoryColor(type: string) {
  switch (type) {
    case 'patient': return 'bg-pink-50 text-pink-600';
    case 'appointment': return 'bg-green-50 text-green-600';
    case 'record': return 'bg-purple-50 text-purple-600';
    case 'financial': return 'bg-emerald-50 text-emerald-600';
    case 'security': return 'bg-red-50 text-red-600';
    case 'stock': return 'bg-orange-50 text-orange-600';
    default: return 'bg-gray-50 text-gray-600';
  }
}

function getNavigationTarget(type: string): string {
  switch (type) {
    case 'patient': return 'patients';
    case 'appointment': return 'schedule';
    case 'record': return 'records';
    case 'financial': return 'financial';
    case 'stock': return 'stock';
    default: return 'dashboard';
  }
}

export function RecentActions({ isOpen, onClose, onNavigate }: RecentActionsProps) {
  const { auditLog, currentUser } = useApp();

  // Last 30 entries for the current user (or all if showing global log)
  const recentActions = auditLog
    .filter(e => !currentUser || e.user === currentUser.name)
    .slice(0, 30);

  const handleActionClick = (entry: AuditEntry) => {
    const type = getTypeFromModule(entry);
    onNavigate(getNavigationTarget(type));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-16 right-4 w-full max-w-sm z-50 animate-scale-in">
        <div className="bg-white border border-gray-200 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">Ações Recentes</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Actions List */}
          <div className="max-h-[500px] overflow-y-auto">
            {recentActions.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhuma ação recente</p>
                <p className="text-xs text-gray-400 mt-1">Suas ações recentes aparecerão aqui</p>
              </div>
            ) : (
              recentActions.map((entry) => {
                const type = getTypeFromModule(entry);
                const Icon = getTypeIcon(type);
                return (
                  <button
                    key={entry.id}
                    onClick={() => handleActionClick(entry)}
                    className="w-full flex items-start gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className={`p-2 flex-shrink-0 ${getCategoryColor(type)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{entry.module}</p>
                      <p className="text-xs text-gray-500 truncate">{entry.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{entry.timestamp}</p>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
            <button
              onClick={() => { onNavigate('audit'); onClose(); }}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              Ver Histórico Completo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
