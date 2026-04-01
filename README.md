# Dzung9fBook

Frontend nha sach da trang bang HTML, CSS va JavaScript thuan, da duoc refactor de san sang noi backend Node/Express theo kien truc same-repo.

## Cau truc hien tai

- `public/`: runtime output duoc server JS serve truc tiep
- `public/assets/`: CSS, JS module, image, va catalog JSON runtime
- `src/templates/`: partial va page template de build 11 public routes
- `assets/js/`: source frontend theo layer `config`, `api`, `providers`, `services`, `state`, `pages`, `ui`
- `tools/catalog/`: pipeline build va QA catalog
- `tools/pages/`: build HTML vao `public/`
- `tools/db/`: Phase A1 Prisma seed/import scripts
- `server/src/`: backend Express cho `catalog`, `auth`, `cart`, `checkout`, `orders`, `contact`, va admin/support APIs
- `prisma/`: PostgreSQL schema va migration cho Phase A1

## Kien truc frontend

- Public URL duoc giu nguyen: `index`, `books`, `book-detail`, `cart`, `login`, `register`, `profile`, `contact`
- Frontend dung mo hinh `dual provider`:
  - `static`: doc catalog JSON va local storage, dung de phat trien frontend/doc lap
  - `api`: goi `/api/*` qua Express + cookie session
- Page layer khong goi `fetch` catalog truc tiep va khong dung `localStorage` truc tiep cho auth/cart
- `contact.html` da co backend submission trong `api` mode va van co fallback an toan trong `static` mode

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
- Da co them:
  - `PATCH /api/auth/profile`
  - `POST /api/contact`
  - `POST /api/checkout`
  - `GET /api/orders`
  - `GET /api/orders/:orderId`
  - `GET /api/admin/orders`
  - `PATCH /api/admin/orders/:id/status`
  - `GET /api/admin/messages`
  - `PATCH /api/admin/messages/:id/status`
  - public pages `order-detail`, `admin-orders`, `admin-messages`

## Phase A1 database baseline

Phase A1 da them PostgreSQL + Prisma schema, migration, va import scripts.
Phase A2.1 da chuyen runtime auth/user persistence sang Prisma/PostgreSQL.
Phase A2.2 da chuyen `express-session` storage backend sang PostgreSQL-backed session store.

Quan trong:

- App hien tai van doc catalog tu `assets/data/catalog`
- App hien tai khong con dung `server/data/users.json` lam runtime source of truth cho auth
- App hien tai van dung `express-session`, nhung session duoc luu trong PostgreSQL qua `connect-pg-simple`
- Cart hien tai da dung DB-backed `Cart` / `CartItem`, nhung van reuse session/cookie hien co de nhan dien user hoac guest cart
- Customer-facing behavior, API shape, va public routes van giu nguyen

## Session va runtime env

- `SESSION_SECRET`:
  - local dev co the de trong de dung fallback dev secret
  - production bat buoc phai set ro
- `SESSION_COOKIE_SECURE`:
  - `false` cho local HTTP
  - `true` khi deploy HTTPS/proxy
- `TRUST_PROXY`:
  - bat khi app chay sau reverse proxy va can secure cookie hoat dong dung

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

Build 11 HTML page vao `public/`, dong thoi copy runtime asset va tao `public/runtime-config.js`.

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
2. Build 11 HTML page vao `public/`
3. Chay Express server va tu dong bat frontend sang `api provider`
4. Tu dong nap bien moi truong tu `.env` de runtime session store co the ket noi PostgreSQL

## Ghi chu

- Backend v1 hien tai doc catalog tu JSON build output, chua bat buoc database.
- Runtime auth hien tai doc user tu PostgreSQL qua Prisma.
- Session auth/cart hien tai van dung `express-session`, nhung store da duoc chuyen sang PostgreSQL-backed session store.
- Session table duoc `connect-pg-simple` tao tu dong trong database runtime neu chua ton tai, nen A2.2 khong can Prisma schema change hay migration moi.
- Guest cart van duoc giu qua session store, nhung source of truth cua cart da la PostgreSQL.
- Checkout COD, order history, order detail, contact backend, va admin orders/messages UI da co san trong `api` mode.
- `public/runtime-config.js` mac dinh la `static`; khi chay qua Express, route `/runtime-config.js` se override sang `api`.
- `public/` la runtime target chinh va la thu muc Express se serve khi review/chay local.
- Cac file HTML o repo root duoc giu lai nhu ban sao tham chieu/legacy; khong nen dung chung de deploy thay cho `public/`.
