import Link from "next/link";
import { ArrowRight, Plus, Wallet, Wifi } from "lucide-react";
import { TiltSurface } from "@/components/motion/TiltSurface";

interface BalanceHeroProps {
  balance: string;
  transactionCount: number;
}

export const BalanceHero: React.FC<BalanceHeroProps> = ({
  balance,
  transactionCount,
}) => (
  <TiltSurface
    maxTilt={3.5}
    className="hero-vault group min-h-[286px] rounded-[2.15rem] border border-white/15 p-5 text-white sm:p-7"
  >
    <div className="finance-card-grid" />
    <Link href="/budget" className="balance-fold-action">
      <Plus className="h-3.5 w-3.5" /> Set budget
    </Link>
    <div className="hero-vault-content flex min-h-[238px] justify-between gap-5">
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-navy transition-transform duration-300 group-hover:-rotate-6">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-lime">
              MoneyFlow card
            </p>
            <p className="text-xs text-white/55">Personal wallet</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-white/55">Total saldo</p>
          <p
            data-numeric
            className="display-number mt-2 break-words text-[clamp(2.15rem,6vw,4rem)] font-black leading-none"
          >
            {balance}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-white/40">
              {transactionCount} transaksi tersimpan
            </p>
          </div>
          <Link
            href="/analytics"
            className="wiggle-on-hover inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-black text-brand-navy transition-transform hover:-translate-y-1"
          >
            Statistik <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="contactless-rail shrink-0 self-center transition-transform duration-300 group-hover:rotate-3 group-hover:scale-[1.03]">
        <Wifi className="h-6 w-6 rotate-90" />
      </div>
    </div>
  </TiltSurface>
);
