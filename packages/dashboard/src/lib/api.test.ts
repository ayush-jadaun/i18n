import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

beforeEach(() => {
  // Reset token between tests
  api.clearToken();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('api.login', () => {
  it('POSTs to /auth/login with credentials and returns token', async () => {
    const payload = { token: 'jwt-abc', user: { id: '1', email: 'a@b.com', name: 'Alice' } };
    global.fetch = mockFetch(payload);

    const result = await api.login('a@b.com', 'secret');

    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/auth/login');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.com', password: 'secret' });
    expect(result).toEqual(payload);
  });

  it('throws when the server returns a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(api.login('bad@example.com', 'wrong')).rejects.toThrow('Unauthorized');
  });
});

describe('api.register', () => {
  it('POSTs to /auth/register with user data', async () => {
    const payload = { token: 'jwt-xyz', user: { id: '2', email: 'b@b.com', name: 'Bob' } };
    global.fetch = mockFetch(payload);

    const result = await api.register({ email: 'b@b.com', name: 'Bob', password: 'pw123456' });

    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/auth/register');
    expect(opts.method).toBe('POST');
    expect(result).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

describe('api.setToken / isAuthenticated', () => {
  it('returns false before a token is set', () => {
    expect(api.isAuthenticated()).toBe(false);
  });

  it('returns true after setToken is called', () => {
    api.setToken('my-token');
    expect(api.isAuthenticated()).toBe(true);
  });

  it('returns false after clearToken is called', () => {
    api.setToken('my-token');
    api.clearToken();
    expect(api.isAuthenticated()).toBe(false);
  });

  it('attaches Authorization header when a token is set', async () => {
    api.setToken('bearer-token');
    global.fetch = mockFetch([]);

    await api.listOrgs();

    const [, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer bearer-token');
  });
});

// ---------------------------------------------------------------------------
// Orgs
// ---------------------------------------------------------------------------

describe('api.listOrgs', () => {
  it('GETs /orgs', async () => {
    const orgs = [{ id: '1', name: 'Acme', slug: 'acme', createdAt: '2025-01-01' }];
    global.fetch = mockFetch(orgs);

    const result = await api.listOrgs();

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/orgs');
    expect(result).toEqual(orgs);
  });
});

describe('api.createOrg', () => {
  it('POSTs to /orgs with org data', async () => {
    const org = { id: '2', name: 'Beta', slug: 'beta', createdAt: '2025-01-01' };
    global.fetch = mockFetch(org);

    const result = await api.createOrg({ name: 'Beta', slug: 'beta' });

    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/orgs');
    expect(opts.method).toBe('POST');
    expect(result).toEqual(org);
  });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

describe('api.listProjects', () => {
  it('GETs /orgs/:orgId/projects', async () => {
    global.fetch = mockFetch([]);

    await api.listProjects('org-1');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/orgs/org-1/projects');
  });
});

describe('api.getProject', () => {
  it('GETs /projects/:projectId', async () => {
    const project = {
      id: 'p1',
      name: 'App',
      slug: 'app',
      locales: ['en', 'fr'],
      defaultLocale: 'en',
      orgId: 'o1',
      createdAt: '2025-01-01',
    };
    global.fetch = mockFetch(project);

    const result = await api.getProject('p1');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/projects/p1');
    expect(result).toEqual(project);
  });
});

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

describe('api.getTranslations', () => {
  it('GETs /projects/:projectId/translations/:locale', async () => {
    global.fetch = mockFetch([]);

    await api.getTranslations('p1', 'fr');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/projects/p1/translations/fr');
  });
});

describe('api.updateTranslation', () => {
  it('PUTs to the correct endpoint', async () => {
    const translation = { id: 't1', keyId: 'k1', locale: 'fr', value: 'Bonjour', status: 'draft', updatedAt: '2025-01-01' };
    global.fetch = mockFetch(translation);

    const result = await api.updateTranslation('p1', 'fr', 'k1', { value: 'Bonjour' });

    const [url, opts] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/projects/p1/translations/fr/k1');
    expect(opts.method).toBe('PUT');
    expect(result).toEqual(translation);
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe('api.getProjectStats', () => {
  it('GETs /projects/:projectId/stats', async () => {
    global.fetch = mockFetch({ totalKeys: 10, locales: {} });

    await api.getProjectStats('p1');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/projects/p1/stats');
  });
});

// ---------------------------------------------------------------------------
// Export URL helper
// ---------------------------------------------------------------------------

describe('api.getExportUrl', () => {
  it('constructs the correct export URL', () => {
    const url = api.getExportUrl('p1', 'de', 'yaml');
    expect(url).toContain('/projects/p1/export');
    expect(url).toContain('locale=de');
    expect(url).toContain('format=yaml');
  });

  it('defaults to json format', () => {
    const url = api.getExportUrl('p1', 'en');
    expect(url).toContain('format=json');
  });
});
