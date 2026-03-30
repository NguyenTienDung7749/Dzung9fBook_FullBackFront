# Dzung9fBook

Frontend nha sach da trang bang HTML, CSS va JavaScript thuan, da duoc refactor de san sang noi backend Node/Express theo kien truc same-repo.

## Cau truc hien tai

- `public/`: runtime output duoc server JS serve truc tiep
- `public/assets/`: CSS, JS module, image, va catalog JSON runtime
- `src/templates/`: partial va page template de build 8 public routes
- `assets/js/`: source frontend theo layer `config`, `api`, `providers`, `services`, `state`, `pages`, `ui`
- `tools/catalog/`: pipeline build va QA catalog
- `tools/pages/`: build HTML vao `public/`
- `tools/db/`: Phase A1 Prisma seed/import scripts
- `server/src/`: backend Express v1 cho `catalog`, `auth`, `cart`
- `prisma/`: PostgreSQL schema va migration cho Phase A1

## Kien truc frontend

- Public URL duoc giu nguyen: `index`, `books`, `book-detail`, `cart`, `login`, `register`, `profile`, `contact`
- Frontend dung mo hinh `dual provider`:
  - `static`: doc catalog JSON va local storage, dung de phat trien frontend/doc lap
  - `api`: goi `/api/*` qua Express + cookie session
- Page layer khong goi `fetch` catalog truc tiep va khong dung `localStorage` truc tiep cho auth/cart
- `contact.html` van duoc giu nhu ASM page client-side, chua co backend submission o v1

## Backend v1 scope

- Da co:
  - `GET /api/catalog/categories`
  - `GET /api/catalog/books`
  - `GET /api/catalog/books/:handle`
  - `GET /api/catalog/books/resolve?id=...`
  - `GET /api/auth/me`
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/:bookId`
  - `DELETE /api/cart/items/:bookId`
- Ngoai scope hien tai:
  - `checkout`
  - `order history`
  - `admin UI`
  - backend submit cho `contact`

## Phase A1 database baseline

Phase A1 da them PostgreSQL + Prisma schema, migration, va import scripts, nhung chua cut over runtime backend.

Quan trong:

- App hien tai van doc catalog tu `assets/data/catalog`
- App hien tai van doc user tu `server/data/users.json`
- App hien tai van dung `express-session` MemoryStore mac dinh
- `server/src/services/` chua duoc chuyen sang DB-backed runtime trong Phase A1
- Customer-facing behavior, API shape, va public routes van giu nguyen

## Local setup

1. Cai PostgreSQL local hoac dung mot PostgreSQL instance san co.
2. Tao database ten `dzung9fbook`.
3. Copy `.env.example` thanh `.env`.
4. Chinh `DATABASE_URL` neu can.
5. Cai dependency:

```bash
npm install
```

## Database commands

Generate Prisma Client:

```bash
npm run db:generate
```

Tao/ap dung migration trong local dev:

```bash
npm run db:migrate -- --name phase_a1_init
```

Ap dung migration trong moi truong deploy:

```bash
npm run db:migrate:deploy
```

Seed role + import catalog + import user:

```bash
npm run db:seed
```

Chi import catalog:

```bash
npm run db:import:catalog
```

Chi import user:

```bash
npm run db:import:users
```

Mo Prisma Studio:

```bash
npm run db:studio
```

## Runtime build va run

```bash
npm run build:catalog
```

Build catalog runtime JSON cho frontend/backend.

```bash
npm run qa:catalog
```

Kiem tra detail file, lookup, image, duplicate id/handle, va category mapping.

```bash
npm run build:pages
```

Build 8 HTML page vao `public/`, dong thoi copy runtime asset va tao `public/runtime-config.js`.

```bash
npm run dev:server
```

Chay rieng Express server o che do watch.

```bash
npm run dev
```

Build runtime roi chay Express server o che do watch.

```bash
npm run serve
```

Lenh `serve` se:

1. Build catalog runtime vao `public/assets/data/catalog`
2. Build 8 HTML page vao `public/`
3. Chay Express server va tu dong bat frontend sang `api provider`

## Ghi chu

- Backend v1 hien tai doc catalog tu JSON build output, chua bat buoc database.
- Session auth/cart hien tai van dung `express-session`.
- Guest cart van duoc giu tren server session, khong can dang nhap moi dung duoc.
- `public/runtime-config.js` mac dinh la `static`; khi chay qua Express, route `/runtime-config.js` se override sang `api`.
- `public/` la runtime target chinh va la thu muc Express se serve khi review/chay local.
- Cac file HTML o repo root duoc giu lai nhu ban sao tham chieu/legacy; khong nen dung chung de deploy thay cho `public/`.
