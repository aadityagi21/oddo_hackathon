import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addPackingFormAction,
  togglePackingFormAction,
  deletePackingFormAction,
  resetPackingFormAction,
} from "@/actions/trips";
import { PackingCategory } from "@prisma/client";

const packingCategories: PackingCategory[] = [
  "CLOTHING",
  "DOCUMENTS",
  "ELECTRONICS",
  "TOILETRIES",
  "OTHER",
];

export default async function PackingPage({
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
      packing: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!trip) notFound();

  const grouped = packingCategories.map((cat) => ({
    cat,
    items: trip.packing.filter((p) => p.category === cat),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          Track essentials by category. Reset marks when you reuse this list for another trip.
        </p>
        <form action={resetPackingFormAction}>
          <input type="hidden" name="tripId" value={trip.id} />
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]"
          >
            Reset packed
          </button>
        </form>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Add item</h2>
        <form action={addPackingFormAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="tripId" value={trip.id} />
          <input
            name="title"
            required
            placeholder="e.g. Passport"
            className="min-w-[12rem] flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <select name="category" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {packingCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            Add
          </button>
        </form>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {grouped.map(
          ({ cat, items }) =>
            items.length > 0 && (
              <section key={cat} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {cat}
                </h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[var(--background)] px-3 py-2 text-sm"
                    >
                      <span className={item.packed ? "text-[var(--muted)] line-through" : ""}>
                        {item.title}
                      </span>
                      <div className="flex gap-2">
                        <form action={togglePackingFormAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="packed" value={item.packed ? "false" : "true"} />
                          <button type="submit" className="text-xs text-[var(--accent-strong)] underline">
                            {item.packed ? "Undo" : "Packed"}
                          </button>
                        </form>
                        <form action={deletePackingFormAction}>
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button type="submit" className="text-xs text-red-600 underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}
      </div>

      {trip.packing.length === 0 ? (
        <p className="text-center text-[var(--muted)]">No items yet — add your first above.</p>
      ) : null}
    </div>
  );
}
