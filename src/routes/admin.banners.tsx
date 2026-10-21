import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc, Id } from "~convex/_generated/dataModel"

export const Route = createFileRoute("/admin/banners")({
  component: AdminBannersPage,
})

type Banner = Doc<"banners">

type BannerForm = {
  title: string
  subtitle: string
  ctaText: string
  ctaUrl: string
  gradient: string
  order: string
  active: boolean
}

const GRADIENT_PRESETS = [
  "from-brand-600 via-brand-500 to-brand-700",
  "from-sky-600 via-sky-500 to-indigo-700",
  "from-amber-500 via-orange-500 to-rose-600",
  "from-violet-600 via-purple-600 to-fuchsia-700",
]

function emptyForm(order: number): BannerForm {
  return {
    title: "",
    subtitle: "",
    ctaText: "",
    ctaUrl: "",
    gradient: GRADIENT_PRESETS[0],
    order: String(order),
    active: true,
  }
}

function toForm(b: Banner): BannerForm {
  return {
    title: b.title,
    subtitle: b.subtitle ?? "",
    ctaText: b.ctaText ?? "",
    ctaUrl: b.ctaUrl ?? "",
    gradient: b.gradient,
    order: String(b.order),
    active: b.active,
  }
}

function AdminBannersPage() {
  const banners = useQuery(api.banners.list, {})
  const create = useMutation(api.banners.create)
  const update = useMutation(api.banners.update)
  const remove = useMutation(api.banners.remove)

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<Id<"banners"> | null>(null)

  function toArgs(form: BannerForm) {
    return {
      title: form.title,
      subtitle: form.subtitle || undefined,
      ctaText: form.ctaText || undefined,
      ctaUrl: form.ctaUrl || undefined,
      gradient: form.gradient,
      order: Number(form.order) || 0,
      active: form.active,
    }
  }

  async function handleCreate(form: BannerForm) {
    await create(toArgs(form))
    setCreating(false)
  }

  async function handleUpdate(id: Id<"banners">, form: BannerForm) {
    await update({ bannerId: id, ...toArgs(form) })
    setEditingId(null)
  }

  const sorted = banners ? [...banners].sort((a, b) => a.order - b.order) : undefined

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Баннеры</h1>
          <p className="mt-1 text-ink-500">Слайды на главной странице.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setCreating(true)}
        >
          + Добавить баннер
        </button>
      </div>

      {creating && (
        <div className="card mt-4 p-5">
          <BannerFormFields
            initial={emptyForm((banners?.length ?? 0) + 1)}
            onCancel={() => setCreating(false)}
            onSubmit={handleCreate}
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {sorted === undefined &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-ink-100" />
          ))}

        {sorted?.length === 0 && !creating && (
          <p className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
            Баннеров пока нет.
          </p>
        )}

        {sorted?.map((banner) =>
          editingId === banner._id ? (
            <div key={banner._id} className="card p-5">
              <BannerFormFields
                initial={toForm(banner)}
                onCancel={() => setEditingId(null)}
                onSubmit={(form) => handleUpdate(banner._id, form)}
              />
            </div>
          ) : (
            <div key={banner._id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span
                  className={`h-10 w-16 shrink-0 rounded-lg bg-gradient-to-br ${banner.gradient}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-900">{banner.title}</p>
                    {!banner.active && <span className="chip">скрыт</span>}
                  </div>
                  <p className="text-sm text-ink-500">Порядок: {banner.order}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditingId(banner._id)}>
                  Изменить
                </button>
                <button
                  className="btn-ghost text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`Удалить баннер «${banner.title}»?`)) {
                      void remove({ bannerId: banner._id })
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

function BannerFormFields({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: BannerForm
  onCancel: () => void
  onSubmit: (form: BannerForm) => Promise<void> | void
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
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Заголовок</label>
        <input
          className="input"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Подзаголовок</label>
        <input
          className="input"
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Текст кнопки</label>
          <input
            className="input"
            value={form.ctaText}
            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Ссылка кнопки</label>
          <input
            className="input"
            type="url"
            value={form.ctaUrl}
            onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Градиент</label>
        <div className="flex flex-wrap gap-2">
          {GRADIENT_PRESETS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setForm({ ...form, gradient: g })}
              className={`h-9 w-16 rounded-lg bg-gradient-to-br ${g} ${form.gradient === g ? "ring-2 ring-brand-600 ring-offset-2" : ""}`}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Порядок</label>
          <input
            className="input"
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Активен (показывается на главной)
        </label>
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
