import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  updateProfileAction,
  saveDestinationFormAction,
  removeSavedDestinationAction,
  deleteAccountAction,
} from "@/actions/trips";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [saved, allCities] = await Promise.all([
    db.savedDestination.findMany({
      where: { userId: user.id },
      include: { city: true },
      orderBy: { savedAt: "desc" },
    }),
    db.city.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }] }),
  ]);

  const unsavedCities = allCities.filter(
    (c) => !saved.some((s) => s.cityId === c.id),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & preferences</h1>
        <p className="text-[var(--muted)]">Update how you appear and manage saved inspiration.</p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Your profile</h2>
        <form action={updateProfileAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              name="name"
              defaultValue={user.name}
              required
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email (read-only)</label>
            <input
              value={user.email}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--muted)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Profile photo URL</label>
            <input
              name="imageUrl"
              type="url"
              defaultValue={user.imageUrl ?? ""}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Language</label>
            <select
              name="language"
              defaultValue={user.language}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save profile
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Saved destinations</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Quick list of cities you want to revisit when planning.
        </p>
        {saved.length > 0 ? (
          <ul className="mb-6 space-y-2">
            {saved.map((s) => (
              <li
                key={s.cityId}
                className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-2 text-sm"
              >
                <span>
                  {s.city.name}, {s.city.country}
                </span>
                <form action={removeSavedDestinationAction.bind(null, s.cityId)}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-[var(--muted)]">No saved cities yet.</p>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium">Add city</label>
          <form action={saveDestinationFormAction} className="flex flex-wrap gap-2">
            <select
              name="cityId"
              required
              className="min-w-[12rem] flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <option value="">Choose…</option>
              {unsavedCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[var(--surface-2)] px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">Danger zone</h2>
        <p className="mt-2 text-sm text-red-800 dark:text-red-200">
          Deleting your account removes trips, itineraries, and sessions. This cannot be undone.
        </p>
        <form action={deleteAccountAction} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-100"
          >
            Delete account
          </button>
        </form>
      </section>
    </div>
  );
}
