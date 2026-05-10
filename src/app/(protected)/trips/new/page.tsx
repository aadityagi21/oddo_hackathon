import Link from "next/link";
import { createTripAction } from "@/actions/trips";

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/trips"
          className="text-sm font-medium text-[var(--accent-strong)] hover:underline"
        >
          ← Back to trips
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Create trip</h1>
        <p className="text-[var(--muted)]">Name your journey and set travel dates.</p>
      </div>
      <form action={createTripAction} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">Trip name</label>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            placeholder="e.g. Spring in Iberia"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Start date</label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">End date</label>
            <input
              name="endDate"
              type="date"
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            placeholder="Optional notes, goals, or companions."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Cover image URL</label>
          <input
            name="coverImageUrl"
            type="url"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
            placeholder="https://…"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white shadow hover:opacity-95"
        >
          Save trip
        </button>
      </form>
    </div>
  );
}
