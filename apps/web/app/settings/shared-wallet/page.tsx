import { redirect } from "next/navigation";

export default function LegacySharedWalletPage() {
  redirect("/accounts");
}
