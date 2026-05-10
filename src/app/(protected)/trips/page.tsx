import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { deleteTripAction } from "@/actions/trips";

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const trips = await db.trip.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: { stops: { select: { id: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My trips</h1>
          <p className="text-[var(--muted)]">Manage your itineraries and budgets.</p>
        </div>
        <Link
          href="/trips/new"
          className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:opacity-95"
        >
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          No trips yet.{" "}
          <Link href="/trips/new" className="font-medium text-[var(--accent-strong)]">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
            >
              <div className="flex flex-1 flex-col gap-2">
                <h2 className="text-lg font-semibold">{trip.name}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {trip.stops.length} destination{trip.stops.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/trips/${trip.id}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
                >
                  Open
                </Link>
                <Link
                  href={`/trips/${trip.id}/itinerary`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
                >
                  Itinerary
                </Link>
                <form action={deleteTripAction.bind(null, trip.id)} className="inline">
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
