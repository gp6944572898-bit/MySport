import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc, Id } from "~convex/_generated/dataModel"

export const Route = createFileRoute("/admin/venues")({
  component: AdminVenuesPage,
})

type Venue = Doc<"venues">

type VenueForm = {
  name: string
  address: string
  city: string
  lat: string
  lng: string
}

const emptyForm: VenueForm = { name: "", address: "", city: "", lat: "", lng: "" }

function toForm(v: Venue): VenueForm {
  return {
    name: v.name,
    address: v.address,
    city: v.city,
    lat: v.lat !== undefined ? String(v.lat) : "",
    lng: v.lng !== undefined ? String(v.lng) : "",
  }
}

function AdminVenuesPage() {
  const venues = useQuery(api.venues.list, {})
  const create = useMutation(api.venues.create)
  const update = useMutation(api.venues.update)
  const remove = useMutation(api.venues.remove)

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<Id<"venues"> | null>(null)

  async function handleCreate(form: VenueForm) {
    await create({
      name: form.name,
      address: form.address,
      city: form.city,
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
    })
    setCreating(false)
  }

  async function handleUpdate(id: Id<"venues">, form: VenueForm) {
    await update({
      venueId: id,
      name: form.name,
      address: form.address,
      city: form.city,
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
    })
    setEditingId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Площадки</h1>
          <p className="mt-1 text-ink-500">Места проведения соревнований.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          + Добавить площадку
        </button>
      </div>

      {creating && (
        <div className="card mt-4 p-5">
          <VenueFormFields
            initial={emptyForm}
            onCancel={() => setCreating(false)}
            onSubmit={handleCreate}
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {venues === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-100" />
          ))}

        {venues?.length === 0 && !creating && (
          <p className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
            Площадок пока нет.
          </p>
        )}

        {venues?.map((venue) =>
          editingId === venue._id ? (
            <div key={venue._id} className="card p-5">
              <VenueFormFields
                initial={toForm(venue)}
                onCancel={() => setEditingId(null)}
                onSubmit={(form) => handleUpdate(venue._id, form)}
              />
            </div>
          ) : (
            <div key={venue._id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink-900">{venue.name}</p>
                <p className="text-sm text-ink-500">
                  {venue.city}
                  {venue.address ? `, ${venue.address}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditingId(venue._id)}>
                  Изменить
                </button>
                <button
                  className="btn-ghost text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`Удалить площадку «${venue.name}»?`)) {
                      void remove({ venueId: venue._id })
                    }
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function VenueFormFields({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: VenueForm
  onCancel: () => void
  onSubmit: (form: VenueForm) => Promise<void> | void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Название</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Город</label>
          <input
            className="input"
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Адрес</label>
        <input
          className="input"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Широта (lat)</label>
          <input
            className="input"
            type="number"
            step="any"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Долгота (lng)</label>
          <input
            className="input"
            type="number"
            step="any"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: e.target.value })}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  )
}
