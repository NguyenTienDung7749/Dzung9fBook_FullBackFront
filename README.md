# Dzung9fBook

Dzung9fBook la mot website ban sach full-stack theo mo hinh same-repo. Frontend la multi-page app bang HTML/CSS/JavaScript thuan, backend la Node/Express, du lieu runtime dung PostgreSQL + Prisma.

## Stack

- Frontend: HTML templates + vanilla JavaScript modules + CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Session: express-session + connect-pg-simple

## Tinh nang chinh

- Duyet danh muc sach, tim kiem va xem chi tiet sach
- Dang ky, dang nhap, dang xuat, xem session hien tai
- Gio hang DB-backed cho guest va user dang nhap
- Checkout COD, lich su don hang, chi tiet don hang
- Contact form luu that vao backend
- Admin/support UI toi thieu cho orders va contact messages

## Cau truc repo quan trong

- `src/templates/` + `assets/`: source of truth cho frontend
- `public/`: build output/runtime target, khong phai noi sua tay
- `server/src/`: backend Express
- `prisma/`: schema va migrations
- `server/data/users.json`: du lieu seed/import an toan cho local/dev

Luu y:

- Cac file HTML o repo root nhu `index.html`, `books.html`, `profile.html`... duoc giu lai de tham chieu/legacy. Khi chinh frontend, hay sua trong `src/templates/` + `assets/`.

## Bien moi truong

Copy `.env.example` thanh `.env` va cap nhat neu can:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dzung9fbook?schema=public"
SESSION_SECRET="replace-with-a-long-random-secret"
SESSION_COOKIE_SECURE="false"
TRUST_PROXY="false"
```

Ghi chu:

- `DATABASE_URL`: bat buoc
- `SESSION_SECRET`: nen set ro rang; production bat buoc phai co
- `SESSION_COOKIE_SECURE=false`: dung cho local HTTP
- `SESSION_COOKIE_SECURE=true` va `TRUST_PROXY=true`: dung khi deploy sau HTTPS/reverse proxy

## Cai dat va chay local

1. Cai PostgreSQL va tao database `dzung9fbook`
2. Copy `.env.example` thanh `.env`
3. Cai dependency:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run db:generate
```

5. Chay migration local:

```bash
npm run db:migrate -- --name phase_a1_init
```

6. Seed database:

```bash
npm run db:seed
```

7. Build va chay app:

```bash
npm run serve
```

App mac dinh chay tai:

- `http://127.0.0.1:4173/index.html`

## Lenh hay dung

```bash
npm run build:catalog
npm run build:pages
npm run serve
npm run dev
npm run db:studio
```

## URL chinh

- Home: `/index.html`
- Profile: `/profile.html`
- Admin orders: `/admin-orders.html`
- Admin messages: `/admin-messages.html`

## Static mode va API mode

- `npm run serve` chay Express server va override `/runtime-config.js` sang `api` mode
- `npm run build:pages` sinh `public/runtime-config.js` o `static` mode
- Cac flow nhu auth, cart, checkout, orders, contact backend, admin UI can chay qua backend/API mode de hoat dong day du

## Tai khoan va role demo

- Repo nay khong public default login credentials
- `server/data/users.json` chi la du lieu seed/import an toan de giu flow local/dev day du
- De test customer flow, hay tao tai khoan moi qua `/register.html`
- De test admin flow, promote mot user thanh `staff` hoac `admin` bang Prisma Studio hoac truy van DB

## GitHub / repo notes

- Khong commit `.env`
- Khong commit `public/`
- Khong commit log, pid, cache, temp artifacts
- Neu can rebuild frontend/runtime output, hay dung:

```bash
npm run build:catalog
npm run build:pages
```

## Hien trang san pham

Project hien da co:

- customer storefront hoan chinh o muc demo tot
- checkout COD + order history + order detail
- contact backend that
- admin/support UI toi thieu cho orders va messages

Project chua bao gom:

- payment gateway that
- inventory reservation/decrement day du
- admin dashboard lon
- role management UI
