import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();

  const [userCount, tripCount, recentTrips, stopGroups] = await Promise.all([
    db.user.count(),
    db.trip.count(),
    db.trip.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { email: true, name: true } } },
    }),
    db.tripStop.groupBy({
      by: ["cityId"],
      _count: { cityId: true },
      orderBy: { _count: { cityId: "desc" } },
      take: 8,
    }),
  ]);

  const cityIds = stopGroups.map((g) => g.cityId);
  const cities = await db.city.findMany({
    where: { id: { in: cityIds } },
  });
  const cityMap = new Map(cities.map((c) => [c.id, c]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-[var(--muted)]">Platform usage snapshot (admin only).</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Users</p>
          <p className="mt-2 text-3xl font-bold">{userCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Trips</p>
          <p className="mt-2 text-3xl font-bold">{tripCount}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Engagement</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Track creation velocity and popular corridors during your pilot. Hook this page to
            warehouse exports for deeper funnels.
          </p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Top cities by stops</h2>
          <ul className="space-y-2 text-sm">
            {stopGroups.map((g) => {
              const c = cityMap.get(g.cityId);
              return (
                <li key={g.cityId} className="flex justify-between gap-2">
                  <span>
                    {c ? `${c.name}, ${c.country}` : g.cityId}
                  </span>
                  <span className="text-[var(--muted)]">{g._count.cityId} stops</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Recent trips</h2>
          <ul className="divide-y divide-[var(--border)] text-sm">
            {recentTrips.map((t) => (
              <li key={t.id} className="flex flex-col gap-0.5 py-3">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {t.user.name} · {formatDate(t.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
