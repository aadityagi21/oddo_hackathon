"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  ActivityCategory,
  ExpenseCategory,
  PackingCategory,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function assertTripOwner(tripId: string, userId: string) {
  const trip = await db.trip.findFirst({
    where: { id: tripId, userId },
  });
  if (!trip) throw new Error("Trip not found");
  return trip;
}

export async function createTripAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const start = new Date(String(formData.get("startDate")));
  const end = new Date(String(formData.get("endDate")));
  const coverImageUrl =
    String(formData.get("coverImageUrl") ?? "").trim() || null;
  if (!name || Number.isNaN(+start) || Number.isNaN(+end) || end < start) {
    throw new Error("Invalid trip details");
  }
  const trip = await db.trip.create({
    data: {
      userId: user.id,
      name,
      description,
      startDate: start,
      endDate: end,
      coverImageUrl,
      shareSlug: nanoid(12),
    },
  });
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  redirect(`/trips/${trip.id}`);
}

export async function updateTripAction(tripId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const start = new Date(String(formData.get("startDate")));
  const end = new Date(String(formData.get("endDate")));
  const coverImageUrl =
    String(formData.get("coverImageUrl") ?? "").trim() || null;
  if (!name || Number.isNaN(+start) || Number.isNaN(+end) || end < start) {
    throw new Error("Invalid trip details");
  }
  await db.trip.update({
    where: { id: tripId },
    data: { name, description, startDate: start, endDate: end, coverImageUrl },
  });
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  revalidatePath("/dashboard");
}

export async function deleteTripAction(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.trip.delete({ where: { id: tripId } });
  revalidatePath("/trips");
  revalidatePath("/dashboard");
  redirect("/trips");
}

