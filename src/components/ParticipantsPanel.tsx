import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Id } from "~convex/_generated/dataModel"

// Список участников события для организатора/админа: раскрывается по кнопке,
// есть выгрузка в CSV и снятие участника.
export function ParticipantsPanel({ eventId, title }: { eventId: Id<"events">; title: string }) {
  const [open, setOpen] = useState(false)
  const rows = useQuery(api.registrations.listForEvent, open ? { eventId } : "skip")
  const count = useQuery(api.registrations.countForEvent, { eventId })
  const remove = useMutation(api.registrations.removeParticipant)

  function exportCsv() {
    if (!rows) return
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    const lines = [
      ["ФИО", "Телефон", "Возрастная категория", "Клуб / тренер"].map(esc).join(";"),
      ...rows.map((r) => [r.fullName, r.phone, r.ageCategory ?? "", r.club ?? ""].map(esc).join(";")),
    ]
    // BOM, чтобы Excel правильно открыл кириллицу
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `участники — ${title}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mt-2">
      <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => setOpen((v) => !v)}>
        Участники{count !== undefined ? ` (${count})` : ""}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-ink-100 p-3 text-sm">
          {rows === undefined && <p className="text-ink-500">Загрузка…</p>}
          {rows?.length === 0 && <p className="text-ink-500">Пока никто не записался.</p>}
          {rows && rows.length > 0 && (
            <>
              <ul className="divide-y divide-ink-100">
                {rows.map((r, i) => (
                  <li key={r._id} className="flex items-start justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium text-ink-900">
                        {i + 1}. {r.fullName}
                      </p>
                      <p className="text-xs text-ink-500">
                        {r.phone}
                        {r.ageCategory ? ` · ${r.ageCategory}` : ""}
                        {r.club ? ` · ${r.club}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost !px-2 !py-1 text-xs text-red-600"
                      onClick={() => {
                        if (confirm(`Снять участника «${r.fullName}»?`)) void remove({ registrationId: r._id })
                      }}
                    >
                      Снять
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-secondary mt-2 !py-1 text-xs" onClick={exportCsv}>
                Скачать CSV
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
