import type { Transaction, Category } from "@/lib/types";

export type { Transaction, Category };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mf:token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<AuthUser>('/auth/me'),
};

// ── Categories ────────────────────────────────────────────────────────────────

export type ApiCategory = Category;

export const categoriesApi = {
  getAll: () => request<ApiCategory[]>('/categories'),
  create: (data: Omit<ApiCategory, 'id' | 'isDefault'>) =>
    request<ApiCategory>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<ApiCategory, 'id' | 'isDefault'>>) =>
    request<ApiCategory>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/categories/${id}`, { method: 'DELETE' }),
};

// ── Transactions ──────────────────────────────────────────────────────────────

export interface ApiTransaction extends Transaction {
  category?: ApiCategory;
}

export interface TransactionFiltersApi {
  type?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export const transactionsApi = {
  getAll: (filters?: TransactionFiltersApi) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const qs = params.toString();
    return request<ApiTransaction[]>(`/transactions${qs ? `?${qs}` : ''}`);
  },
  create: (data: Omit<ApiTransaction, 'id' | 'createdAt' | 'updatedAt' | 'category'>) =>
    request<ApiTransaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<ApiTransaction, 'id' | 'createdAt' | 'updatedAt' | 'category'>>) =>
    request<ApiTransaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  bulkDelete: (ids: string[]) =>
    request<void>('/transactions/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) }),
};
