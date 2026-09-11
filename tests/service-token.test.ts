import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/auth/departments', () => ({ getUserDepartment: vi.fn() }));
vi.mock('@/lib/auth/org-roles', () => ({ getUserOrgRole: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ safeUser: vi.fn() }));
vi.mock('next/headers', () => ({ headers: vi.fn() }));

import { isServiceAccountLogin } from '@/lib/auth/service-token';

const TOKEN = 'a'.repeat(64);

describe('isServiceAccountLogin', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts the service account with the exact token', () => {
    vi.stubEnv('RUNBOOK_TOKEN', TOKEN);
    expect(isServiceAccountLogin('runbook', TOKEN)).toBe(true);
    expect(isServiceAccountLogin('RUNBOOK', TOKEN)).toBe(true);
  });
  it('rejects other users, wrong tokens, and short/unset tokens', () => {
    vi.stubEnv('RUNBOOK_TOKEN', TOKEN);
    expect(isServiceAccountLogin('admin', TOKEN)).toBe(false);
    expect(isServiceAccountLogin('runbook', 'b'.repeat(64))).toBe(false);
    expect(isServiceAccountLogin('runbook', TOKEN.slice(0, 63))).toBe(false);
    vi.stubEnv('RUNBOOK_TOKEN', 'short');
    expect(isServiceAccountLogin('runbook', 'short')).toBe(false);
    vi.stubEnv('RUNBOOK_TOKEN', '');
    expect(isServiceAccountLogin('runbook', '')).toBe(false);
  });
  it('honours RUNBOOK_USERNAME', () => {
    vi.stubEnv('RUNBOOK_TOKEN', TOKEN);
    vi.stubEnv('RUNBOOK_USERNAME', 'ci-bot');
    expect(isServiceAccountLogin('ci-bot', TOKEN)).toBe(true);
    expect(isServiceAccountLogin('runbook', TOKEN)).toBe(false);
  });
});
