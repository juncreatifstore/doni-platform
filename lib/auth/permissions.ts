import type { UserRole } from '@prisma/client';

export const ROLE_RANK: Record<UserRole, number> = { AGENT: 1, ADMIN: 2, SUPER_ADMIN: 3 };
export function hasRole(role: UserRole, minimum: UserRole) { return ROLE_RANK[role] >= ROLE_RANK[minimum]; }
export function canManageUsers(role: UserRole) { return role === 'SUPER_ADMIN' || role === 'ADMIN'; }
export function canManageAdmins(role: UserRole) { return role === 'SUPER_ADMIN'; }
