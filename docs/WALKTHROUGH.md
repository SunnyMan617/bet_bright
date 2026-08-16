# Five-minute screen-recording outline

## 0:00–0:35 — Product

Open the live URL. Explain that Decode is the verification-critical path and that the green “connector live” status refers to server-side Betway access, not cached demo data.

## 0:35–1:25 — Decode

Paste a fresh evaluator code. Point out event, league, live/start state, market, selection, odds, and the exact booking code. Open the same code on Betway side by side and compare the legs.

## 1:25–2:20 — Encode

Use “Use these selections in Encode” from a decoded result. Create the code. Highlight the proof banner: the backend created the code, loaded it back, and compared canonical identities.

## 2:20–3:05 — Convert

Paste the original code into Convert. Show source → target, then the verified selection count. Mention that suspended legs cause an honest mismatch rather than a false success.

## 3:05–4:10 — Architecture

Show the Mermaid diagrams in the README and `server/betway.ts`. Explain the browser/Flutter → stable API → operator flow, the identity tuple, timeouts, error mapping, and SQLite audit boundary.

## 4:10–4:40 — Flutter

Install/open the CI-built APK, paste the same code, and show that the slip card consumes the exact same API contract. Mention API URL injection with `--dart-define`.

## 4:40–5:00 — Evidence

Show `npm test`, the logical git commits, the public health endpoint, and the GitHub Actions APK artifact. Close with the iOS path in `docs/IOS.md`.
