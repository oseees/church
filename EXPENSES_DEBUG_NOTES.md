# Expenses "No expenses recorded yet" — Debug Notes

## Symptom
After recording an expense on `/admin/expenses`, the page still shows
"No expenses recorded yet" — the new expense does not appear.

## What was verified (everything works at the code/DB level)

### 1. API endpoint — `app/api/admin/expenses/route.ts`
- `POST /api/admin/expenses` returns `201` with the created expense JSON.
- `GET /api/admin/expenses` returns the list from the DB.
- Tested directly with curl:

```bash
curl -X POST http://localhost:3000/api/admin/expenses \
  -H "Content-Type: application/json" \
  -d '{"category":"FEED","description":"Test bag feed","amount":1500,"quantity":2,"unit":"bags","date":"2026-07-01"}'
# → 201, returns { id, category, description, amount, ... }
```

### 2. Database — PostgreSQL (`church_chicken`)
- The `Expense` table EXISTS and has the correct schema.
- Rows inserted via the API DO persist:

```bash
psql "postgresql://oseabhi@localhost:5432/church_chicken" -c 'SELECT COUNT(*) FROM "Expense";'
# → count was 1 after the curl POST, 2 after a second POST
```

- Migrations are all applied:

```bash
psql "postgresql://oseabhi@localhost:5432/church_chicken" \
  -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at;'
# 20260613153530_init
# 20260613215430_add_notification_status
# 20260630112145_add_expenses_invoices   ← creates Expense table
```

### 3. Server-rendered page — `app/admin/expenses/page.tsx`
- The server component queries `prisma.expense.findMany(...)` and passes
  `initialExpenses` to `ExpenseClient`.
- A fresh `curl http://localhost:3000/admin/expenses` DOES contain the
  recorded expense in the HTML (grep found "Test bag feed").
- So the server-side render is correct and shows the data.

### 4. Client component — `app/admin/expenses/ExpenseClient.tsx`
- The `submit()` handler:
  - POSTs to `/api/admin/expenses`
  - on `res.ok`, calls `setExpenses((prev) => [created, ...prev])`
  - sets a success message
- This logic is correct.

## Root cause identified: the Service Worker (`public/sw.js`)

The PWA service worker was caching the `/admin/expenses` **page HTML**
(network-first, but it stored a copy in the cache).

Flow that reproduces the bug:
1. You visit `/admin/expenses` when the table is empty → SW caches the
   HTML containing "No expenses recorded yet".
2. You record an expense (POST succeeds, row is in the DB, client state
   updates and shows it momentarily).
3. You reload the page, or navigate away and back → the SW serves the
   **stale cached HTML** from step 1, where `initialExpenses` was empty.
4. Result: "No expenses recorded yet" again, even though the DB has the row.

The SW already skipped `/api/*` (network-only), but it was caching the
**page** itself, which embeds the server-rendered `initialExpenses`.

## Fixes already applied in this workspace

### Fix 1 — `public/sw.js`
- Excluded all `/admin/*` routes from the cache so admin pages always
  fetch fresh server-rendered HTML.
- Bumped cache version `church-chicken-v1` → `church-chicken-v2` to
  invalidate the old stale cache on next SW activation.

Relevant block (lines ~48-55):
```js
// Admin pages: never cache — always fetch fresh server-rendered HTML
if (url.pathname.startsWith('/admin')) {
  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL))
  );
  return;
}
```

### Fix 2 — `app/admin/expenses/ExpenseClient.tsx`
- After a successful POST, the client now re-fetches
  `/api/admin/expenses` with `cache: 'no-store'` and replaces the list
  with the true DB state (defensive against stale state).

Relevant block (inside `submit()`, after `res.ok`):
```tsx
fetch('/api/admin/expenses', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : []))
  .then((fresh: Expense[]) => setExpenses(fresh))
  .catch(() => {});
```

## What still needs to happen (the part that needs a live browser)

The code fixes are in place, but the **old service worker is still
registered in the browser** from before the fix. To clear it:

1. Open `/admin/expenses` in the browser.
2. DevTools → Application → Service Workers → **Unregister** the old SW.
   (Or: Application → Storage → "Clear site data".)
3. Hard refresh: **Cmd+Shift+R** (mac) / **Ctrl+Shift+R** (win).
4. The new `church-chicken-v2` SW will register and will NOT cache
   `/admin/*` pages.
5. Record an expense → it should persist and remain visible after reload.

If the issue STILL persists after unregistering the SW and hard-refreshing,
the next things to check in the new IDE / live browser:

- **Browser DevTools Network tab**: watch the `POST /api/admin/expenses`
  request — confirm it returns `201` (not 400/500) and check the response body.
- **Browser Console**: look for any JS errors or CSP violations blocking
  the fetch.
- **DevTools Application → Cache Storage**: confirm no `church-chicken-v1`
  cache remains and that `/admin/expenses` is NOT listed in any cache.
- **DevTools Application → Service Workers**: confirm only the new SW
  (`v2`) is active and its status is "activated and is running".
- If the POST returns 201 but the list still empties on reload, the page
  HTML is still being served from a stale cache — fully clear site data.

## Files changed
- `public/sw.js` — admin pages excluded from cache; cache version bumped.
- `app/admin/expenses/ExpenseClient.tsx` — re-fetch list after recording.

## Files inspected (no changes needed)
- `app/api/admin/expenses/route.ts` — POST/GET correct.
- `app/api/admin/expenses/[id]/route.ts` — PATCH/DELETE correct.
- `app/admin/expenses/page.tsx` — server render correct.
- `prisma/schema.prisma` — `Expense` model + `ExpenseCategory` enum correct.
- `prisma/migrations/20260630112145_add_expenses_invoices/migration.sql`
  — creates `Expense` table; applied in DB.
- `lib/prisma.ts` — singleton client, fine.
- `next.config.js`, `vercel.json`, `railway.json` — no auth/middleware
  blocking the route.
- `.env` — `DATABASE_URL` points to local Postgres `church_chicken`.

## Quick re-test commands (run in this project dir)
```bash
# start dev server
npm run dev

# in another terminal:
# 1. confirm GET works
curl -s http://localhost:3000/api/admin/expenses

# 2. record one
curl -X POST http://localhost:3000/api/admin/expenses \
  -H "Content-Type: application/json" \
  -d '{"category":"FEED","description":"probe","amount":100,"quantity":null,"unit":null,"date":"2026-07-01"}'

# 3. confirm it persisted
psql "postgresql://oseabhi@localhost:5432/church_chicken" -c 'SELECT * FROM "Expense";'

# 4. confirm the page HTML contains it
curl -s http://localhost:3000/admin/expenses | grep "probe"

# 5. clean up the probe row
psql "postgresql://oseabhi@localhost:5432/church_chicken" -c "DELETE FROM \"Expense\" WHERE description='probe';"
```

All of the above passed during diagnosis, which is why the conclusion is
that the remaining failure is the stale **browser service worker**, not
the application code.
