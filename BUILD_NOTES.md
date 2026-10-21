# BUILD_NOTES

Как запустить проект локально, и честный список того, что не проверено
(весь этот код написан вручную, без доступа к npm-реестру и без возможности
прогнать `npm install` / `vite build` / `tsc` / `convex dev` в песочнице,
где он создавался — см. предупреждение ниже).

## Запуск локально

```bash
# 1. Установить зависимости
pnpm install
# (или npm install / yarn — package.json не завязан на конкретный пакетный менеджер)

# 2. Поднять Convex-бэкенд (создаст convex/_generated, спросит логин в Convex
#    при первом запуске, создаст/подключит dev-деплоймент и запишет
#    CONVEX_DEPLOYMENT + VITE_CONVEX_URL в .env.local)
npx convex dev

# 3. В отдельном терминале — одноразово прогнать миграцию, которая заполняет
#    таблицу sports из реестра ВРВС и дисциплин (безопасно перезапускать)
npx convex run migrations:syncRegistryWithDisciplines

# 4. Запустить фронтенд
pnpm dev
```

### Переменные окружения

- `VITE_CONVEX_URL` — URL Convex-деплоймента, пишется автоматически в
  `.env.local` командой `npx convex dev` (не коммитить .env.local — он в
  .gitignore).
- `@convex-dev/auth` на бэкенде дополнительно требует переменные
  `JWT_PRIVATE_KEY` и `JWKS`, либо их генерирует `npx @convex-dev/auth` /
  `npx convex env` при первой настройке — см. официальный гайд
  (`npx @convex-dev/auth` интерактивно настраивает ключи в Convex-деплойменте,
  это нужно запустить один раз после `npx convex dev`).

### Первый вход в админку

Password-провайдер из `@convex-dev/auth` допускает самостоятельную
регистрацию (`flow: "signUp"`) прямо на `/login` — отдельного seed-скрипта
для создания первого администратора нет. Для MVP вход = авторизация (любой
зарегистрированный пользователь получает доступ к `/admin`); разграничение
ролей (admin/editor/viewer) не реализовано и было бы следующим шагом.

## Что сделано

- Схема Convex (`convex/schema.ts`): таблицы `sports` (как было, не
  менялась), `venues`, `events`, `banners`, плюс `authTables` из
  `@convex-dev/auth/server`.
- CRUD-функции: `convex/venues.ts`, `convex/events.ts`, `convex/banners.ts`
  (list/create/update/remove), в стиле уже существующего `convex/sports.ts`.
- `convex/auth.ts` + `convex/http.ts` — Password-провайдер `@convex-dev/auth`.
- `convex/lib/authz.ts` — реальный `requireUserId` через `getAuthUserId`
  (замена прежней заглушки).
- Публичные страницы: `/` (баннеры + ближайшие события), `/afisha` (фильтр
  по городу/виду спорта), `/sports` (разделы реестра, клик — дисциплины),
  `/login` (вход/регистрация).
- Админка `/admin` (защищена `useConvexAuth`, неавторизованных отправляет
  на `/login`): дашборд со счётчиками, `/admin/sports` (ключевая фича —
  клик по строке разворачивает список дисциплин, отдельная кнопка-карандаш
  с `stopPropagation()` редактирует сам вид спорта, у каждой дисциплины
  свой карандаш для инлайн-переименования + кнопка удаления + поле
  добавления), `/admin/events`, `/admin/venues`, `/admin/banners` —
  списки с инлайн-формами создания/редактирования и удалением.
- Tailwind CSS с собственной цветовой палитрой (`brand` — зелёный,
  `ink` — нейтральный) вместо дефолтных серых тонов.

## Что НЕ проверено / упрощено

Среда, в которой это писалось, **не имела доступа к npm-реестру и не могла
запустить `npm install`, `vite build`, `tsc --noEmit` или `npx convex dev`**.
Весь код написан вручную по памяти об актуальном API TanStack Start,
TanStack Router, Convex и `@convex-dev/auth` — ничего из этого не
скомпилировано и не выполнено. Перед реальным деплоем стоит прогнать:

