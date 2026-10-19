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
