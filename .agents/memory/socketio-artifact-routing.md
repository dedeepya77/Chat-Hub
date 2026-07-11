---
name: Socket.io in a path-routed artifact
description: How to wire Socket.io so it survives Replit's path-based artifact proxy without touching artifact.toml.
---

When adding Socket.io to an API artifact in this project's path-based routing setup, set the Socket.io server's `path` option to something under the artifact's own `previewPath` (e.g. an API artifact with `previewPath: "/api"` should use `path: "/api/socket.io/"`), and connect the client with `io({ path: "/api/socket.io/" })` (no host needed — same origin).

**Why:** the proxy already forwards everything under the artifact's registered path prefix to that artifact's port. A Socket.io path nested under the existing prefix rides along for free. A path outside the prefix (e.g. the Socket.io default `/socket.io/` when the artifact's prefix is `/api`) would need a new entry in `artifact.toml`'s `paths` array (via the artifacts tool, never a direct edit) or the proxy silently drops the WebSocket upgrade.

**How to apply:** whenever adding realtime/WebSocket support to an artifact that isn't mounted at root, nest the socket path under that artifact's existing prefix rather than requesting a new proxied path.
