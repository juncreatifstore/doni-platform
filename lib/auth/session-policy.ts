import type {OrgRole} from './org-roles';

export type SessionPolicy={lifetimeHours:number;maxConcurrent:number};

const POLICIES:Record<OrgRole,SessionPolicy>={
 SUPER_ADMIN:{lifetimeHours:12,maxConcurrent:2},
 COUNTRY_ADMIN:{lifetimeHours:24,maxConcurrent:2},
 SECTION_MANAGER:{lifetimeHours:72,maxConcurrent:3},
 AGENT:{lifetimeHours:72,maxConcurrent:3},
 PARTNER:{lifetimeHours:24,maxConcurrent:2},
};

export function sessionPolicyForRole(orgRole:OrgRole):SessionPolicy{return POLICIES[orgRole]||POLICIES.AGENT;}
