# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Код, комментарии и коммиты — на русском. Комментарий пишется только там, где
объясняет *почему* так, а не *что* делает строка.

## Команды

```bash
npm run dev          # next dev на :3000
npm run build
npm run typecheck    # tsc --noEmit И tsc -p tsconfig.test.json --noEmit — оба обязательны
npm run lint
npm test             # vitest run
npm run test:coverage
```

Один файл или один тест:

```bash
npx vitest run tests/unit/discount.test.ts
npx vitest run -t "часть имени теста"
```

Всё, что связано с датами, обязано проходить в обоих часовых поясах. CI гоняет
тесты с `TZ=Asia/Tashkent`, потому что раннер GitHub всегда UTC и под ним ошибки
смешения местного и мирового времени не воспроизводятся.

База:

```bash
npx supabase start
npx supabase db reset   # применит migrations/ и seed.sql
```

После seed доступны аккаунты `admin@ / dentist1@ / dentist2@ / patient1..3@tishim.uz`,
пароль у всех `password123` (раскладка ролей — в README).

Node закреплён в `.nvmrc` (24). Это не формальность: node 22 несёт npm 10, node 24 —
npm 11, и они по-разному записывают платформенные пакеты в `package-lock.json`.
Один lock под две версии npm не ложится, поэтому локальная разработка, CI и Render
обязаны быть на одной версии. Пересобирать lock другим npm — значит сломать CI.

## Архитектура

### Граница безопасности — RLS, а не код приложения

Приложение ходит в Supabase **только под анонимным ключом от имени пользователя**.
`service_role` не используется нигде и не нужен. Отсюда следствия:

- `requireRole()` в [src/lib/auth.ts](src/lib/auth.ts) и редиректы в
  [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) — это UX
  (куда отправить пользователя), а не защита. Защита — политики в
  `supabase/migrations/00002_rls.sql`.
- Новая фича, которой нужны новые данные, почти всегда начинается с миграции:
  без политики запрос вернёт пустоту, а не ошибку.
- Миграции только вперёд и нумерованные (`0000N_описание.sql`); существующие не
  переписываются.

Три клиента Supabase, перепутать их нельзя:
`lib/supabase/client.ts` — браузер, `server.ts` — Server Components и route
handlers, `middleware.ts` — обновление сессии в куках.

### Всё чувствительное идёт через RPC

Таблицу нельзя отдать клиенту напрямую — значит, у неё есть `security definer`
функция. Используемые приложением:

| RPC | Кто зовёт |
|---|---|
| `generate_access_code` / `redeem_access_code` | пациент генерирует код, врач гасит; таблицу `access_codes` не читает никто, кроме владельца |
| `get_admin_stats` | админка — только агрегаты |
| `get_public_stats` | лендинг, доступен анониму |
| `set_featured_dentist` | админ; врач не может назначить флагманом себя |
| `submit_mapping_request` | форма лендинга, с троттлингом по телефону/отпечатку |

### Состояние зуба выводится, а не хранится

Нет таблицы «текущее состояние». Для каждой пары (зуб, поверхность) побеждает
последняя по `created_at` запись `tooth_records`. Это правило продублировано
в двух местах и они обязаны сходиться:

- SQL-view `current_tooth_state` (`security_invoker`, RLS применяется);
- `buildChartState()` в [src/components/odontogram/state.ts](src/components/odontogram/state.ts) —
  клиентская свёртка, поверх которой [useToothState](src/hooks/useToothState.ts)
  грузит историю один раз и рисует карту на любую дату без новых запросов
  (слайдер истории).

Состояния делятся на три слота: поверхностные, «на весь зуб» (`WHOLE_TOOTH_CONDITIONS`,
сбрасывают поверхности и корень) и корневые (`ROOT_CONDITIONS`). Список — в
[src/lib/constants/teeth.ts](src/lib/constants/teeth.ts), там же геометрия FDI
(квадранты, число корней, какая поверхность центральная).

Отсечка даты `endOfDay()` считается **в UTC намеренно**: позиции слайдера строятся
по UTC-дате из `created_at.slice(0,10)`, и отсечка обязана жить в том же календаре.
Через `setHours` она уезжала на смещение пояса и приём, сохранённый после полуночи
по Ташкенту, пропадал с той самой позиции слайдера, которую сам же и породил.

### Зоны маршрутов

Route-группы `(auth)`, `(patient)`, `(dentist)` и папка `admin` — по одной на роль,
у каждой свой layout с `requireRole()`, свои `loading.tsx` и `error.tsx`. Middleware
редиректит вошедшего с `/`, `/login`, `/register` на домашнюю страницу его роли по
`user_metadata.role`. `/dev/*` открыт всем, но только при `NODE_ENV=development`.

