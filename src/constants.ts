import { Squad, JuniorSquad } from '../types';

export const COMPANY_SQUAD_COLORS: Record<Squad, string> = {
  1: 'text-red-600',
  2: 'text-green-600',
  3: 'text-yellow-600',
};

export const JUNIOR_SQUAD_COLORS: Record<JuniorSquad, string> = {
  1: 'text-red-600',
  2: 'text-green-600',
  3: 'text-blue-600',
  4: 'text-yellow-600',
};

export const DB_NAME = 'BBManagerDB';
export const DB_VERSION = 8;
export const PENDING_WRITES_STORE = 'pending_writes';
export const USER_ROLES_STORE = 'user_roles';
export const GLOBAL_AUDIT_LOGS_STORE = 'global_audit_logs';
export const DLQ_STORE = 'dead_letter_queue';