1. **`pnpm install` + `pnpm typecheck`** — первым делом. Вероятные места
   ошибок:
   - Версии пакетов в `package.json` (React 19, `@tanstack/react-router`
     и `@tanstack/react-start` ^1.121, `convex` ^1.24, `@convex-dev/auth`
     ^0.0.81) — зафиксированы по памяти, конкретные патч-версии могут не
     существовать на момент установки; возможно, их придётся подправить
     под актуальные релизы.
   - `vite.config.ts` — импорт `tanstackStart` из
     `@tanstack/react-start/plugin/vite` и его опции могли измениться
     между версиями пакета.
   - Путь `~convex/*` (алиас на `./convex/*` в `tsconfig.json`) — должен
     подхватываться `vite-tsconfig-paths`, но не проверялся на реальной
     сборке.
2. **`npx convex dev`** — сгенерирует `convex/_generated/*`, на который
   опираются все импорты `api`/`Doc`/`Id`. Если в процессе codegen Convex
   найдёт несовместимость схемы/функций — это выявится только тут.
3. **`@convex-dev/auth` настройка** — `convex/auth.ts` и `convex/http.ts`
   написаны по стандартному шаблону из документации Convex Auth
   (Password-провайдер), но реальная настройка ключей (`npx @convex-dev/auth`)
   не выполнялась — это может потребовать отдельного шага после
   `npx convex dev`, прежде чем вход/регистрация заработают.
4. **`/admin/sports` — ключевая фича** — логика разворачивания строки по
   клику, `stopPropagation()` на кнопке редактирования вида спорта и
   отдельная кнопка-карандаш на каждой дисциплине реализованы, но ни разу
   не открывались в браузере — стоит внимательно руками прокликать.
5. Визуальная полировка (Tailwind-классы, адаптивность) писалась "на
   глаз", без возможности отрендерить — возможны мелкие огрехи вёрстки,
   особенно на мобильной ширине.
6. Для `/admin` используется клиентская проверка авторизации
   (`useConvexAuth` в layout-компоненте), а не серверный `beforeLoad` —
   это значит, что сама разметка страницы на мгновение загрузится до
   проверки (без утечки данных, т.к. запросы к Convex всё равно требуют
   сессию), но для более строгой защиты в будущем стоит добавить
   SSR-проверку через `beforeLoad` с контекстом.
7. Данные по видам спорта (`convex/migrations.ts`, `convex/seedData/*.json`,
   `src/data/sports-registry.json`) не трогались — как и просили.

## Структура файлов (кратко)

```
convex/
  schema.ts        — вся схема (sports + venues + events + banners + authTables)
  sports.ts         — не менялся
  venues.ts         — CRUD площадок
  events.ts         — CRUD событий (list с фильтрами по городу/виду спорта)
  banners.ts        — CRUD баннеров
  auth.ts           — Password-провайдер @convex-dev/auth
  http.ts           — HTTP-роуты авторизации
  lib/authz.ts       — requireUserId (реальный, через getAuthUserId)
  migrations.ts, seedData/*.json — не менялись

src/
  router.tsx                 — createRouter (TanStack Router)
  lib/convexClient.ts         — ConvexReactClient
  lib/format.ts, lib/sportSections.ts — форматирование дат, справочники меток
  components/NavBar.tsx       — верхняя навигация
  styles/app.css              — Tailwind + кастомные компонентные классы
  routes/
    __root.tsx                — HTML-шелл, ConvexAuthProvider, NavBar
    index.tsx                 — главная
    afisha.tsx                — афиша с фильтрами
    sports.tsx                — публичный справочник видов спорта
    login.tsx                 — вход/регистрация
    admin.tsx                 — защищённый layout админки
    admin.index.tsx           — дашборд
    admin.sports.tsx          — админка видов спорта (ключевая фича)
    admin.events.tsx          — админка событий
    admin.venues.tsx          — админка площадок
    admin.banners.tsx         — админка баннеров
```