Вложенных `layout.tsx` внутри групп нет, и на этом держатся переходы: появление
страницы — правило `.page-enter > *` на `<main>` в `AppShell`, оно анимирует корень,
который App Router вставляет при навигации. Вложенный layout сам станет этим
корнем и выключит переходы под собой. На телефоне язык и выход живут не в шапке,
а в шторке профиля (`ProfileSheet`).
Полная таблица маршрутов — в README.

### i18n

next-intl **без префикса локали в URL**: язык берётся из куки `locale`
([src/i18n/request.ts](src/i18n/request.ts)), переключает его `LocaleSwitcher`.
`messages/ru.json` и `messages/uz.json` держатся в строгом паритете — его
проверяет `tests/unit/i18nParity.test.ts`. Добавил ключ в один файл — добавь во второй.

### Форматирование денег и дат — вручную, без Intl

`formatMoney` / `formatDate` в [src/lib/utils.ts](src/lib/utils.ts) собирают строку
сами. Это не наивность: ICU-данные для `uz-UZ` различаются между Node и браузером,
из-за чего серверный и клиентский рендер расходились и ломали гидратацию.
`parseDate` разбирает `YYYY-MM-DD` как локальную дату — иначе восточнее UTC день
съезжает на сутки назад.

Скидка визита хранится в базе **всегда процентом** (`visits.discount_percent`),
хотя врач вводит её процентом или суммой. `resolveDiscountPercent` округляет до
сотых сразу, а не при записи, иначе сохранённые `subtotal / discount_percent / total`
перестают сходиться между собой.

### PWA

Манифест — [src/app/manifest.ts](src/app/manifest.ts); иконки **генерируются на
сборке** Satori (`src/app/icon.tsx`, `apple-icon.tsx`) из `TOOTH_PATH` в
`components/icons.tsx` — растровых иконок в репозитории нет, знак меняется в
одном месте. Манифест локализуется через cookie `locale` — Next ставит на
`<link rel=manifest>` `crossorigin=use-credentials`, cookies долетают. Пути
`manifest.webmanifest`, `icon/*`, `apple-icon` исключены из matcher'а middleware:
иначе аноним получал на них 307 на `/login`, и установка не предлагалась.
Service worker'а нет намеренно — приложение целиком под
RLS-сессией, кэшировать медицинские данные на устройстве нельзя, а для установки
на домашний экран он не нужен. `viewport-fit=cover` + утилиты `safe-top`/`safe-bottom`
обязательны: без них в standalone на iPhone шапка уезжает под «чёлку».

### Бизнес-модель (этап 1)

Один флагманский врач (`dentists.is_featured`, единственность держит частичный
уникальный индекс). Платная услуга ровно одна — «первичная цифровизация карты»
(`visits.visit_type = 'initial_mapping'`, цена в `app_settings.initial_mapping_price`),
после неё у пациента заполнены все 32 зуба. Доступ пациента к своей карте бесплатен
навсегда. Заявки с лендинга падают в `mapping_requests`, их видят админ и флагманский
врач. Таблица `subscriptions` — задел этапа 2, кода под ней нет.

Анониму видно ровно три вещи: `app_settings`, клиники и профиль флагманского врача —
это нужно лендингу. Справочник остальных врачей анониму закрыт миграцией `00006`;
при правках публичных политик легко открыть его обратно — не надо.

## Дизайн-система

Токены — в [tailwind.config.ts](tailwind.config.ts) и [src/app/globals.css](src/app/globals.css),
интерфейс собирается из готовых блоков `src/components/ui/*`. Разовых классов и
inline-стилей быть не должно; нужен новый цвет или размер — он добавляется токеном.
Детали шкалы (типографика, скругления, тени, кнопки) — в README.

## Тесты

`tests/` **исключены из `tsconfig.json`** (иначе их тайпчекает `next build`) и
проверяются отдельным `tsconfig.test.json` — поэтому `npm run typecheck` запускает
tsc дважды. По той же причине алиас `@/*` продублирован в `vitest.config.ts` руками,
а не через `vite-tsconfig-paths`: плагин сверяется с include/exclude основного
tsconfig и внутри `tests/` импорты переставали резолвиться.

Покрытие намеренно собирается не со всего проекта, а с чистой логики:
`odontogram/state.ts`, `hooks/**`, `lib/utils.ts`.

## Деплой

Push в `main` → GitHub Actions (typecheck, lint, тесты) и автодеплой Render.
На `main` прогон CI не отменяется свежим push — отменённый прогон означал бы
коммит, уехавший в прод без проверок.
