/**
 * AmplieMed — Permissions System
 * Sistema de controle de acesso baseado em roles.
 * Fornece: usePermission() hook, can() function, MODULE_PERMISSIONS matrix
 */

import type { UserRole } from '../App';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'sign' | 'approve';

export type ModuleKey =
  | 'patients' | 'appointments' | 'records' | 'exams' | 'queue'
  | 'financial' | 'stock' | 'reports' | 'communication' | 'telemedicine'
  | 'doctors' | 'professionals' | 'insurance' | 'protocols' | 'templates'
  | 'calculators' | 'settings' | 'access' | 'audit' | 'portal' | 'dashboard';

type PermissionMatrix = Record<UserRole, Partial<Record<ModuleKey, PermissionAction[]>>>;

// ─── Matriz de permissões ─────────────────────────────────────────────────────

export const PERMISSIONS: PermissionMatrix = {
  admin: {
    patients:      ['create', 'read', 'update', 'delete', 'export'],
    appointments:  ['create', 'read', 'update', 'delete', 'export'],
    records:       ['create', 'read', 'update', 'delete', 'export', 'sign'],
    exams:         ['create', 'read', 'update', 'delete', 'export'],
    queue:         ['create', 'read', 'update', 'delete', 'export'],
    financial:     ['create', 'read', 'update', 'delete', 'export'],
    stock:         ['create', 'read', 'update', 'delete', 'export'],
    reports:       ['create', 'read', 'update', 'delete', 'export'],
    communication: ['create', 'read', 'update', 'delete', 'export'],
    telemedicine:  ['create', 'read', 'update', 'delete', 'export'],
    doctors:       ['create', 'read', 'update', 'delete', 'export'],
    professionals: ['create', 'read', 'update', 'delete', 'export'],
    insurance:     ['create', 'read', 'update', 'delete', 'export'],
    protocols:     ['create', 'read', 'update', 'delete', 'approve'],
    templates:     ['create', 'read', 'update', 'delete', 'export'],
    calculators:   ['create', 'read', 'update', 'delete', 'export'],
    settings:      ['create', 'read', 'update', 'delete', 'export'],
    access:        ['create', 'read', 'update', 'delete', 'export'],
    audit:         ['create', 'read', 'update', 'delete', 'export'],
    portal:        ['read'],
    dashboard:     ['read'],
  },
  doctor: {
    patients:      ['create', 'read', 'update', 'export'],
    appointments:  ['create', 'read', 'update'],
    records:       ['create', 'read', 'update', 'sign', 'export'],
    exams:         ['create', 'read', 'update'],
    queue:         ['read', 'update'],
    financial:     ['read'],
    stock:         ['read'],
    reports:       ['read', 'export'],
    communication: ['read'],
    telemedicine:  ['create', 'read', 'update'],
    doctors:       ['read'],
    professionals: ['read'],
    insurance:     ['read'],
    protocols:     ['create', 'read', 'update'],
    templates:     ['create', 'read', 'update', 'delete'],
    calculators:   ['read'],
    settings:      ['read'],
    access:        [],
    audit:         [],
    portal:        ['read'],
    dashboard:     ['read'],
  },
  receptionist: {
    patients:      ['create', 'read', 'update'],
    appointments:  ['create', 'read', 'update', 'delete'],
    records:       [],
    exams:         ['read'],
    queue:         ['create', 'read', 'update'],
    financial:     ['create', 'read', 'update'],
    stock:         ['read'],
    reports:       ['read'],
    communication: ['create', 'read', 'update'],
    telemedicine:  ['read'],
    doctors:       ['read'],
    professionals: ['read'],
    insurance:     ['read'],
    protocols:     ['read'],
    templates:     ['read'],
    calculators:   [],
    settings:      [],
    access:        [],
    audit:         [],
    portal:        ['read'],
    dashboard:     ['read'],
  },
  financial: {
    patients:      ['read'],
    appointments:  ['read'],
    records:       [],
    exams:         ['read'],
    queue:         ['read'],
    financial:     ['create', 'read', 'update', 'delete', 'export'],
    stock:         ['read'],
    reports:       ['read', 'export'],
    communication: ['read'],
    telemedicine:  ['read'],
    doctors:       ['read'],
    professionals: ['read'],
    insurance:     ['create', 'read', 'update', 'delete'],
    protocols:     ['read'],
    templates:     ['read'],
    calculators:   [],
    settings:      [],
    access:        [],
    audit:         ['read', 'export'],
    portal:        [],
    dashboard:     ['read'],
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Verifica se um role tem permissão para realizar uma ação em um módulo.
 */
export function can(role: UserRole, module: ModuleKey, action: PermissionAction): boolean {
  const perms = PERMISSIONS[role]?.[module] ?? [];
  return perms.includes(action);
}

/**
 * Retorna todas as permissões de um role em um módulo.
 */
export function getModulePermissions(role: UserRole, module: ModuleKey): PermissionAction[] {
  return PERMISSIONS[role]?.[module] ?? [];
}

/**
 * Verifica se um role tem acesso (leitura) a um módulo.
 */
export function canAccess(role: UserRole, module: ModuleKey): boolean {
  return can(role, module, 'read');
}

// ─── Menu items por role ─────────────────────────────────────────────────────

export const MENU_BY_ROLE: Record<UserRole, string[]> = {
  admin: [
    'dashboard', 'patients', 'appointments', 'queue', 'records', 'exams', 'telemedicine', 'protocols',
    'doctors', 'professionals', 'insurance',
    'financial', 'reports',
    'stock', 'templates', 'calculators',
    'communication', 'portal',
    'access', 'audit', 'settings',
  ],
  doctor: [
    'dashboard', 'patients', 'appointments', 'queue', 'records', 'exams', 'telemedicine', 'protocols',
    'doctors',
    'reports',
    'templates', 'calculators',
    'portal',
    'settings',
  ],
  receptionist: [
    'dashboard', 'patients', 'appointments', 'queue',
    'financial',
    'communication', 'portal',
    'settings',
  ],
  financial: [
    'dashboard',
    'financial', 'reports',
    'insurance',
    'audit',
  ],
};

// ─── Labels e cores ───────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:        'Administrador',
  doctor:       'Médico',
  receptionist: 'Recepcionista',
  financial:    'Financeiro',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:        'bg-red-100 text-red-700 border-red-200',
  doctor:       'bg-pink-100 text-pink-700 border-pink-200',
  receptionist: 'bg-green-100 text-green-700 border-green-200',
  financial:    'bg-yellow-100 text-yellow-700 border-yellow-200',
};
