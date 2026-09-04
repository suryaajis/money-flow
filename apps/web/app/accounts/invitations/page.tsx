"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { accountsApi, type ApiAccountShare } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAccountStore } from "@/store/accountStore";

export default function AccountInvitationsPage() {
  const refreshAccounts = useAccountStore((state) => state.fetchAccounts);
  const [invitations, setInvitations] = useState<ApiAccountShare[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => setInvitations(await accountsApi.invitations()), []);
  useEffect(() => {
    void load();
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) accountsApi.acceptInvitation(token).then(async () => { setMessage("Undangan diterima. Account sudah muncul di daftar kamu."); window.history.replaceState(null, "", "/accounts/invitations"); await Promise.all([load(), refreshAccounts()]); }).catch((error) => setMessage(error instanceof Error ? error.message : "Undangan tidak valid."));
  }, [load, refreshAccounts]);
  return <div className="mx-auto max-w-2xl space-y-5"><div><h2 className="text-2xl font-black">Undangan Account</h2><p className="text-sm text-muted-foreground">Undangan hanya dapat diterima oleh user dengan email tujuan.</p></div>{message && <p className="rounded-xl bg-muted p-3 text-sm">{message}</p>}{invitations.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">Tidak ada undangan pending.</p> : invitations.map((invite) => <article key={invite.id} className="rounded-xl border bg-card p-4"><p className="font-semibold">{invite.account?.name}</p><p className="text-sm text-muted-foreground">Owner: {invite.account?.owner?.name} · role {invite.role}</p><p className="mt-2 text-xs text-muted-foreground">Buka link pada email undangan untuk menerima akses dengan aman.</p></article>)}<Link href="/accounts"><Button variant="outline">Kembali ke Accounts</Button></Link></div>;
}
