import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextRaw = sp.next;
  const nextPath =
    typeof nextRaw === "string" &&
    nextRaw.startsWith("/") &&
    !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";
  const user = await getCurrentUser();
  if (user) redirect(nextPath);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">
          Log in to continue planning with{" "}
          <Link href="/" className="font-medium text-[var(--accent-strong)]">
            Traveloop
          </Link>
          .
        </p>
        <LoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
