/**
 * API client for the i18n-platform dashboard.
 * Communicates with the backend API server using fetch + Bearer token auth.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/** Response shape from the login endpoint */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/** Organisation record */
export interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

/** Project record */
export interface Project {
  id: string;
  name: string;
  slug: string;
  locales: string[];
  defaultLocale: string;
  orgId: string;
  createdAt: string;
}

/** Translation key record */
export interface TranslationKey {
  id: string;
  key: string;
  namespace: string;
  description?: string;
  projectId: string;
}

/** Translation value for a specific locale */
export interface Translation {
  id: string;
  keyId: string;
  locale: string;
  value: string;
  status: 'draft' | 'review' | 'approved' | 'outdated';
  updatedAt: string;
}

/** Project statistics */
export interface ProjectStats {
  totalKeys: number;
  locales: Record<
    string,
    {
      translated: number;
      approved: number;
      draft: number;
      outdated: number;
      coverage: number;
    }
  >;
}

/** Member record */
export interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: string;
}

class DashboardApi {
  private token: string | null = null;

  /** Set the Bearer token for subsequent requests */
  setToken(token: string) {
    this.token = token;
  }

  /** Clear the stored token (logout) */
  clearToken() {
    this.token = null;
  }

  /** Return whether a token is currently set */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  /** Authenticate with email + password; returns token and user info */
  login(email: string, password: string) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /** Register a new user account */
  register(data: { email: string; name: string; password: string }) {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ---------------------------------------------------------------------------
  // Organisations
  // ---------------------------------------------------------------------------

  /** List all organisations the current user belongs to */
  listOrgs() {
    return this.request<Org[]>('/orgs');
  }

  /** Create a new organisation */
  createOrg(data: { name: string; slug?: string }) {
    return this.request<Org>('/orgs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Get a single organisation by ID */
  getOrg(orgId: string) {
    return this.request<Org>(`/orgs/${orgId}`);
  }

  /** Update an organisation */
  updateOrg(orgId: string, data: Partial<{ name: string; slug: string }>) {
    return this.request<Org>(`/orgs/${orgId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /** List members of an organisation */
  listMembers(orgId: string) {
    return this.request<Member[]>(`/orgs/${orgId}/members`);
  }

  /** Invite a member to an organisation */
  inviteMember(orgId: string, data: { email: string; role: Member['role'] }) {
    return this.request<Member>(`/orgs/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Remove a member from an organisation */
  removeMember(orgId: string, memberId: string) {
    return this.request<void>(`/orgs/${orgId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  /** List all projects in an organisation */
  listProjects(orgId: string) {
    return this.request<Project[]>(`/orgs/${orgId}/projects`);
  }

  /** Get a single project by ID */
  getProject(projectId: string) {
    return this.request<Project>(`/projects/${projectId}`);
  }

  /** Create a new project */
  createProject(
    orgId: string,
    data: { name: string; slug?: string; locales: string[]; defaultLocale: string }
  ) {
    return this.request<Project>(`/orgs/${orgId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /** Update project settings */
  updateProject(projectId: string, data: Partial<Project>) {
    return this.request<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ---------------------------------------------------------------------------
  // Translations
  // ---------------------------------------------------------------------------

  /** Get all translations for a project and locale */
  getTranslations(projectId: string, locale: string) {
    return this.request<Translation[]>(`/projects/${projectId}/translations/${locale}`);
  }

  /** Update (or create) a translation value */
  updateTranslation(
    projectId: string,
    locale: string,
    keyId: string,
    data: { value: string; status?: Translation['status'] }
  ) {
    return this.request<Translation>(
      `/projects/${projectId}/translations/${locale}/${keyId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  }

  /** List all translation keys in a project */
  listKeys(projectId: string, params?: { namespace?: string; search?: string }) {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return this.request<TranslationKey[]>(`/projects/${projectId}/keys${qs}`);
  }

  // ---------------------------------------------------------------------------
  // Import / Export
  // ---------------------------------------------------------------------------

  /** Import translations from a JSON payload */
  importTranslations(projectId: string, locale: string, data: Record<string, string>) {
    return this.request<{ imported: number }>(`/projects/${projectId}/import`, {
      method: 'POST',
      body: JSON.stringify({ locale, data }),
    });
  }

  /** Get the export URL for a project/locale */
  getExportUrl(projectId: string, locale: string, format: string = 'json') {
    return `${API_URL}/projects/${projectId}/export?locale=${locale}&format=${format}`;
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  /** Get translation coverage statistics for a project */
  getProjectStats(projectId: string) {
    return this.request<ProjectStats>(`/projects/${projectId}/stats`);
  }
}

export const api = new DashboardApi();
