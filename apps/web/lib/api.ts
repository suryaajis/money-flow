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

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => request<AuthUser>('/users/profile'),
  updateName: (name: string) =>
    request<AuthUser>('/users/profile', { method: 'PUT', body: JSON.stringify({ name }) }),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<void>('/users/password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) }),
  deleteAccount: () =>
    request<void>('/users/account', { method: 'DELETE' }),
};

// ── Budgets ───────────────────────────────────────────────────────────────────

export interface ApiBudget {
  id: string;
  categoryId: string;
  category: { id: string; name: string; color: string; icon: string; type: string };
  amount: number;
  month: string;
}

export const budgetsApi = {
  getAll: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return request<ApiBudget[]>(`/budgets${qs}`);
  },
  upsert: (data: { categoryId: string; amount: number; month: string }) =>
    request<ApiBudget>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/budgets/${id}`, { method: 'DELETE' }),
  copyPrevious: (month: string) =>
    request<ApiBudget[]>('/budgets/copy-previous', { method: 'POST', body: JSON.stringify({ month }) }),
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

// ── Backup ────────────────────────────────────────────────────────────────────

export interface BackupData {
  version: number;
  exportedAt: string;
  transactions: ApiTransaction[];
  categories: ApiCategory[];
}

export const backupApi = {
  export: () => request<BackupData>('/backup/export'),
  import: (data: BackupData, mode: 'merge' | 'replace') =>
    request<{ imported: number }>('/backup/import', {
      method: 'POST',
      body: JSON.stringify({ data, mode }),
    }),
};

// ── Recurring Transactions ────────────────────────────────────────────────────

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ApiRecurring {
  id: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string | null;
  category?: ApiCategory;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateRecurringInput = Omit<
  ApiRecurring,
  'id' | 'userId' | 'category' | 'createdAt' | 'updatedAt' | 'nextRunDate'
>;

export type UpdateRecurringInput = Partial<CreateRecurringInput> & {
  isActive?: boolean;
};

// ── Debts ─────────────────────────────────────────────────────────────────────

export interface ApiDebt {
  id: string;
  direction: 'owed_to_me' | 'i_owe';
  amount: number;
  counterpartyName: string;
  notes: string | null;
  dueDate: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebtInput {
  direction: 'owed_to_me' | 'i_owe';
  amount: number;
  counterpartyName: string;
  notes?: string;
  dueDate?: string;
}

export const debtsApi = {
  getAll: (status?: 'active' | 'settled') => {
    const qs = status ? `?status=${status}` : '';
    return request<ApiDebt[]>(`/debts${qs}`);
  },
  create: (data: CreateDebtInput) =>
    request<ApiDebt>('/debts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateDebtInput>) =>
    request<ApiDebt>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  settle: (id: string) =>
    request<ApiDebt>(`/debts/${id}/settle`, { method: 'PATCH' }),
  unsettle: (id: string) =>
    request<ApiDebt>(`/debts/${id}/unsettle`, { method: 'PATCH' }),
  delete: (id: string) =>
    request<void>(`/debts/${id}`, { method: 'DELETE' }),
};

// ── Recurring ─────────────────────────────────────────────────────────────────

export const recurringApi = {
  getAll: () => request<ApiRecurring[]>('/recurring'),
  create: (data: CreateRecurringInput) =>
    request<ApiRecurring>('/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateRecurringInput) =>
    request<ApiRecurring>(`/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/recurring/${id}`, { method: 'DELETE' }),
};

// ── Shared Wallet ─────────────────────────────────────────────────────────────

export interface ApiWalletMember {
  id: string;
  ownerUserId: string;
  memberUserId: string | null;
  memberEmail: string | null;
  memberWaPhone: string | null;
  inviteToken: string | null;
  acceptedAt: string | null;
  createdAt: string;
  owner?: { id: string; name: string; email: string };
  member?: { id: string; name: string; email: string } | null;
}

export const sharedWalletApi = {
  getMyMembers: () => request<ApiWalletMember[]>('/shared-wallet/members'),
  getSharedWithMe: () => request<ApiWalletMember[]>('/shared-wallet/shared-with-me'),
  invite: (email: string) =>
    request<ApiWalletMember>('/shared-wallet/invite', { method: 'POST', body: JSON.stringify({ email }) }),
  accept: (token: string) =>
    request<ApiWalletMember>(`/shared-wallet/accept/${token}`, { method: 'POST' }),
  removeMember: (id: string) =>
    request<void>(`/shared-wallet/members/${id}`, { method: 'DELETE' }),
  leave: (id: string) =>
    request<void>(`/shared-wallet/leave/${id}`, { method: 'DELETE' }),
};
