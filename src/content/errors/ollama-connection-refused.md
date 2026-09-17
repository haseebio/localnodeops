---
module: "Ollama"
errorCode: "OLLAMA_CONNECTION_REFUSED"
title: "Error: could not connect to Ollama, is it running?"
summary: "The Ollama server isn't running, or a client is pointed at the wrong host/port."
severity: "info"
---

## Symptom

`Error: could not connect to ollama app, is it running?`

or a connection-refused error from any client (Open WebUI, a custom
script) trying to reach the Ollama API.

## Cause

Ollama runs as a background service on `127.0.0.1:11434` by default. This
fires when that service isn't running, or when a client — especially one
running inside a separate Docker container — is trying to reach
`localhost` instead of the host machine or Ollama's container name.

## Fix

- Confirm the service is running: `ollama serve` (or check it's running
  as a background process/service on your OS).
- If Ollama and your client are in separate Docker containers on the same
  compose network, point the client at the service name, not `localhost`
  — e.g. `OLLAMA_BASE_URL=http://ollama:11434`, matching the container
  name in `docker-compose.yml`, not `http://localhost:11434`.
- If connecting from outside the host machine, confirm `OLLAMA_HOST` is
  set to bind beyond `127.0.0.1` (e.g. `0.0.0.0`) — the default only
  accepts local connections.