import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Forgot password</h1>
        <p className="mb-4 text-sm text-[var(--muted)]">
          For this hackathon demo, password reset is not wired to email. Use the seeded
          accounts or create a new user. In production you would integrate an email
          provider or SSO here.
        </p>
        <p className="text-sm">
          Try{" "}
          <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">
            demo@traveloop.app
          </code>{" "}
          /{" "}
          <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">
            demo1234
          </code>
          .
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-[var(--accent-strong)] underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
