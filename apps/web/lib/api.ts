import type { Transaction, Category } from "@/lib/types";
import {
  cacheTransactions,
  getCachedTransactions,
  listMutations,
  queueMutation,
  removeMutation,
  removeQueuedCreate,
  updateQueuedCreate,
} from "@/lib/offlineTransactions";

export type { Transaction, Category };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mf:token");
}

/**
 * A 401 on a request that *did* carry a token means the token is stale
 * (expired, or signed with a secret the API no longer uses). Evict it and
 * bounce to /login so the app doesn't keep rendering the authenticated shell
 * against an invalid session. Guarded so we don't loop when already on /login.
 */
function handleStaleSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("mf:token");
  localStorage.removeItem("mf:auth");
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    // Only a rejected *authenticated* request signals a stale session. A 401
    // from login/forgot-password (no token sent) is just bad credentials and
    // must surface to the caller as an ApiError instead.
    if (res.status === 401 && token) handleStaleSession();
    const body = await res.json().catch(() => ({}));
    const message = body?.message ?? `HTTP ${res.status}`;
    throw new ApiError(
      res.status,
      Array.isArray(message) ? message.join(", ") : message,
    );
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
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<AuthUser>("/auth/me"),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => request<AuthUser>("/users/profile"),
  updateName: (name: string) =>
    request<AuthUser>("/users/profile", {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<void>("/users/password", {
      method: "PUT",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
  deleteAccount: () => request<void>("/users/account", { method: "DELETE" }),
};

// ── Budgets ───────────────────────────────────────────────────────────────────

export interface ApiBudget {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
  };
  amount: number;
  month: string;
}

export const budgetsApi = {
  getAll: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return request<ApiBudget[]>(`/budgets${qs}`);
  },
  upsert: (data: { categoryId: string; amount: number; month: string }) =>
    request<ApiBudget>("/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<void>(`/budgets/${id}`, { method: "DELETE" }),
  copyPrevious: (month: string) =>
    request<ApiBudget[]>("/budgets/copy-previous", {
      method: "POST",
      body: JSON.stringify({ month }),
    }),
};

// ── Categories ────────────────────────────────────────────────────────────────

export type ApiCategory = Category;

export const categoriesApi = {
  getAll: () => request<ApiCategory[]>("/categories"),
  create: (data: Omit<ApiCategory, "id" | "isDefault">) =>
    request<ApiCategory>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Omit<ApiCategory, "id" | "isDefault">>) =>
    request<ApiCategory>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),
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
  accountId?: string;
}

type TransactionWrite = Omit<
  ApiTransaction,
  "id" | "createdAt" | "updatedAt" | "category"
>;

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (typeof navigator !== "undefined" && !navigator.onLine)
  );
}

