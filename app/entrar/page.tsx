import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function safeDestination(value: string | undefined, plan: string | undefined) {
  if (plan && /^[a-z0-9-]{2,40}$/.test(plan)) return `/conta?plan=${encodeURIComponent(plan)}`;
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export default async function LegacyLoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string; plan?: string }> }) {
  const params = await searchParams;
  const destination = safeDestination(params.return_to, params.plan);
  redirect(params.plan ? `/cadastro?plan=${encodeURIComponent(params.plan)}` : `/login?return_to=${encodeURIComponent(destination)}`);
}
