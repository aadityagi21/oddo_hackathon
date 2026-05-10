import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addStopFormAction, addCatalogActivityFormAction } from "@/actions/trips";

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ q?: string; country?: string }>;
}) {
  const { tripId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) notFound();

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: user.id },
    include: {
      stops: {
        orderBy: { sortOrder: "asc" },
        include: { city: true },
      },
    },
  });
  if (!trip) notFound();

  const q = (sp.q ?? "").trim().toLowerCase();
  const countryFilter = (sp.country ?? "").trim();

  const cities = await db.city.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { country: { contains: q } },
                { region: { contains: q } },
              ],
            }
          : {},
        countryFilter ? { country: countryFilter } : {},
      ],
    },
    orderBy: [{ popularity: "desc" }, { name: "asc" }],
    take: 40,
  });

  const countries = await db.city.findMany({
    distinct: ["country"],
    select: { country: true },
    orderBy: { country: "asc" },
  });

  const startStr = trip.startDate.toISOString().slice(0, 10);
  const endStr = trip.endDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-2 text-lg font-semibold">City search</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Filter the catalog by name, country, or region. Add cities as new stops on this trip.
        </p>
        <form className="mb-6 flex flex-wrap gap-3" method="get">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Search cities…"
            className="min-w-[12rem] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <select
            name="country"
            defaultValue={countryFilter}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-medium"
          >
            Search
          </button>
        </form>

        <ul className="grid gap-3 md:grid-cols-2">
          {cities.map((city) => (
            <li
              key={city.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div>
                <p className="font-semibold">
                  {city.name}, {city.country}
                </p>
                {city.region ? (
                  <p className="text-xs text-[var(--muted)]">{city.region}</p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Cost index {city.costIndex}/100 · Popularity {city.popularity}/100
                </p>
                {city.description ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">{city.description}</p>
                ) : null}
              </div>
              <form action={addStopFormAction} className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3">
                <input type="hidden" name="tripId" value={trip.id} />
                <input type="hidden" name="cityId" value={city.id} />
                <div>
                  <label className="mb-0.5 block text-[10px] uppercase text-[var(--muted)]">
                    From
                  </label>
                  <input
                    name="arrivalDate"
                    type="date"
                    required
                    defaultValue={startStr}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] uppercase text-[var(--muted)]">
                    To
                  </label>
                  <input
                    name="departureDate"
                    type="date"
                    required
                    defaultValue={endStr}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Add to trip
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Activity ideas by stop</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Curated experiences for cities already on your itinerary.
        </p>
        {trip.stops.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Add at least one stop to browse activities.</p>
        ) : (
          <div className="space-y-8">
            {await Promise.all(
              trip.stops.map(async (stop) => {
                const catalog = await db.activityCatalog.findMany({
                  where: { cityId: stop.cityId },
                  orderBy: { title: "asc" },
                });
                return (
                  <div key={stop.id}>
                    <h3 className="mb-3 font-semibold">
                      {stop.city.name}, {stop.city.country}
                    </h3>
                    {catalog.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No catalog entries for this city.</p>
                    ) : (
                      <ul className="grid gap-3 md:grid-cols-2">
                        {catalog.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
                          >
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {item.category} · ~{item.durationHours}h · cost tier{" "}
                              {item.costLevel}/3
                            </p>
                            {item.description ? (
                              <p className="mt-2 text-[var(--muted)]">{item.description}</p>
                            ) : null}
                            <form
                              action={addCatalogActivityFormAction}
                              className="mt-3 flex flex-wrap items-end gap-2"
                            >
                              <input type="hidden" name="tripId" value={trip.id} />
                              <input type="hidden" name="tripStopId" value={stop.id} />
                              <input type="hidden" name="catalogId" value={item.id} />
                              <div>
                                <label className="mb-0.5 block text-[10px] uppercase text-[var(--muted)]">
                                  Day
                                </label>
                                <input
                                  name="dayDate"
                                  type="date"
                                  required
                                  defaultValue={startStr}
                                  className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                                />
                              </div>
                              <button
                                type="submit"
                                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Add to itinerary
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
