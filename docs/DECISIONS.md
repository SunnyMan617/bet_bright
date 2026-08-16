# Architecture and tricky decisions

## Operator integration

Betway does not publish this booking-code interface as a public developer API. The adapter uses the same versioned `FindBookABet` and `BookABet` services currently used by the Nigeria web client. Those details are isolated in `server/betway.ts` so a path or schema change has one repair point.

The backend sends only country, culture, and selection identity. It never authenticates as a player and never places a wager.

## What “same bet” means

Names and odds are not stable identifiers. Names can be localized and prices move. Equality therefore means equal sets of:

```text
(eventId, marketId, outcomeId)
```

After `BookABet` returns a new code, BetBridge always calls `FindBookABet` on that code and compares the sets. The response reports missing and unexpected selections. This catches the tricky case where a leg is suspended between decoding and creation and Betway omits it.

## Live and expired legs

The UI deliberately does not filter inactive selections. An unavailable leg is still part of what Betway returned and is important evidence when investigating a mismatch. It is dimmed and labelled instead.

## Storage

SQLite is used for operational audit data because the product has one service and no user accounts. The `OperationStore` interface keeps a Postgres migration straightforward. No raw upstream response, account data, stake, or payment data is stored.

## Reliability boundary

The 30-second evaluation target is protected with a 9-second upstream timeout, a compact single-call decode path, stable error mapping, request IDs, and rate limiting. Encode and Convert necessarily make multiple operator calls because verification is part of their contract.
