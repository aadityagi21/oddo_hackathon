import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { addExpenseFormAction, deleteExpenseFormAction } from "@/actions/trips";
import { ExpenseCategory } from "@prisma/client";

const expenseCategories: ExpenseCategory[] = [
  "TRANSPORT",
  "STAY",
  "ACTIVITY",
  "MEALS",
  "OTHER",
];

export default async function BudgetPage({
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
      expenses: true,
      stops: {
        include: { activities: true, city: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!trip) notFound();

  const activityTotal = trip.stops.reduce(
    (sum, s) => sum + s.activities.reduce((a, b) => a + b.costEstimate, 0),
    0,
  );
  const expenseTotal = trip.expenses.reduce((s, e) => s + e.amount, 0);
  const grandTotal = activityTotal + expenseTotal;

  const msPerDay = 86400000;
  const tripDays = Math.max(
    1,
    Math.ceil((+trip.endDate - +trip.startDate) / msPerDay) + 1,
  );
  const perDay = grandTotal / tripDays;

  const daySpend = new Map<string, number>();
  for (const s of trip.stops) {
    for (const a of s.activities) {
      const key = a.dayDate.toISOString().slice(0, 10);
      daySpend.set(key, (daySpend.get(key) ?? 0) + a.costEstimate);
    }
  }
  const alertDays = [...daySpend.entries()].filter(([, v]) => v > 250);

  const chartParts = [
    { label: "Activities (est.)", value: activityTotal, color: "bg-teal-500" },
    { label: "Transport", value: trip.expenses.filter((e) => e.category === "TRANSPORT").reduce((s, e) => s + e.amount, 0), color: "bg-sky-500" },
    { label: "Stay", value: trip.expenses.filter((e) => e.category === "STAY").reduce((s, e) => s + e.amount, 0), color: "bg-indigo-500" },
    { label: "Meals", value: trip.expenses.filter((e) => e.category === "MEALS").reduce((s, e) => s + e.amount, 0), color: "bg-amber-500" },
    { label: "Other expenses", value: trip.expenses.filter((e) => e.category === "OTHER" || e.category === "ACTIVITY").reduce((s, e) => s + e.amount, 0), color: "bg-slate-500" },
  ].filter((p) => p.value > 0);

  const maxBar = Math.max(...chartParts.map((p) => p.value), 1);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="mt-2 text-3xl font-bold">{formatMoney(grandTotal)}</p>
          <p className="text-sm text-[var(--muted)]">
            Activities (estimated) + logged expenses · ~{formatMoney(perDay)} per day over{" "}
            {tripDays} day{tripDays === 1 ? "" : "s"}
          </p>
          {alertDays.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Busy spend days (&gt; $250 in activities)</p>
              <ul className="mt-1 list-inside list-disc">
                {alertDays.map(([d]) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Breakdown</h2>
          <div className="space-y-3">
            {chartParts.map((p) => (
              <div key={p.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{p.label}</span>
                  <span className="font-medium">{formatMoney(p.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className={`h-full ${p.color}`}
                    style={{ width: `${(p.value / maxBar) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Expense log</h2>
          {trip.expenses.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No manual expenses yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {trip.expenses.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{e.label}</p>
                    <p className="text-xs text-[var(--muted)]">{e.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatMoney(e.amount)}</span>
                    <form action={deleteExpenseFormAction}>
                      <input type="hidden" name="tripId" value={trip.id} />
                      <input type="hidden" name="expenseId" value={e.id} />
                      <button type="submit" className="text-xs text-red-600 underline">
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Add expense</h3>
          <form action={addExpenseFormAction} className="space-y-3">
            <input type="hidden" name="tripId" value={trip.id} />
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Label</label>
              <input name="label" required className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Amount</label>
              <input name="amount" type="number" min={0} step={0.01} required className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Category</label>
              <select name="category" className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm">
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Stop (optional)</label>
              <select name="tripStopId" className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm">
                <option value="">—</option>
                {trip.stops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.city.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">Date (optional)</label>
              <input name="expenseDate" type="date" className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white">
              Add
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