export const transactionsApi = {
  getAll: async (filters?: TransactionFiltersApi) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.categoryId) params.set("categoryId", filters.categoryId);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.accountId) params.set("accountId", filters.accountId);
    const qs = params.toString();
    try {
      const rows = await request<ApiTransaction[]>(
        `/transactions${qs ? `?${qs}` : ""}`,
      );
      if (!filters) await cacheTransactions(rows);
      return rows;
    } catch (error) {
      if (!filters && isNetworkError(error)) {
        const cached = await getCachedTransactions();
        if (cached.length) return cached;
      }
      throw error;
    }
  },
  create: async (data: TransactionWrite) => {
    const clientMutationId = data.clientMutationId ?? crypto.randomUUID();
    const payload = { ...data, clientMutationId };
    try {
      return await request<ApiTransaction>("/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      const now = new Date().toISOString();
      const optimistic: ApiTransaction = {
        ...payload,
        id: `offline:${clientMutationId}`,
        createdAt: now,
        updatedAt: now,
      } as ApiTransaction;
      await queueMutation({
        id: crypto.randomUUID(),
        method: "POST",
        path: "/transactions",
        body: payload,
        clientMutationId,
        createdAt: Date.now(),
      });
      const cached = await getCachedTransactions();
      await cacheTransactions([optimistic, ...cached]);
      return optimistic;
    }
  },
  update: async (id: string, data: Partial<TransactionWrite>) => {
    if (id.startsWith("offline:")) {
      const clientMutationId = id.slice("offline:".length);
      await updateQueuedCreate(
        clientMutationId,
        data as Record<string, unknown>,
      );
      const cached = await getCachedTransactions();
      const updated = cached.find((row) => row.id === id);
      const next = cached.map((row) =>
        row.id === id
          ? { ...row, ...data, updatedAt: new Date().toISOString() }
          : row,
      );
      await cacheTransactions(next);
      return { ...updated, ...data } as ApiTransaction;
    }
    try {
      return await request<ApiTransaction>(`/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await queueMutation({
        id: crypto.randomUUID(),
        method: "PUT",
        path: `/transactions/${id}`,
        body: data,
        createdAt: Date.now(),
      });
      const cached = await getCachedTransactions();
      const next = cached.map((row) =>
        row.id === id
          ? { ...row, ...data, updatedAt: new Date().toISOString() }
          : row,
      );
      await cacheTransactions(next);
      return next.find((row) => row.id === id)!;
    }
  },
  delete: async (id: string) => {
    if (id.startsWith("offline:")) {
      await removeQueuedCreate(id.slice("offline:".length));
    } else {
      try {
        await request<void>(`/transactions/${id}`, { method: "DELETE" });
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        await queueMutation({
          id: crypto.randomUUID(),
          method: "DELETE",
          path: `/transactions/${id}`,
          createdAt: Date.now(),
        });
      }
    }
    await cacheTransactions(
      (await getCachedTransactions()).filter((row) => row.id !== id),
    );
  },
  bulkDelete: async (ids: string[]) => {
    for (const id of ids) await transactionsApi.delete(id);
  },
};

export async function syncOfflineTransactions(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  let synced = 0;
  for (const mutation of await listMutations()) {
    try {
      await request(mutation.path, {
        method: mutation.method,
        body:
          mutation.body === undefined
            ? undefined
            : JSON.stringify(mutation.body),
      });
      await removeMutation(mutation.id);
      synced++;
    } catch (error) {
      if (isNetworkError(error)) break;
      // Keep rejected mutations durable. Silently deleting a 4xx/5xx response
      // loses the user's offline write and makes recovery impossible. The UI
      // surfaces the failure while the queue remains available for retry.
      throw error;
    }
  }
  if (synced && typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("moneyflow:offline-synced"));
  return synced;
}

export const tagsApi = {
  getAll: () => request<string[]>("/tags"),
};

export interface PushSettings {
  publicKey: string;
  enabled: boolean;
  time: string;
  days: number[];
}

export const pushApi = {
  getSettings: () => request<PushSettings>("/push/settings"),
  updateSettings: (data: Partial<Omit<PushSettings, "publicKey">>) =>
    request<PushSettings>("/push/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  subscribe: (subscription: PushSubscriptionJSON) =>
    request("/push/subscriptions", {
      method: "POST",
      body: JSON.stringify(subscription),
    }),
  unsubscribe: (endpoint: string) =>
    request("/push/subscriptions", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }),
};

export interface WaNotificationSettings {
  notifyMonthlyRecap: boolean;
  notifyOverBudget: boolean;
  notifyDebtDue: boolean;
  notifyDailyInput: boolean;
  dailyInputTime: string;
}

export const waNotificationsApi = {
  get: () => request<WaNotificationSettings>("/users/notifications"),
  update: (data: Partial<WaNotificationSettings>) =>
    request<WaNotificationSettings>("/users/notifications", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ── Backup ────────────────────────────────────────────────────────────────────

export interface BackupData {
  version: 2 | 3 | 4;
  exportedAt: string;
  transactions: ApiTransaction[];
  categories: ApiCategory[];
  budgets: unknown[];
  recurrings: unknown[];
  debts: unknown[];
  sharedWalletMembers: unknown[];
  accounts?: ApiAccount[];
  accountShares?: ApiAccountShare[];
  transfers?: ApiTransfer[];
  smartRules?: ApiSmartRule[];
  whatsappNumbers?: Array<{
    phoneMasked: string;
    label: string;
    isPrimary: boolean;
    notificationsEnabled: boolean;
    linkedAt: string;
    lastInboundAt: string | null;
  }>;
  preferences: Record<string, boolean | string>;
}

export const backupApi = {
  export: () => request<BackupData>("/backup/export"),
  import: (data: BackupData, mode: "merge" | "replace") =>
    request<{ imported: number }>("/backup/import", {
      method: "POST",
      body: JSON.stringify({ data, mode }),
    }),
};

// ── Recurring Transactions ────────────────────────────────────────────────────

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface ApiRecurring {
  id: string;
  userId: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  category?: ApiCategory;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  isActive: boolean;
  notes: string | null;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateRecurringInput = Omit<
  ApiRecurring,
  | "id"
  | "userId"
  | "category"
  | "createdAt"
  | "updatedAt"
  | "nextRunDate"
  | "isActive"
>;

export type UpdateRecurringInput = Partial<CreateRecurringInput> & {
  isActive?: boolean;
  nextRunDate?: string;
};

// Accounts, sharing, transfers, smart rules, and financial health (v1.6)
export type AccountType = "cash" | "bank" | "e_wallet" | "credit_card" | "other";
export type AccountRole = "owner" | "viewer" | "contributor";

export interface ApiAccount {
  id: string;
  ownerUserId: string;
  owner?: { id: string; name: string; email: string };
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: number;
  balance: number;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  archivedAt: string | null;
  ownership: "owned" | "shared";
  role: AccountRole;
  shareId: string | null;
  lastActivityAt: string | null;
}

export interface ApiAccountShare {
  id: string;
  accountId: string;
  invitedEmail: string;
  role: "viewer" | "contributor";
  status: "pending" | "accepted" | "revoked";
  acceptedAt: string | null;
  member?: { id: string; name: string; email: string };
  account?: ApiAccount;
}

export const accountsApi = {
  getAll: () => request<ApiAccount[]>("/accounts"),
  getActive: () => request<{ accountId: string }>("/accounts/active"),
  setActive: (accountId: string) => request<{ accountId: string }>("/accounts/active", { method: "PUT", body: JSON.stringify({ accountId }) }),
  create: (data: { name: string; type: AccountType; currency: string; openingBalance: number; color?: string; icon?: string }) =>
    request<ApiAccount>("/accounts", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<ApiAccount, "name" | "type" | "currency" | "color" | "icon">>) =>
    request<ApiAccount>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  archive: (id: string) => request<void>(`/accounts/${id}`, { method: "DELETE" }),
  adjust: (id: string, amount: number, reason: string) =>
    request<ApiTransaction>(`/accounts/${id}/adjustments`, { method: "POST", body: JSON.stringify({ amount, reason }) }),
  getShares: (id: string) => request<ApiAccountShare[]>(`/accounts/${id}/shares`),
  invite: (id: string, email: string, role: "viewer" | "contributor") =>
    request<ApiAccountShare>(`/accounts/${id}/shares`, { method: "POST", body: JSON.stringify({ email, role }) }),
  updateShare: (id: string, shareId: string, role: "viewer" | "contributor") =>
    request<ApiAccountShare>(`/accounts/${id}/shares/${shareId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
  revokeShare: (id: string, shareId: string) => request<void>(`/accounts/${id}/shares/${shareId}`, { method: "DELETE" }),
  invitations: () => request<ApiAccountShare[]>("/account-invitations"),
  acceptInvitation: (token: string) => request<ApiAccountShare>(`/account-invitations/${token}/accept`, { method: "POST" }),
  declineInvitation: (token: string) => request<void>(`/account-invitations/${token}/decline`, { method: "POST" }),
  leave: (shareId: string) => request<void>(`/account-invitations/${shareId}/leave`, { method: "DELETE" }),
};

export interface ApiTransfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAccount?: ApiAccount;
  destinationAccount?: ApiAccount;
  sourceAmount: number;
  destinationAmount: number;
  exchangeRate: number;
  date: string;
  notes: string | null;
}

export const transfersApi = {
  getAll: () => request<ApiTransfer[]>("/transfers"),
  create: (data: Omit<ApiTransfer, "id" | "sourceAccount" | "destinationAccount"> & { idempotencyKey?: string }) =>
    request<ApiTransfer>("/transfers", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/transfers/${id}`, { method: "DELETE" }),
};

export interface ApiSmartRule {
  id: string;
  name: string;
  conditions: { descriptionContains?: string; source?: string; accountId?: string; minAmount?: number; maxAmount?: number; type?: "income" | "expense" };
  actions: { categoryId?: string; tags?: string[]; normalizedDescription?: string };
  priority: number;
  active: boolean;
  stopOnMatch: boolean;
}

export const smartRulesApi = {
  getAll: () => request<ApiSmartRule[]>("/smart-rules"),
  suggestions: () => request<Array<{ merchant: string; occurrences: number; conditions: ApiSmartRule["conditions"]; actions: ApiSmartRule["actions"] }>>("/smart-rules/suggestions"),
  create: (data: Omit<ApiSmartRule, "id">) => request<ApiSmartRule>("/smart-rules", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<ApiSmartRule, "id">>) => request<ApiSmartRule>(`/smart-rules/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/smart-rules/${id}`, { method: "DELETE" }),
  preview: (id: string) => request<{ count: number; sample: ApiTransaction[] }>(`/smart-rules/${id}/preview`, { method: "POST" }),
  apply: (id: string) => request<{ batchId: string; affected: number; reversibleUntil: string }>(`/smart-rules/${id}/apply`, { method: "POST" }),
  undo: (batchId: string) => request<{ restored: number }>(`/smart-rules/batches/${batchId}/undo`, { method: "POST" }),
};

export interface ApiFinancialHealth {
  enabled: boolean;
  period: string;
  score?: number | null;
  components?: Record<string, { score: number | null; weight: number; reason: string; value?: number }>;
  formulaVersion?: string;
  dataQuality?: { sufficient: boolean; transactionCount: number; reasons: string[] };
  comparison?: { period: string; score: number | null; change: number | null };
  recommendations?: string[];
}

export const financialHealthApi = {
  get: (period?: string) => request<ApiFinancialHealth>(`/financial-health${period ? `?period=${period}` : ""}`),
  setEnabled: (enabled: boolean) => request<{ enabled: boolean }>("/financial-health/preference", { method: "PUT", body: JSON.stringify({ enabled }) }),
};

// ── Debts ─────────────────────────────────────────────────────────────────────

export interface ApiDebt {
  id: string;
  direction: "owed_to_me" | "i_owe";
  amount: number;
  counterpartyName: string;
  notes: string | null;
  dueDate: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDebtInput {
  direction: "owed_to_me" | "i_owe";
  amount: number;
  counterpartyName: string;
  notes?: string;
  dueDate?: string;
}

export const debtsApi = {
  getAll: (status?: "active" | "settled") => {
    const qs = status ? `?status=${status}` : "";
    return request<ApiDebt[]>(`/debts${qs}`);
  },
  create: (data: CreateDebtInput) =>
    request<ApiDebt>("/debts", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateDebtInput>) =>
    request<ApiDebt>(`/debts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  settle: (id: string) =>
    request<ApiDebt>(`/debts/${id}/settle`, { method: "PATCH" }),
  unsettle: (id: string) =>
    request<ApiDebt>(`/debts/${id}/unsettle`, { method: "PATCH" }),
  delete: (id: string) => request<void>(`/debts/${id}`, { method: "DELETE" }),
};

// ── Recurring ─────────────────────────────────────────────────────────────────

export const recurringApi = {
  getAll: () => request<ApiRecurring[]>("/recurring"),
  create: (data: CreateRecurringInput) =>
    request<ApiRecurring>("/recurring", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateRecurringInput) =>
    request<ApiRecurring>(`/recurring/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/recurring/${id}`, { method: "DELETE" }),
};

// ── Shared Wallet ─────────────────────────────────────────────────────────────

export interface ApiWalletMember {
  id: string;
  ownerUserId: string;
  memberUserId: string | null;
  memberEmail: string | null;
  memberWaPhone: string | null;
  inviteToken: string | null;
  inviteExpiresAt?: string | null;
  acceptedAt: string | null;
  createdAt: string;
  owner?: { id: string; name: string; email: string };
  member?: { id: string; name: string; email: string } | null;
}

export const sharedWalletApi = {
  getMyMembers: () => request<ApiWalletMember[]>("/shared-wallet/members"),
  getSharedWithMe: () =>
    request<ApiWalletMember[]>("/shared-wallet/shared-with-me"),
  invite: (phone: string) =>
    request<ApiWalletMember>("/shared-wallet/invite", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  accept: (token: string) =>
    request<ApiWalletMember>(`/shared-wallet/accept/${token}`, {
      method: "POST",
    }),
  removeMember: (id: string) =>
    request<void>(`/shared-wallet/members/${id}`, { method: "DELETE" }),
  leave: (id: string) =>
    request<void>(`/shared-wallet/leave/${id}`, { method: "DELETE" }),
  // SHARE-04: id→name of people who may appear as recordedBy on my wallet
  getRecorders: () =>
    request<{ id: string; name: string }[]>("/shared-wallet/recorders"),
  // SHARE-03: owner's categories + record a transaction into their wallet
  getOwnerCategories: (ownerId: string) =>
    request<ApiCategory[]>(`/shared-wallet/${ownerId}/categories`),
  recordForOwner: (
    ownerId: string,
    data: {
      amount: number;
      type: "income" | "expense";
      categoryId: string;
      date: string;
      notes?: string;
    },
  ) =>
    request<ApiTransaction>(`/shared-wallet/${ownerId}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
