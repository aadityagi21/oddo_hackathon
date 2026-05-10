import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [recentTrips, popularCities] = await Promise.all([
    db.trip.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
      take: 4,
      include: {
        stops: { select: { id: true } },
        expenses: { select: { amount: true } },
      },
    }),
    db.city.findMany({
      orderBy: [{ popularity: "desc" }, { name: "asc" }],
      take: 6,
    }),
  ]);

  const upcoming = recentTrips
    .filter((t) => t.endDate >= new Date())
    .sort((a, b) => +a.startDate - +b.startDate)[0];

  let budgetHint: string | null = null;
  if (upcoming) {
    const activityTotal = await db.stopActivity.aggregate({
      where: { tripStop: { tripId: upcoming.id } },
      _sum: { costEstimate: true },
    });
    const expenseTotal = upcoming.expenses.reduce((s, e) => s + e.amount, 0);
    const est = (activityTotal._sum.costEstimate ?? 0) + expenseTotal;
    budgetHint = formatMoney(est);
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">
          Hello, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Dream, design, and organize your next adventure.
        </p>
        <Link
          href="/trips/new"
          className="mt-6 inline-flex items-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow hover:opacity-95"
        >
          Plan new trip
        </Link>
      </section>

      {budgetHint && upcoming ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Next trip estimate
          </h2>
          <p className="mt-2 text-2xl font-bold">{budgetHint}</p>
          <p className="text-sm text-[var(--muted)]">
            Rough total for activities + logged expenses on{" "}
            <Link
              href={`/trips/${upcoming.id}/budget`}
              className="font-medium text-[var(--accent-strong)] underline"
            >
              {upcoming.name}
            </Link>
            .
          </p>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recent trips</h2>
          <Link
            href="/trips"
            className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
          >
            View all
          </Link>
        </div>
        {recentTrips.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
            No trips yet — start with{" "}
            <Link href="/trips/new" className="font-medium text-[var(--accent-strong)]">
              Plan new trip
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {recentTrips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}`}
                  className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-[var(--accent)]"
                >
                  <p className="font-semibold">{trip.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {trip.stops.length} stops
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Popular destinations</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularCities.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="font-medium">
                {c.name}, {c.country}
              </p>
              <p className="text-xs text-[var(--muted)]">
                Cost index {c.costIndex}/100 · Popularity {c.popularity}/100
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
