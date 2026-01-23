// API Client
// - Em produção (Nginx): use "/api" (mesma origem)
// - Em preview/dev sem proxy: pode usar VITE_API_URL ou um override em localStorage
//   localStorage.setItem('api_base_url', 'https://seu-dominio.com/api')
const API_URL = (
  (typeof window !== 'undefined' && localStorage.getItem('api_base_url')) ||
  import.meta.env.VITE_API_URL ||
  '/api'
).replace(/\/$/, '');

export function getApiBaseUrl() {
  return API_URL;
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      // Tenta extrair uma mensagem amigável, mesmo quando o backend retorna HTML/texto.
      const contentType = response.headers.get('content-type') || '';
      let message = `Erro ${response.status}`;

      try {
        if (contentType.includes('application/json')) {
          const body = await response.json();
          message = body?.message || body?.error || message;
        } else {
          const text = await response.text();
          message = text?.trim()?.slice(0, 200) || message;
        }
      } catch {
        // mantém message padrão
      }

      return { error: message };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User; mustChangePassword?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  changePassword: (newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  logout: () => {
    localStorage.removeItem('auth_token');
  },

  // Instances
  getInstances: () =>
    request<Instance[]>('/instances'),

  createInstance: (data: Omit<Instance, 'id' | 'status'>) =>
    request<Instance>('/instances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setInstanceAsPrimary: (id: string) =>
    request<Instance>(`/instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isPrimary: true }),
    }),

  updateInstance: (id: string, data: Partial<Instance>) =>
    request<Instance>(`/instances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteInstance: (id: string) =>
    request<void>(`/instances/${id}`, { method: 'DELETE' }),

  checkInstanceStatus: (id: string) =>
    request<{ status: 'connected' | 'disconnected' | 'warming'; message: string }>(`/instances/${id}/check-status`, { method: 'POST' }),

  // Warming Numbers
  getWarmingNumber: () =>
    request<WarmingNumber>('/warming-number'),

  setWarmingNumber: (phoneNumber: string) =>
    request<WarmingNumber>('/warming-number', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),

  toggleWarmingStatus: (id: string) =>
    request<WarmingNumber>(`/warming-number/${id}/toggle`, { method: 'POST' }),

  // Messages
  getMessages: () =>
    request<Message[]>('/messages'),

  addMessage: (content: string) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (id: string) =>
    request<void>(`/messages/${id}`, { method: 'DELETE' }),

  importMessages: (contents: string[]) =>
    request<Message[]>('/messages/import', {
      method: 'POST',
      body: JSON.stringify({ contents }),
    }),

  // Client Numbers
  getClientNumbers: () =>
    request<ClientNumber[]>('/client-numbers'),

  addClientNumber: (phoneNumber: string, name?: string) =>
    request<ClientNumber>('/client-numbers', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, name }),
    }),

  deleteClientNumber: (id: string) =>
    request<void>(`/client-numbers/${id}`, { method: 'DELETE' }),

  importClientNumbers: (numbers: { phoneNumber: string; name?: string }[]) =>
    request<ClientNumber[]>('/client-numbers/import', {
      method: 'POST',
      body: JSON.stringify({ numbers }),
    }),

  // Config
  getConfig: () =>
    request<WarmingConfig>('/config'),

  updateConfig: (config: WarmingConfig) =>
    request<WarmingConfig>('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
  }),

  // Admin
  getUsers: () =>
    request<AdminUser[]>('/admin/users'),

  createUser: (email: string, password?: string, role?: AppRole) =>
    request<AdminUser>('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),

  resetUserPassword: (userId: string, newPassword?: string) =>
    request<{ message: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  updateUserRole: (userId: string, role: AppRole) =>
    request<{ message: string }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  deleteUser: (userId: string) =>
    request<{ message: string }>(`/admin/users/${userId}`, { method: 'DELETE' }),

  // Branding
  getBranding: () =>
    request<Branding>('/branding'),

  updateBranding: (branding: Partial<Branding>) =>
    request<Branding>('/branding', {
      method: 'PUT',
      body: JSON.stringify(branding),
    }),
};

// Types
export type AppRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  roles?: AppRole[];
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  must_change_password: boolean;
  roles: AppRole[];
}

interface Instance {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'warming';
  phoneNumber?: string;
  isPrimary?: boolean;
  messagesSent?: number;
  messagesReceived?: number;
  lastActivity?: Date;
}

interface WarmingNumber {
  id: string;
  phoneNumber: string;
  status: 'idle' | 'warming' | 'paused';
  messagesSent: number;
  messagesReceived: number;
  lastActivity?: Date;
}

interface Message {
  id: string;
  content: string;
  type: 'incoming' | 'outgoing';
}

interface ClientNumber {
  id: string;
  phoneNumber: string;
  name?: string;
}

interface WarmingConfig {
  minDelaySeconds: number;
  maxDelaySeconds: number;
  messagesPerHour: number;
  activeHoursStart: number;
  activeHoursEnd: number;
}

export interface Branding {
  id?: string;
  logoUrl?: string | null;
  appName: string;
  appSubtitle: string;
  primaryColor: string;
}
