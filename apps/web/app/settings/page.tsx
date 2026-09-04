import Link from "next/link";
import { MessageSquare, UserCircle, Users } from "lucide-react";

const items = [
  { href: "/settings/profile", label: "Profile", description: "Nama, password, dan keamanan akun.", icon: UserCircle },
  { href: "/settings/whatsapp", label: "WhatsApp", description: "Nomor terhubung dan notifikasi.", icon: MessageSquare },
  { href: "/accounts", label: "Account Sharing", description: "Bagikan pocket tertentu melalui email.", icon: Users },
];

export default function SettingsPage() {
  return <div className="space-y-6"><div><h2 className="text-3xl font-black">Settings</h2><p className="text-sm text-muted-foreground">Kelola identitas, kanal WhatsApp, dan account sharing.</p></div><div className="grid gap-4 md:grid-cols-3">{items.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-3 font-bold">{label}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></Link>)}</div></div>;
}
