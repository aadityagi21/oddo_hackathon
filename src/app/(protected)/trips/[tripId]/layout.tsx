import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TripSubnav } from "@/components/trip-subnav";
import { formatDate } from "@/lib/format";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const trip = await db.trip.findFirst({
    where: { id: tripId, userId: user.id },
  });
  if (!trip) notFound();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
        <p className="text-sm text-[var(--muted)]">
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          {trip.description ? ` · ${trip.description}` : ""}
        </p>
        <TripSubnav tripId={trip.id} />
      </div>
      {children}
    </div>
  );
}
