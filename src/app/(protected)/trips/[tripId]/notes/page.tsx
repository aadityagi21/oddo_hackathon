import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addNoteFormAction, deleteNoteFormAction } from "@/actions/trips";
import { formatDate } from "@/lib/format";

export default async function NotesPage({
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
      notes: { orderBy: { createdAt: "desc" } },
      stops: { include: { city: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!trip) notFound();

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">Journal</h2>
        {trip.notes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
            Jot hotel details, contacts, or day reminders.
          </p>
        ) : (
          <ul className="space-y-3">
            {trip.notes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <span>{formatDate(n.createdAt)}</span>
                  {n.dayDate ? <span>Day: {formatDate(n.dayDate)}</span> : null}
                  <form action={deleteNoteFormAction}>
                    <input type="hidden" name="tripId" value={trip.id} />
                    <input type="hidden" name="noteId" value={n.id} />
                    <button type="submit" className="text-red-600 underline">
                      Delete
                    </button>
                  </form>
                </div>
                <p className="whitespace-pre-wrap">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="mb-3 font-semibold">New note</h3>
        <form action={addNoteFormAction} className="space-y-3">
          <input type="hidden" name="tripId" value={trip.id} />
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Content</label>
            <textarea
              name="content"
              required
              rows={5}
              className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Link to stop (optional)</label>
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
            <label className="mb-1 block text-xs text-[var(--muted)]">Day date (optional)</label>
            <input name="dayDate" type="date" className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm" />
          </div>
          <button type="submit" className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white">
            Save note
          </button>
        </form>
      </aside>
    </div>
  );
}
