import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { updateTripAction } from "@/actions/trips";

export default async function TripOverviewPage({
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
          activities: true,
        },
      },
    },
  });
  if (!trip) notFound();

  const startStr = trip.startDate.toISOString().slice(0, 10);
  const endStr = trip.endDate.toISOString().slice(0, 10);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Destinations</h2>
        {trip.stops.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-[var(--muted)]">
            No stops yet. Add cities from the{" "}
            <Link href={`/trips/${trip.id}/itinerary`} className="text-[var(--accent-strong)] underline">
              Itinerary
            </Link>{" "}
            or{" "}
            <Link href={`/trips/${trip.id}/explore`} className="text-[var(--accent-strong)] underline">
              Explore
            </Link>{" "}
            tab.
          </p>
        ) : (
          <ol className="space-y-3">
            {trip.stops.map((s, i) => (
              <li
                key={s.id}
                className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">
                    {s.city.name}, {s.city.country}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {formatDate(s.arrivalDate)} – {formatDate(s.departureDate)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {s.activities.length} activit{s.activities.length === 1 ? "y" : "ies"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <aside className="space-y-4">
        <h2 className="text-lg font-semibold">Quick links</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href={`/trips/${trip.id}/itinerary`} className="text-[var(--accent-strong)] underline">
              Edit itinerary
            </Link>
          </li>
          <li>
            <Link href={`/trips/${trip.id}/budget`} className="text-[var(--accent-strong)] underline">
              Budget & costs
            </Link>
          </li>
          <li>
            <Link href={`/trips/${trip.id}/share`} className="text-[var(--accent-strong)] underline">
              Share trip
            </Link>
          </li>
        </ul>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Edit details</h3>
          <form action={updateTripAction.bind(null, trip.id)} className="space-y-3">
            <input name="name" defaultValue={trip.name} className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="startDate"
                type="date"
                defaultValue={startStr}
                className="rounded border border-[var(--border)] px-2 py-1.5 text-sm"
              />
              <input
                name="endDate"
                type="date"
                defaultValue={endStr}
                className="rounded border border-[var(--border)] px-2 py-1.5 text-sm"
              />
            </div>
            <textarea
              name="description"
              defaultValue={trip.description ?? ""}
              rows={2}
              className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
            />
            <input
              name="coverImageUrl"
              defaultValue={trip.coverImageUrl ?? ""}
              placeholder="Cover image URL"
              className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
            />
            <button type="submit" className="w-full rounded-lg bg-[var(--surface-2)] py-2 text-sm font-medium">
              Save changes
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