export async function addStopAction(
  tripId: string,
  cityId: string,
  arrivalDate: string,
  departureDate: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  if (Number.isNaN(+arrival) || Number.isNaN(+departure) || departure < arrival) {
    throw new Error("Invalid stop dates");
  }
  const maxOrder = await db.tripStop.aggregate({
    where: { tripId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  await db.tripStop.create({
    data: {
      tripId,
      cityId,
      arrivalDate: arrival,
      departureDate: departure,
      sortOrder,
    },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteStopAction(tripId: string, stopId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.tripStop.deleteMany({
    where: { id: stopId, tripId },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function reorderStopsAction(tripId: string, orderedStopIds: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.$transaction(
    orderedStopIds.map((id, index) =>
      db.tripStop.updateMany({
        where: { id, tripId },
        data: { sortOrder: index },
      }),
    ),
  );
  revalidatePath(`/trips/${tripId}`);
}

export async function moveStopAction(
  tripId: string,
  stopId: string,
  direction: "up" | "down",
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const stops = await db.tripStop.findMany({
    where: { tripId },
    orderBy: { sortOrder: "asc" },
  });
  const ids = stops.map((s) => s.id);
  const idx = ids.indexOf(stopId);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ids.length) return;
  const next = [...ids];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  await reorderStopsAction(tripId, next);
}

export async function addActivityFromCatalogAction(
  tripId: string,
  tripStopId: string,
  catalogId: string,
  dayDate: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const stop = await db.tripStop.findFirst({
    where: { id: tripStopId, tripId },
  });
  if (!stop) throw new Error("Stop not found");
  const catalog = await db.activityCatalog.findUnique({
    where: { id: catalogId },
  });
  if (!catalog || catalog.cityId !== stop.cityId) {
    throw new Error("Activity not available for this city");
  }
  const day = new Date(dayDate);
  if (Number.isNaN(+day)) throw new Error("Invalid day");
  const max = await db.stopActivity.aggregate({
    where: { tripStopId },
    _max: { sortOrder: true },
  });
  const costEstimate = catalog.costLevel * 35;
  await db.stopActivity.create({
    data: {
      tripStopId,
      title: catalog.title,
      description: catalog.description,
      category: catalog.category,
      dayDate: day,
      startTime: "10:00",
      endTime: null,
      costEstimate,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function addCustomActivityAction(
  tripId: string,
  tripStopId: string,
  data: {
    title: string;
    dayDate: string;
    category: ActivityCategory;
    startTime?: string;
    costEstimate?: number;
    description?: string;
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const stop = await db.tripStop.findFirst({
    where: { id: tripStopId, tripId },
  });
  if (!stop) throw new Error("Stop not found");
  const day = new Date(data.dayDate);
  if (Number.isNaN(+day)) throw new Error("Invalid day");
  const max = await db.stopActivity.aggregate({
    where: { tripStopId },
    _max: { sortOrder: true },
  });
  await db.stopActivity.create({
    data: {
      tripStopId,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      dayDate: day,
      startTime: data.startTime ?? null,
      costEstimate: data.costEstimate ?? 0,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteActivityAction(
  tripId: string,
  activityId: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const activity = await db.stopActivity.findUnique({
    where: { id: activityId },
    include: { tripStop: true },
  });
  if (!activity || activity.tripStop.tripId !== tripId) {
    throw new Error("Activity not found");
  }
  await db.stopActivity.delete({ where: { id: activityId } });
  revalidatePath(`/trips/${tripId}`);
}

export async function addExpenseAction(
  tripId: string,
  input: {
    category: ExpenseCategory;
    label: string;
    amount: number;
    tripStopId?: string | null;
    expenseDate?: string | null;
  },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  if (input.tripStopId) {
    const s = await db.tripStop.findFirst({
      where: { id: input.tripStopId, tripId },
    });
    if (!s) throw new Error("Invalid stop");
  }
  await db.tripExpense.create({
    data: {
      tripId,
      tripStopId: input.tripStopId ?? null,
      category: input.category,
      label: input.label,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
    },
  });
  revalidatePath(`/trips/${tripId}/budget`);
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteExpenseAction(tripId: string, expenseId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.tripExpense.deleteMany({
    where: { id: expenseId, tripId },
  });
  revalidatePath(`/trips/${tripId}/budget`);
}

export async function addPackingItemAction(
  tripId: string,
  title: string,
  category: PackingCategory,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const max = await db.packingItem.aggregate({
    where: { tripId },
    _max: { sortOrder: true },
  });
  await db.packingItem.create({
    data: {
      tripId,
      title,
      category,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/trips/${tripId}/packing`);
}

export async function togglePackingItemAction(
  tripId: string,
  itemId: string,
  packed: boolean,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.packingItem.updateMany({
    where: { id: itemId, tripId },
    data: { packed },
  });
  revalidatePath(`/trips/${tripId}/packing`);
}

export async function deletePackingItemAction(tripId: string, itemId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.packingItem.deleteMany({
    where: { id: itemId, tripId },
  });
  revalidatePath(`/trips/${tripId}/packing`);
}

export async function resetPackingAction(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.packingItem.updateMany({
    where: { tripId },
    data: { packed: false },
  });
  revalidatePath(`/trips/${tripId}/packing`);
}

export async function addNoteAction(
  tripId: string,
  content: string,
  tripStopId?: string | null,
  dayDate?: string | null,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  if (tripStopId) {
    const s = await db.tripStop.findFirst({
      where: { id: tripStopId, tripId },
    });
    if (!s) throw new Error("Invalid stop");
  }
  await db.tripNote.create({
    data: {
      tripId,
      tripStopId: tripStopId ?? null,
      dayDate: dayDate ? new Date(dayDate) : null,
      content,
    },
  });
  revalidatePath(`/trips/${tripId}/notes`);
}

export async function deleteNoteAction(tripId: string, noteId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  await db.tripNote.deleteMany({
    where: { id: noteId, tripId },
  });
  revalidatePath(`/trips/${tripId}/notes`);
}

export async function setTripPublicAction(tripId: string, isPublic: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await assertTripOwner(tripId, user.id);
  const updated = await db.trip.update({
    where: { id: tripId },
    data: { isPublic },
  });
  revalidatePath(`/trips/${tripId}/share`);
  revalidatePath(`/share/${updated.shareSlug}`);
}

const profileSchema = z.object({
  name: z.string().min(1).max(80),
  language: z.string().min(2).max(10),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    language: formData.get("language"),
    imageUrl: formData.get("imageUrl"),
  });
  if (!parsed.success) throw new Error("Invalid profile");
  const { name, language, imageUrl } = parsed.data;
  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      language,
      imageUrl: imageUrl || null,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function saveDestinationAction(cityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const exists = await db.savedDestination.findFirst({
    where: { userId: user.id, cityId },
  });
  if (!exists) {
    await db.savedDestination.create({
      data: { userId: user.id, cityId },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function saveDestinationFormAction(formData: FormData) {
  const cityId = String(formData.get("cityId") ?? "");
  return saveDestinationAction(cityId);
}

export async function removeSavedDestinationAction(cityId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await db.savedDestination.deleteMany({
    where: { userId: user.id, cityId },
  });
  revalidatePath("/settings");
}

export async function deleteAccountAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await db.user.delete({ where: { id: user.id } });
  const { cookies } = await import("next/headers");
  const { SESSION_COOKIE } = await import("@/lib/auth");
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function duplicateTripAction(sourceTripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const source = await db.trip.findFirst({
    where: { id: sourceTripId },
    include: {
      stops: {
        include: { activities: true },
        orderBy: { sortOrder: "asc" },
      },
      expenses: true,
      packing: true,
      notes: true,
    },
  });
  if (!source) throw new Error("Trip not found");
  if (source.userId !== user.id && !source.isPublic) {
    throw new Error("Cannot copy this trip");
  }

  const newTrip = await db.trip.create({
    data: {
      userId: user.id,
      name: `${source.name} (copy)`,
      description: source.description,
      startDate: source.startDate,
      endDate: source.endDate,
      coverImageUrl: source.coverImageUrl,
      shareSlug: nanoid(12),
      isPublic: false,
    },
  });

  const stopIdMap = new Map<string, string>();
  for (const stop of source.stops) {
    const ns = await db.tripStop.create({
      data: {
        tripId: newTrip.id,
        cityId: stop.cityId,
        sortOrder: stop.sortOrder,
        arrivalDate: stop.arrivalDate,
        departureDate: stop.departureDate,
      },
    });
    stopIdMap.set(stop.id, ns.id);
    for (const act of stop.activities) {
      await db.stopActivity.create({
        data: {
          tripStopId: ns.id,
          title: act.title,
          description: act.description,
          category: act.category,
          dayDate: act.dayDate,
          startTime: act.startTime,
          endTime: act.endTime,
          costEstimate: act.costEstimate,
          sortOrder: act.sortOrder,
        },
      });
    }
  }

  for (const e of source.expenses) {
    await db.tripExpense.create({
      data: {
        tripId: newTrip.id,
        tripStopId: e.tripStopId ? stopIdMap.get(e.tripStopId) ?? null : null,
        category: e.category,
        label: e.label,
        amount: e.amount,
        expenseDate: e.expenseDate,
      },
    });
  }
  for (const p of source.packing) {
    await db.packingItem.create({
      data: {
        tripId: newTrip.id,
        title: p.title,
        category: p.category,
        packed: false,
        sortOrder: p.sortOrder,
      },
    });
  }
  for (const n of source.notes) {
    await db.tripNote.create({
      data: {
        tripId: newTrip.id,
        tripStopId: n.tripStopId ? stopIdMap.get(n.tripStopId) ?? null : null,
        dayDate: n.dayDate,
        content: n.content,
      },
    });
  }

  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return newTrip.id;
}

export async function duplicateTripBySlugAction(slug: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/share/${slug}`)}`);
  }
  const trip = await db.trip.findUnique({ where: { shareSlug: slug } });
  if (!trip || !trip.isPublic) throw new Error("Not found");
  const newId = await duplicateTripAction(trip.id);
  redirect(`/trips/${newId}`);
}

export async function duplicateTripFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const newId = await duplicateTripAction(tripId);
  redirect(`/trips/${newId}`);
}

export async function duplicateFromSlugFormAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  await duplicateTripBySlugAction(slug);
}

export async function resetPackingFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  return resetPackingAction(tripId);
}

export async function addStopFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const cityId = String(formData.get("cityId") ?? "");
  const arrivalDate = String(formData.get("arrivalDate") ?? "");
  const departureDate = String(formData.get("departureDate") ?? "");
  return addStopAction(tripId, cityId, arrivalDate, departureDate);
}

export async function moveStopFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const stopId = String(formData.get("stopId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  return moveStopAction(tripId, stopId, direction);
}

export async function addCustomActivityFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tripStopId = String(formData.get("tripStopId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const dayDate = String(formData.get("dayDate") ?? "");
  const category = String(formData.get("category") ?? "OTHER") as ActivityCategory;
  const startTime = String(formData.get("startTime") ?? "") || undefined;
  const costEstimate = Number(formData.get("costEstimate") ?? 0);
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (!title) throw new Error("Title required");
  return addCustomActivityAction(tripId, tripStopId, {
    title,
    dayDate,
    category,
    startTime,
    costEstimate,
    description,
  });
}

export async function addCatalogActivityFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tripStopId = String(formData.get("tripStopId") ?? "");
  const catalogId = String(formData.get("catalogId") ?? "");
  const dayDate = String(formData.get("dayDate") ?? "");
  return addActivityFromCatalogAction(tripId, tripStopId, catalogId, dayDate);
}

export async function addExpenseFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const category = String(formData.get("category") ?? "OTHER") as ExpenseCategory;
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const tripStopIdRaw = formData.get("tripStopId");
  const tripStopId =
    typeof tripStopIdRaw === "string" && tripStopIdRaw.length > 0
      ? tripStopIdRaw
      : null;
  const expenseDateRaw = formData.get("expenseDate");
  const expenseDate =
    typeof expenseDateRaw === "string" && expenseDateRaw.length > 0
      ? expenseDateRaw
      : null;
  if (!label || !amount) throw new Error("Invalid expense");
  return addExpenseAction(tripId, {
    category,
    label,
    amount,
    tripStopId,
    expenseDate,
  });
}

export async function addPackingFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "OTHER") as PackingCategory;
  if (!title) throw new Error("Item required");
  return addPackingItemAction(tripId, title, category);
}

export async function addNoteFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const tripStopIdRaw = formData.get("tripStopId");
  const tripStopId =
    typeof tripStopIdRaw === "string" && tripStopIdRaw.length > 0
      ? tripStopIdRaw
      : null;
  const dayDateRaw = formData.get("dayDate");
  const dayDate =
    typeof dayDateRaw === "string" && dayDateRaw.length > 0 ? dayDateRaw : null;
  if (!content) throw new Error("Note required");
  return addNoteAction(tripId, content, tripStopId, dayDate);
}

export async function deleteStopFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const stopId = String(formData.get("stopId") ?? "");
  return deleteStopAction(tripId, stopId);
}

export async function deleteActivityFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  return deleteActivityAction(tripId, activityId);
}

export async function deleteExpenseFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const expenseId = String(formData.get("expenseId") ?? "");
  return deleteExpenseAction(tripId, expenseId);
}

export async function deletePackingFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  return deletePackingItemAction(tripId, itemId);
}

export async function togglePackingFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const packed = formData.get("packed") === "true";
  return togglePackingItemAction(tripId, itemId, packed);
}

export async function deleteNoteFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  return deleteNoteAction(tripId, noteId);
}

export async function setTripPublicFormAction(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const raw = formData.get("isPublic");
  const isPublic = raw === "true" || raw === "on";
  return setTripPublicAction(tripId, isPublic);
}
