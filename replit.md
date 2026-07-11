# Pulse — Real-Time Chat

A single-room, real-time chat app: enter a display name, jump in, and talk. Messages, typing indicators, and online presence update live via Socket.io.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Socket.io (workflow `artifacts/api-server: API Server`)
- `pnpm --filter @workspace/chat-app run dev` — run the chat frontend (workflow `artifacts/chat-app: web`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (run after editing `lib/api-spec/openapi.yaml`)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, already provisioned by Replit

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Socket.io (same HTTP server/port)
- Frontend: React + Vite, TanStack Query, Tailwind, shadcn/radix UI, Framer Motion
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → typed React Query hooks + Zod schemas
- Build: esbuild (CJS bundle) for the API, Vite for the frontend

## Where things live

- API contract (source of truth): `lib/api-spec/openapi.yaml`
- Generated REST client/hooks: `lib/api-client-react/src/generated/`
- Generated Zod validators: `lib/api-zod/src/generated/`
- DB schema: `lib/db/src/schema/messages.ts`
- Chat REST routes: `artifacts/api-server/src/routes/messages.ts`
- Socket.io server (presence/typing, broadcasting new messages): `artifacts/api-server/src/lib/chatSocket.ts`
- Chat frontend: `artifacts/chat-app/src/components/join-screen.tsx`, `chat-room.tsx`, `hooks/use-chat-socket.ts`, `hooks/use-user.ts`

## Architecture decisions

- Messages always go through REST (`POST /api/messages`) to persist; the server is the single source of truth and broadcasts the confirmed message over Socket.io (`message:new`) rather than trusting client-side optimistic state.
- Typing indicators and online/offline presence are Socket.io-only and in-memory (not modeled in the OpenAPI spec, not persisted) — they reset on server restart by design.
- Socket.io's `path` is nested under the API artifact's existing `/api` proxy prefix (`/api/socket.io/`) so it rides the existing path-based routing without any artifact.toml changes.
- Auth is a dummy display name (no password, `sessionStorage` only) — this is a single shared room, not a multi-tenant/authenticated product.

## Product

- Join screen: pick a display name, no password.
- Chat room: shared message history (loads on refresh via REST), live incoming messages, online users list, live typing indicator.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing `lib/api-spec/openapi.yaml`, always rerun `pnpm --filter @workspace/api-spec run codegen` before using new hooks/schemas.
- See `.agents/memory/socketio-artifact-routing.md` for the Socket.io + path-routing setup used here.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
