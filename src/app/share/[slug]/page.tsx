import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDayLabel, formatMoney } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";
import { duplicateFromSlugFormAction } from "@/actions/trips";

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = await db.trip.findFirst({
    where: { shareSlug: slug, isPublic: true },
    include: {
      user: { select: { name: true } },
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

  const viewer = await getCurrentUser();

  return (
    <div className="min-h-full bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
              Traveloop · Shared plan
            </p>
            <h1 className="text-2xl font-bold">{trip.name}</h1>
            <p className="text-sm text-[var(--muted)]">
              By {trip.user.name} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewer ? (
              <form action={duplicateFromSlugFormAction}>
                <input type="hidden" name="slug" value={slug} />
                <button
                  type="submit"
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Copy trip
                </button>
              </form>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/share/${slug}`)}`}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
              >
                Log in to copy
              </Link>
            )}
            <Link href="/signup" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium">
              Join Traveloop
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        {trip.description ? (
          <p className="text-[var(--muted)]">{trip.description}</p>
        ) : null}
        {trip.stops.map((stop, i) => (
          <section key={stop.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              {i + 1}. {stop.city.name}, {stop.city.country}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {formatDate(stop.arrivalDate)} – {formatDate(stop.departureDate)}
            </p>
            {stop.activities.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No activities listed.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {stop.activities.map((a) => (
                  <li key={a.id} className="rounded-lg bg-[var(--background)] px-3 py-2 text-sm">
                    <span className="font-medium">{a.title}</span>
                    <span className="text-[var(--muted)]">
                      {" "}
                      · {formatDayLabel(a.dayDate)}
                      {a.startTime ? ` · ${a.startTime}` : ""} · {formatMoney(a.costEstimate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
