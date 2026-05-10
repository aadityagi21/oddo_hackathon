import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDayLabel, formatMoney } from "@/lib/format";

export default async function TripTimelinePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: {
      stops: {
        orderBy: { sortOrder: "asc" },
        include: {
          city: true,
          activities: { orderBy: [{ dayDate: "asc" }, { sortOrder: "asc" }] },
        },
      },
    },
  });
  if (!trip) notFound();

  const days: {
    date: Date;
    cityLabel: string;
    items: typeof trip.stops[0]["activities"];
  }[] = [];

  for (const stop of trip.stops) {
    const byDay = new Map<string, typeof stop.activities>();
    for (const a of stop.activities) {
      const key = a.dayDate.toISOString().slice(0, 10);
      const list = byDay.get(key) ?? [];
      list.push(a);
      byDay.set(key, list);
    }
    const sortedKeys = [...byDay.keys()].sort();
    for (const key of sortedKeys) {
      days.push({
        date: new Date(key + "T12:00:00"),
        cityLabel: `${stop.city.name}`,
        items: byDay.get(key) ?? [],
      });
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">
        Day-by-day timeline across all stops. Switch to list editing in{" "}
        <span className="font-medium text-[var(--foreground)]">Itinerary</span>.
      </p>
      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          Add activities to see your timeline.
        </p>
      ) : (
        <ol className="relative space-y-6 border-s-2 border-[var(--accent)] ps-6">
          {days.map((d, i) => (
            <li key={`${d.date.toISOString()}-${i}`} className="relative">
              <span className="absolute -start-[31px] mt-1 h-3 w-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--background)]" />
              <p className="text-sm font-semibold text-[var(--accent-strong)]">
                {formatDayLabel(d.date)} · {d.cityLabel}
              </p>
              <ul className="mt-2 space-y-2">
                {d.items.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{a.title}</span>
                    <span className="text-[var(--muted)]">
                      {" "}
                      · {a.startTime ?? "flexible"} · {formatMoney(a.costEstimate)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
