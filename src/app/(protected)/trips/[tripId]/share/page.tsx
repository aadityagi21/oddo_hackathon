import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { setTripPublicFormAction, duplicateTripFormAction } from "@/actions/trips";

export default async function SharePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: user.id },
  });
  if (!trip) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicUrl = `${proto}://${host}/share/${trip.shareSlug}`;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Public link</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {trip.isPublic
            ? "Anyone with the link can view a read-only version of this itinerary."
            : "This trip is private. Publish to generate a shareable URL."}
        </p>
        <p className="mt-4 break-all rounded-lg bg-[var(--background)] p-3 font-mono text-sm">
          {publicUrl}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {trip.isPublic ? (
            <form action={setTripPublicFormAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="isPublic" value="false" />
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
              >
                Make private
              </button>
            </form>
          ) : (
            <form action={setTripPublicFormAction}>
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="isPublic" value="true" />
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Publish trip
              </button>
            </form>
          )}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My ${trip.name} plan on Traveloop`)}&url=${encodeURIComponent(publicUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            Share on X
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Duplicate for variants</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create a full copy you can tweak without affecting this version.
        </p>
        <form action={duplicateTripFormAction} className="mt-4">
          <input type="hidden" name="tripId" value={trip.id} />
          <button
            type="submit"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            Copy trip
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)] shadow-sm">
        <p>
          Trip: <span className="font-medium text-[var(--foreground)]">{trip.name}</span> ·{" "}
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
        </p>
      </section>
    </div>
  );
}
