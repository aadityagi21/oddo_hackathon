import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDayLabel, formatMoney } from "@/lib/format";
import {
  addStopFormAction,
  addCustomActivityFormAction,
  deleteStopFormAction,
  deleteActivityFormAction,
  moveStopFormAction,
} from "@/actions/trips";

const activityCategories = [
  "SIGHTSEEING",
  "FOOD",
  "ADVENTURE",
  "CULTURE",
  "RELAXATION",
  "NIGHTLIFE",
  "SHOPPING",
  "OTHER",
] as const;

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const [trip, cities] = await Promise.all([
    db.trip.findFirst({
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
    }),
    db.city.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }] }),
  ]);
  if (!trip) notFound();

  const startStr = trip.startDate.toISOString().slice(0, 10);
  const endStr = trip.endDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Add a stop</h2>
        <form action={addStopFormAction} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="tripId" value={trip.id} />
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">City</label>
            <select
              name="cityId"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            >
              <option value="">Select city…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Arrival</label>
            <input
              name="arrivalDate"
              type="date"
              required
              defaultValue={startStr}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Departure</label>
            <input
              name="departureDate"
              type="date"
              required
              defaultValue={endStr}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Add stop
            </button>
          </div>
        </form>
      </section>

      {trip.stops.map((stop, stopIndex) => (
        <section
          key={stop.id}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="text-xl font-semibold">
                {stop.city.name}, {stop.city.country}
              </h2>
              <p className="text-sm text-[var(--muted)]">
                Cost index {stop.city.costIndex}/100
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={moveStopFormAction}>
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="stopId" value={stop.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={stopIndex === 0}
                  className="rounded border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-40"
                >
                  Move up
                </button>
              </form>
              <form action={moveStopFormAction}>
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="stopId" value={stop.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={stopIndex === trip.stops.length - 1}
                  className="rounded border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-40"
                >
                  Move down
                </button>
              </form>
              <form action={deleteStopFormAction}>
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="stopId" value={stop.id} />
                <button
                  type="submit"
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-300"
                >
                  Remove stop
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {stop.activities.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No activities yet for this stop.</p>
            ) : (
              <ul className="space-y-3">
                {stop.activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-[var(--background)] p-4"
                  >
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatDayLabel(a.dayDate)}
                        {a.startTime ? ` · ${a.startTime}` : ""} · {a.category}
                      </p>
                      {a.description ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{a.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs font-medium text-[var(--accent-strong)]">
                        Est. {formatMoney(a.costEstimate)}
                      </p>
                    </div>
                    <form action={deleteActivityFormAction}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <input type="hidden" name="activityId" value={a.id} />
                      <button type="submit" className="text-xs text-red-600 underline">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-xl border border-dashed border-[var(--border)] p-4">
              <h3 className="mb-3 text-sm font-semibold">Add custom activity</h3>
              <form
                action={addCustomActivityFormAction}
                className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
              >
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="tripStopId" value={stop.id} />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs text-[var(--muted)]">Title</label>
                  <input
                    name="title"
                    required
                    className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Day</label>
                  <input
                    name="dayDate"
                    type="date"
                    required
                    defaultValue={startStr}
                    className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Category</label>
                  <select
                    name="category"
                    className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                  >
                    {activityCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Start time</label>
                  <input
                    name="startTime"
                    type="time"
                    className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--muted)]">Est. cost</label>
                  <input
                    name="costEstimate"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={0}
                    className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs text-[var(--muted)]">Notes</label>
                  <input
                    name="description"
                    className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-medium"
                  >
                    Add activity
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      ))}

      {trip.stops.length === 0 ? (
        <p className="text-center text-[var(--muted)]">
          Add your first city stop above, or browse ideas in the Explore tab.
        </p>
      ) : null}
    </div>
  );
}
