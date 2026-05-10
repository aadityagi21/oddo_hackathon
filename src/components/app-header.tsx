import Link from "next/link";
import type { User } from "@prisma/client";
import { logoutAction } from "@/actions/auth";

export function AppHeader({ user }: { user: User }) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-[var(--accent-strong)]"
        >
          Traveloop
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-[var(--muted)]">
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            Home
          </Link>
          <Link href="/trips" className="hover:text-[var(--foreground)]">
            My trips
          </Link>
          <Link href="/settings" className="hover:text-[var(--foreground)]">
            Settings
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[10rem] truncate text-sm text-[var(--muted)] sm:inline">
            {user.name}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
