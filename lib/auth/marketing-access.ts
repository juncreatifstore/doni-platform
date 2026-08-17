import type {SafeUser} from '@/lib/auth/session';

export function canAccessMarketing(user:Pick<SafeUser,'role'|'department'>){
  return user.role!=='AGENT'||user.department==='MARKETING';
}

export function canAdminMarketing(user:Pick<SafeUser,'role'>){
  return user.role==='ADMIN'||user.role==='SUPER_ADMIN';
}
