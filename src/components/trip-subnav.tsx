"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const suffixes: { suffix: string; label: string }[] = [
  { suffix: "", label: "Overview" },
  { suffix: "/itinerary", label: "Itinerary" },
  { suffix: "/view", label: "Timeline" },
  { suffix: "/explore", label: "Explore" },
  { suffix: "/budget", label: "Budget" },
  { suffix: "/packing", label: "Packing" },
  { suffix: "/notes", label: "Notes" },
  { suffix: "/share", label: "Share" },
];

export function TripSubnav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] pb-2 text-sm">
      {suffixes.map(({ suffix, label }) => {
        const path = `${base}${suffix}`;
        const active = pathname === path;
        return (
          <Link
            key={path}
            href={path}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition ${
              active
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
