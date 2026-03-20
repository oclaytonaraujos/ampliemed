import { ReactNode } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { useApp } from './AppContext';
import { can, canAccess } from '../utils/permissions';
import type { ModuleKey, PermissionAction } from '../utils/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermissionGuardProps {
  module: ModuleKey;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  silent?: boolean; // if true, renders nothing instead of the denied message
}

// ─── Default fallback ─────────────────────────────────────────────────────────

function AccessDenied({ module, action }: { module: string; action?: string }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-6 flex items-start gap-4">
      <div className="w-10 h-10 bg-yellow-100 flex items-center justify-center flex-shrink-0">
        <Lock className="w-5 h-5 text-yellow-700" />
      </div>
      <div>
        <p className="text-sm font-medium text-yellow-900">Acesso restrito</p>
        <p className="text-xs text-yellow-700 mt-1">
          Você não tem permissão para {action ? `"${action}" em ` : 'acessar '}
          <strong>{module}</strong>.
        </p>
        <p className="text-xs text-yellow-600 mt-0.5">
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    </div>
  );
}

// ─── Main Guard ───────────────────────────────────────────────────────────────

export function PermissionGuard({
  module,
  action = 'read',
  children,
  fallback,
  silent = false,
}: PermissionGuardProps) {
  const { currentUser } = useApp();
  const role = currentUser?.role ?? 'receptionist';

  const hasPermission = action === 'read'
    ? canAccess(role, module)
    : can(role, module, action);

  if (!hasPermission) {
    if (silent) return null;
    return fallback ? <>{fallback}</> : <AccessDenied module={module} action={action} />;
  }

  return <>{children}</>;
}

// ─── Button Guard — renders children only if user has permission ───────────────

interface CanProps {
  module: ModuleKey;
  action: PermissionAction;
  children: ReactNode;
}

export function Can({ module, action, children }: CanProps) {
  const { currentUser } = useApp();
  const role = currentUser?.role ?? 'receptionist';
  return can(role, module, action) ? <>{children}</> : null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePermission(module: ModuleKey) {
  const { currentUser } = useApp();
  const role = currentUser?.role ?? 'receptionist';

  return {
    can: (action: PermissionAction) => can(role, module, action),
    canRead: can(role, module, 'read'),
    canCreate: can(role, module, 'create'),
    canUpdate: can(role, module, 'update'),
    canDelete: can(role, module, 'delete'),
    canExport: can(role, module, 'export'),
    canSign: can(role, module, 'sign'),
    canApprove: can(role, module, 'approve'),
  };
}

// ─── Page Guard — full-page access control ─────────────────────────────────────

interface PageGuardProps {
  module: ModuleKey;
  children: ReactNode;
}

export function PageGuard({ module, children }: PageGuardProps) {
  const { currentUser } = useApp();
  const role = currentUser?.role ?? 'receptionist';

  if (!canAccess(role, module)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-20 h-20 bg-red-100 flex items-center justify-center">
          <Lock className="w-10 h-10 text-red-600" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-gray-900 font-semibold mb-2">Acesso não autorizado</h2>
          <p className="text-sm text-gray-500">
            Seu perfil ({role}) não tem permissão para acessar este módulo.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Módulo: <strong>{module}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-4 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Solicite ao administrador a liberação de acesso
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
