# MoneyManager — Offline Money Manager

A fresh rebuild of the original MoneyManager app (v1.0.0, `com.moneymanager.offline`),
rebuilt from scratch as an Expo + React Native + TypeScript project. The original
app's compiled code could not be recovered (Hermes bytecode only), so this project
re-implements its features from the behaviour recovered from the original APK:
income/expense tracking, categories, budgets, savings goals, debts, PIN lock,
backup/export, and an on-device coach — with the saving bug fixed at the root.

## What was wrong with the original

The user reported that saving did not persist: data only lasted temporarily.
The exact original cause cannot be proven from a compiled bundle alone, so no
specific original root cause is claimed here. This rebuild eliminates the whole
class of bug: **every record is written synchronously to an on-device SQLite
database and every screen re-reads from that database.** React state is only a
cache; the database is the source of truth. A scripted restart test proves rows
survive closing and reopening the database file (see Testing below).

## Features

- **Dashboard** — all-time balance ("Liquid Ledger Balance"), this month's
  income / spending / surplus, largest expense category, budget warnings,
  recent transactions.
- **Transactions** — add, edit, delete; search; filter by type and category;
  grouped by month. Amounts are validated (must be greater than zero).
- **Budgets** — monthly limit per category, spent-vs-limit bars, warnings at
  80% and when over budget.
- **Goals** — savings goals with target amount and optional date, add-savings
  tracking, required monthly saving to finish on time.
- **Debts** — balance, APR, minimum payment; log payments (balance drops
  atomically); avalanche (highest APR first) and snowball (smallest balance
  first) payoff orders.
- **Coach** — 100% local, rule-based guidance computed from your real records:
  largest expense driver, savings rate, budget overruns, goal pace, debt
  payoff guidance, and concrete next actions. Every recommendation cites the
  numbers it used. Labelled in the app as on-device guidance, not financial
  advice. **No network calls, no API key, no external AI model.**
- **PIN lock** — optional 4–6 digit PIN, stored only as a salted SHA-256 hash.
  Forgetting the PIN cannot be recovered; reinstalling / wiping data is the
  only way back in, by design.
- **Backup & restore** — export all records to one JSON file (shared via the
  system share sheet); import validates the whole file first and refuses
  malformed files without touching existing data.
- **Sample data** — one-tap clearly-labelled demo data in Settings, plus
  "clear sample data" and full reset.
- **Offline only** — no account, no server, no analytics, no network calls
  for app data. Currency is Rs (PKR) by default.

## Persistence design

`expo-sqlite` is the single source of truth. The schema (`src/db/schema.ts`,
versioned with `PRAGMA user_version`) holds `categories`, `transactions`,
`budgets`, `goals`, `debts`, and `debt_payments`. Money is stored as integer
cents to avoid floating-point errors. All writes in `src/db/database.ts` use
the synchronous expo-sqlite API (`runSync`/`getAllSync`) and screens refresh
by re-reading the database after every mutation. Settings and the PIN hash
live in AsyncStorage; financial records never live only in AsyncStorage or
component state. The database file lives in the app's default document
directory (expo-sqlite default); no in-memory database is used.

## How to run

```sh
npm install
npx expo start
```

Then press `a` for Android (emulator or device with USB debugging), `i` for
iOS (macOS only), or `w` for web. For a quick try on a real phone, install
Expo Go and scan the QR code — note that Expo Go runs the JavaScript bundle
only; a development build is needed for the full native SQLite behaviour on
some setups (see below).

### Development build (recommended for real-device testing)

```sh
npx expo prebuild
npx expo run:android
```

### Build an APK / AAB with EAS

This project has **no EAS project id** (a fresh project must not reuse the old
app's EAS project). Create your own EAS project first:

```sh
npm install -g eas-cli
eas login
eas init            # creates a new EAS project id in app.json for YOUR account
eas build --platform android --profile preview   # APK
eas build --platform android --profile production # AAB for Google Play
```

The package name is `com.moneymanager.offline`, kept from the original so the
new build can replace the old install on a device.

## Testing

```sh
npm run typecheck   # tsc --noEmit for app + tests
npm test            # logic tests + persistence restart test
```

- `tests/logic.test.ts` — pure-function tests for balance/summary math, budget
  utilisation, goal pace, debt ordering, and coach insights (14 assertions).
- `scripts/persistence-test.mjs` — extracts the exact `SCHEMA_SQL` statements
  from `src/db/schema.ts` and runs them with Node's built-in `node:sqlite`
  against a temp file: insert → close → reopen and assert exact values →
  update/delete → close → reopen and assert the changes persisted. The driver
  differs from expo-sqlite on device, but the SQL, file format, and
  close/reopen semantics are identical; this is a storage-layer proof, not a
  claim that expo-sqlite itself ran under Node.
- UI smoke: the production bundle is exported with
  `npm run export:android` / `export:web` and checked for build errors. **No
  real-phone test has been run in this environment** — run the app on a real
  Android phone/emulator and check: add a record, force-close the app, reopen,
  confirm the record is still there; set a PIN, reopen, confirm the lock
  screen; export/import a backup.

## Push to GitHub

This project was not pushed anywhere. It is already a local git repository
with one initial commit, and no remote is configured. To publish it (from
the project folder):

```sh
# 1. Create an empty repository on github.com (e.g. MoneyManager), no README.
# 2. Then, in this folder:
git branch -M main
git remote add origin https://github.com/<your-username>/MoneyManager.git
git push -u origin main
```

If you prefer a different remote or a fresh clone: copy this project's files
into the clone (except `node_modules`), then `git add .`, commit, and push.
Never commit `node_modules`, `dist`, `.expo`, `.env` files, or an APK —
`.gitignore` already excludes them. Check with `git status` before committing.

## Known limits

- Tested in this environment with typecheck, unit/persistence tests, and a
  production bundle export. Real-phone testing (Android device/emulator,
  PIN flow, backup share sheet, Expo Go vs dev build) is still needed.
- The coach is rule-based guidance from your own records, not a live AI
  model and not financial advice.
- Icons are the Expo template defaults; replace `assets/icon.png` and the
  adaptive-icon images with your own artwork if you want the original look.
- This is a fresh codebase. Screen text and feature names were recovered
  from the original app, but layouts, colours, and wording are new.
