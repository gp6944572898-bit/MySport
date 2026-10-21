# Мой Спорт

Спортивная коммьюнити-платформа (MVP) на TanStack Start + Convex: афиша
событий, справочник видов спорта и дисциплин (синхронизированный с
официальным Всероссийским реестром видов спорта, ВРВС), площадки, баннеры
и админ-панель.

> Проект изначально собирался в Macaly Cloud, но тот деплоймент стал
> недоступен (упёрлись в квоту облачных действий), поэтому начиная с этого
> коммита приложение (scaffold, Convex-бэкенд, публичные страницы и
> админка) написано заново прямо в этом репозитории — см. `BUILD_NOTES.md`
> для команд запуска и честного списка непроверенного.

## Структура

- `convex/schema.ts` — вся схема: `sports`, `venues`, `events`, `banners`,
  плюс `authTables` из `@convex-dev/auth/server`.
- `convex/sports.ts`, `convex/venues.ts`, `convex/events.ts`,
  `convex/banners.ts` — CRUD-функции для соответствующих таблиц.
- `convex/auth.ts`, `convex/http.ts` — настройка `@convex-dev/auth`
  (вход по email + паролю).
- `convex/lib/authz.ts` — `requireUserId`, проверяет реальную сессию через
  `getAuthUserId` из `@convex-dev/auth/server`.
- `convex/migrations.ts` — одноразовая миграция `syncRegistryWithDisciplines`:
  синхронизирует раздел/код/номер видов спорта по официальному реестру и
  подгружает дисциплины из seed-чанков `convex/seedData/disc-01.json` …
  `disc-10.json`. Безопасно перезапускать.
- `src/data/sports-registry.json` — 206 видов спорта из реестра ВРВС.
- `src/routes/` — файловый роутинг TanStack Router: публичные страницы
  (`/`, `/afisha`, `/sports`, `/login`) и админка (`/admin/*`, защищена
  авторизацией).

Подробности запуска, переменные окружения и список непроверенного — в
[`BUILD_NOTES.md`](./BUILD_NOTES.md).
