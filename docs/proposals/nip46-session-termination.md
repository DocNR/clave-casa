# NIP-46 Session Termination Event (proposal)

_Draft proposal, opened 2026-05-03. Status: implementing in clave.casa + Clave iOS for cross-client validation; spec PR deferred until we have working evidence._

## Motivation

NIP-46 today is strictly request-response. The client always initiates; the signer always responds to a specific request id. There is no mechanism for the signer to proactively notify a paired client that the session has been terminated.

Without this, when a user deletes an account or unpairs a connection on the signer side, the connected client (e.g. clave.casa, POWR) has no idea. The next request the client tries:

- **Account deleted** — proxy can't route; no response is ever sent. Client times out (15s post-tightening; was 45s).
- **Connection unpaired** — signer responds with `error: "Unauthorized"` (or "Invalid or missing bunker secret" in Clave's case). Client recovers in ~1s after [audit-5 / connect-error fix lands in iOS].

Neither path is great UX, especially for the deleted-account case. A proactive termination event lets clients react immediately when they're online at termination time.

## Proposal

### Wire format

Standard NIP-46 RPC shape, signer-to-client direction, kind 24133, encrypted to the client's pubkey via the existing per-pair conversation key (NIP-44 v2 preferred, NIP-04 fallback per existing scheme).

```json
{
  "id": "<random hex string, NOT correlated with any prior client request id>",
  "method": "session_terminated",
  "params": ["<reason>"]
}
```

**Signed by** the signer's nsec (so the client verifies authenticity via standard NIP-46 trust model).

**Tagged** with `["p", client_pubkey]` so client subscriptions receive it.

### Reasons

Open-ended strings, allow ecosystem extension. Initial reserved values:

- `"account_deleted"` — the underlying nsec is being destroyed. All connections paired with this signer pubkey are dead.
- `"connection_unpaired"` — this specific connection was removed; the signer keeps the account and may have other paired clients.
- `"signer_revoked"` — generic catch-all for other signer-side terminations (e.g. policy-driven revocation, security incident).

Client implementations SHOULD treat unknown reasons as if they were `"connection_unpaired"` (most conservative — assume the connection is dead but the user may still have other valid pairings).

### Signer behavior

When a user-initiated termination occurs (account delete, connection unpair, etc.), the signer:

1. Iterates over the paired connections affected by the termination.
2. For each connection, builds a kind:24133 event with the wire format above.
3. Signs with the signer's nsec (must happen BEFORE nsec deletion in the account-delete path).
4. Encrypts the payload with the per-pair conversation key.
5. Publishes to all relays declared in the connection's bunker URI / nostrconnect URI.
6. Best-effort — does NOT block the user-initiated action on publish success.

**Critical for account deletion:** the signing + publishing MUST happen before the nsec is destroyed. If the signer's storage flow deletes the nsec first, signing fails. Recommended flow:

```
1. Confirm user intent
2. Build all termination events for paired connections
3. Sign + encrypt all events (still have nsec)
4. Publish events to relays (best-effort, fire-and-forget)
5. Delete nsec from storage
```

### Client behavior

The client already subscribes to kind:24133 events from `bp.pubkey` (signer pubkey) tagged for its own pubkey, for normal RPC responses. When an incoming event matches the termination shape:

1. Verify the event is signed by the expected `bp.pubkey` (already standard).
2. Decrypt the payload.
3. Parse JSON. If `method === "session_terminated"`:
   - Surface a notification to the user (toast, banner, modal)
   - Remove the connection from local storage
   - Redirect to the client's pair / connect flow (if no other accounts)
   - **Ignore the event in any pending RPC response listener** — the `id` should NOT match any client request id
4. If `method` is anything else and `id` doesn't match a known listener, ignore (existing behavior).

### Backward compatibility

- **Signers that don't implement:** clients fall back to the existing connect-then-Unauthorized recovery path. No regression.
- **Clients that don't implement:** signers' termination events arrive on the relay, get ignored by the client subscription handler (no listener for the random id). No regression.

This is a fully optional, additive feature.

## Limitations

1. **Ephemeral relay storage.** kind:24133 events are ephemeral by NIP-01 spec — relays SHOULD NOT persist them. A client that is offline at termination time will not receive the event on next session start. The fallback to connect-then-Unauthorized covers this case (still ~1s recovery once iOS audit-5 lands; longer for the account-deleted-no-route case).

   **Alternative considered:** use a parameterized-replaceable kind in 30000-39999 range so relays persist the event. Rejected for v1 because it changes the kind from 24133 (NIP-46 transport) to a new event type, broadening the spec scope.

2. **Multi-relay reachability.** Clients listen on `bp.relays`. Termination events must be published to those exact relays. Signers SHOULD publish to all relays declared in the original pairing.

3. **Multi-client cost.** Account deletion with N paired clients = N signed+encrypted+published events. ~1-2s for typical N. Acceptable.

4. **Privacy timing leak.** Observers on the bunker relay can correlate "termination event from signer X to client Y" with "user just performed a termination action". Same baseline observability as any NIP-46 traffic; minor additional signal. Acceptable.

5. **Race conditions on account delete.** If iOS dies / loses network mid-deletion, some clients may not receive the termination event. The fallback path handles this. No data loss; just longer recovery.

## Reference implementations

| Project | Status | Files |
|---|---|---|
| **clave.casa** | Receiver shipped 2026-05-03 (no-op until signer publishes) | `src/lib/signer.ts` (subscription handler extension), `src/routes/edit/+page.svelte` (auto-cleanup on receipt) |
| **Clave iOS** | Pending — queued for next iOS session | `Shared/LightSigner.swift` (publish on `deleteKey` / `unpairClient`); coordinate with `~/clave-casa/docs/proposals/nip46-session-termination.md` |
| **POWR** | Pending — queued via clave-casa BACKLOG ecosystem-outreach item | Drop-in receiver based on clave.casa pattern |

## Spec PR plan

After cross-client validation between clave.casa, Clave iOS, and POWR, file PR against [`nostr-protocol/nips`](https://github.com/nostr-protocol/nips) amending NIP-46 with this section. Tag maintainers of:

- Amber (greenart7c3/Amber) — Android signer
- nsec.app / noauth — web signer
- nostr-tools BunkerSigner upstream — for client-side handler reference
- Coracle / nostrudel — example client adopters

## Open questions for community review

1. Should the spec recommend a specific relay set for termination events (e.g. always publish to all relays the connection has ever used), or leave that to signer discretion?
2. Should there be a way for the CLIENT to send a "session_terminated" event back to the signer (i.e. "I'm done with this connection, please clean up")? Out of scope for v1; could be a v2 addition.
3. Should we standardize a small set of reasons or leave it fully open-string?
4. How should multi-relay event echoes be deduplicated by the client? (Existing dedup-by-event-id should suffice.)
