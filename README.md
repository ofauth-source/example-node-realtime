# OFAuth Realtime inbox counters

Open a server-side WebSocket for one connected linked account and print its inbox counters. The example does not change application state.

## Install and configure

Use Node.js 22 or later and an OAuth authorization with `profile:read` for the selected connected linked account.

```bash
git clone https://github.com/ofauth-source/example-node-realtime.git
cd example-node-realtime
npm ci
cp .env.example .env
```

Replace both placeholders in `.env` with your access token and the linked account ID shared with that authorization. Keep this file private and excluded from version control. Run the listener on your backend; do not expose the token in browser code or append it to the socket URL.

## Run

```bash
npm start
```

Expect `Connected`. When the account receives a `realtime.inbox_counts.updated` event, the listener prints a row such as:

```json
{"linkedAccountId":"conn_example123","environment":"live","receivedAt":"2026-04-23T14:30:15.143Z","chatMessagesCount":1,"countPriorityChat":2,"unreadTips":3}
```

These are the event's counter values, not increments to add for every delivery. The listener ignores other event types, another account's messages, malformed JSON, and duplicate or older `order` values. An open WebSocket alone does not prove that a matching event has occurred. Use a designated Test account to check a real inbox-count change. Press Ctrl+C to stop.

## Recover a WebSocket connection

The listener makes at most five WebSocket connection attempts per run, with waits of approximately 1, 2, 4, and 8 seconds. It retries failed WebSocket connections and `503` upgrades. It stops on other rejected upgrades, a normal close (`1000`), or authority loss (`4003`). Recover expired authorization or account access before restarting after access changes. There is no automatic token refresh in this example.

The WebSocket envelope uses `receivedAt`. Lifecycle events arrive through webhooks. Do not assume missed activity replays after reconnecting; reconcile current resources after a disconnect.

Before applying updates, map the authorization and linked account to their owning application user, keep environments separate, and persist ordering state. The sample retains its last order only for the current process and logs counters without durable storage.

See [Realtime OnlyFans events](https://docs.ofauth.com/v3/guides/realtime-onlyfans-events) for the event envelope and webhook alternative.

## OAuth ownership and recovery

Use the [Express OAuth example](https://github.com/ofauth-source/example-express-oauth) for client registration, a session-bound callback with S256 PKCE, ordinary token persistence, paginated account discovery, explicit account selection, provider reconnect, and RFC 7009 revocation. Sandbox, Test, and Live use the same standard confidential OAuth flow.

Your auth framework or application owns the tokens. Access tokens are opaque and initially last 15 minutes; use the returned `expires_in`. Refresh tokens remain stable and expire after 90 days without authenticated refresh. Separate instances can refresh concurrently, and a lost refresh response can be retried with the same token. No mandatory database refresh lock or attempt journal is needed. Protect registration changes with conditional writes.

A provider session error requires reconnect for that exact linked account. OAuth refresh cannot repair it. Revoking a refresh token ends that credential and its access tokens; ending the authorization ends every credential. Never automatically repeat an interrupted provider write. Developer requests use the application's Developer entitlement; the account owner's Operator plan is independent.

The listener receives a supplied access token and stops when its authority expires or is revoked. Have your backend obtain a current token from its credential owner and restart the socket. Realtime is Developer-only; Operator credentials cannot open this connection. Bearer tokens belong in the authenticated upgrade header, never the URL.
