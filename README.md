# Onward

A minimal, dark, personal task tracker: a daily checklist, a task hierarchy of any depth, and a random picker for when you don't know what to do next.

## Run

```bash
cp .env.example .env.local   # fill in BACKBONE_DB_QUERY_API_KEY and SESSION_SECRET
npm install
npm run dev
npm test                     # domain rules (hierarchy, progress, moves, daily log, picker)
```

## How it works

- **Auth.** Backbone's `/auth` only verifies credentials, so the app issues its own session: an HMAC-signed, httpOnly cookie holding the verified `user_id` (`lib/session*.ts`). `proxy.ts` does early redirects; every Server Action and the data layer re-verify the cookie. No user id is ever accepted from the client.
- **Data.** One JSON document per user in Backbone's `db_query_dynamic` table, keyed by `user_id` (`lib/backbone.ts`, `lib/dal.ts`, following `docs/backend-arch-docs`). Writes are read-modify-write, serialised per user because the API has no locking.
- **Domain.** `lib/domain/` is pure TypeScript shared by server and client. Every change is a command (`task.setDone`, `task.move`, ...). The client applies commands optimistically (`components/store/doc-store.ts`) and the server applies the same function before saving, so they always agree; failures revert the view and show a message.
- **Tasks.** Stored as an adjacency list (`parentId`). Only leaves carry a `done` flag; a parent is complete when all descendant leaves are, and progress counts leaves only. Moves reject cycles.
- **Daily tracker.** Activities plus a `date -> [activityId]` log keyed by the viewer's local calendar day. Turning the tracker off only hides it.

## Design

Dark "ink" neutrals with a single celadon accent reserved for completion and primary actions. Instrument Sans for the UI; Instrument Serif only for page titles and the picked task. Desktop uses a left rail and a 640px reading column; mobile uses a bottom tab bar, 44px touch targets and bottom-sheet dialogs. Tokens live in `app/globals.css`.
