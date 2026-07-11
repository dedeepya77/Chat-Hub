# Pulse — Real-Time Chat

A single-room, real-time chat app. Enter a display name, jump into the room, and talk — messages, typing indicators, and online presence all update live via Socket.io.

## Architecture

- **Frontend** (`artifacts/chat-app`): React + Vite, TanStack Query, Tailwind, shadcn/radix UI, Framer Motion. Talks to the backend via a generated REST client and `socket.io-client`.
- **Backend** (`artifacts/api-server`): Express 5 + Socket.io, sharing a single HTTP server/port. Persists messages to Postgres via Drizzle ORM.
- **API contract**: defined once in `lib/api-spec/openapi.yaml`, then codegen'd into a typed React Query client (`lib/api-client-react`) and Zod validators (`lib/api-zod`) used on both ends.

Messages are sent over REST (`POST /api/messages`), persisted to the database, and then broadcast to every connected client over Socket.io (`message:new`). Typing indicators and online/offline presence are handled purely over Socket.io and are **not** persisted — they're in-memory on the server and reset when it restarts.

## Running it

Both services already run as Replit workflows and share the project's Postgres database (`DATABASE_URL` is provisioned automatically by Replit — no manual setup needed):

- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev` (REST API + Socket.io, mounted under `/api`)
- `artifacts/chat-app: web` — `pnpm --filter @workspace/chat-app run dev` (the chat UI, mounted at `/`)

If you're running outside of Replit's workflow system, start both manually from the repo root:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/chat-app run dev
```

## Environment variables

- `DATABASE_URL` — Postgres connection string. On Replit this is provisioned and injected automatically; nothing to configure.
- `PORT` — injected per-service by Replit's workflow/port system; not something you need to set by hand.

No other secrets or API keys are required — usernames are a dummy, no-password identity for the session only.

## REST API

- `GET /api/messages?limit=` — chat history, oldest → newest (used on page load/refresh).
- `POST /api/messages` — body `{ username, content }`, persists a message and broadcasts it over Socket.io.

## Socket.io events

Path: `/api/socket.io/` (mounted under the API's `/api` prefix so it shares the same host/port as the REST API).

| Direction | Event | Payload |
|---|---|---|
| client → server | `identify` | `{ username }` — sent once on connect (and reconnect) |
| client → server | `typing:start` / `typing:stop` | — |
| server → client | `message:new` | `Message` — broadcast after a message is persisted |
| server → client | `presence:update` | `{ online: string[] }` — full list of online usernames |
| server → client | `typing:update` | `{ usernames: string[] }` — who else is currently typing |

## Design decisions & assumptions

- **Dummy auth only**: a display name is not a real account — no password, no persistence of identity beyond the browser session (`sessionStorage`). Anyone can pick any name; this is a demo/internal-tool trust model, not a production auth system.
- **One shared room**: there's no concept of multiple rooms/channels or DMs — every connected client sees the same message stream.
- **Presence/typing are ephemeral by design**: they reflect "who's connected right now," so they intentionally reset on server restart rather than being stored in the database. Message content is the only durable data.
- **REST for writes, sockets for fan-out**: sending a message always goes through the REST endpoint (so it's validated and persisted the same way regardless of transport), and the server is the single source of truth that broadcasts the confirmed message back over the socket — clients never trust their own optimistic echo as the final state.
- **History limit**: `GET /api/messages` defaults to the last 100 messages; older history isn't paginated in this version.

## Notes on submission logistics

This workspace can build and run the app, but a few submission items are outside what I can produce directly from here:
- **GitHub repo link** — I can push this project to a GitHub remote if you connect one (Replit supports linking a GitHub repo from the project settings); ask if you'd like help with that.
- **APK** — this is the web (React) version of the app, not a React Native build, so there's no APK to produce. If you specifically need a mobile app, that would be a separate build.
- **Screen recording** — I can't record video of the running app myself; you'd capture that yourself from the live preview once it's deployed.
