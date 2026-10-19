import WebSocket from "ws"
import { setTimeout as delay } from "node:timers/promises"

const { OFAUTH_ACCESS_TOKEN, OFAUTH_LINKED_ACCOUNT_ID } = process.env
if (!OFAUTH_ACCESS_TOKEN || !OFAUTH_LINKED_ACCOUNT_ID) {
	throw new Error("Set OFAUTH_ACCESS_TOKEN and OFAUTH_LINKED_ACCOUNT_ID")
}
const url = new URL("wss://v3-realtime.ofauth.com/v3/realtime")
url.searchParams.set("linkedAccountId", OFAUTH_LINKED_ACCOUNT_ID)
let lastOrder = 0

function connect() {
	return new Promise(resolve => {
		let retry = true
		const socket = new WebSocket(url, {
			headers: { Authorization: `Bearer ${OFAUTH_ACCESS_TOKEN}` },
			handshakeTimeout: 10_000
		})
		socket.on("open", () => console.log("Connected"))
		socket.on("message", raw => {
			let event
			try { event = JSON.parse(raw.toString()) } catch { return }
			if (event.linkedAccountId !== OFAUTH_LINKED_ACCOUNT_ID ||
				event.schemaVersion !== "1" || !Number.isSafeInteger(event.order) ||
				event.order <= lastOrder) return
			lastOrder = event.order
			if (event.type !== "realtime.inbox_counts.updated") return
			const data = event.data
			if (!data || ![data.chatMessagesCount, data.countPriorityChat, data.unreadTips]
				.every(value => Number.isSafeInteger(value) && value >= 0)) return
			console.log(JSON.stringify({
				linkedAccountId: event.linkedAccountId,
				environment: event.environment,
				receivedAt: event.receivedAt,
				...data
			}))
		})
		socket.on("unexpected-response", (_request, response) => {
			console.error(`Upgrade failed: ${response.statusCode}`)
			retry = response.statusCode === 503
			response.resume()
			socket.terminate()
		})
		socket.on("error", () => console.error("WebSocket connection failed"))
		socket.on("close", code => resolve(retry && code !== 1000 && code !== 4003))
	})
}

// Five connections at most, even if each connection briefly succeeds.
for (let attempt = 0; attempt < 5; attempt++) {
	if (attempt > 0) await delay(1000 * 2 ** (attempt - 1) + Math.random() * 250)
	if (!await connect()) process.exit(0)
}
console.error("Reconnect limit reached; check account access and service status")
process.exitCode = 1
