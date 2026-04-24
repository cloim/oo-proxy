import type {
	OoProxyServerLogEvent,
	OoProxyServerOptions,
} from "./types.js"

const formatTimestamp = (): string => {
	const now = new Date()
	const pad = (n: number) => String(n).padStart(2, "0")
	return (
		`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
		` ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
	)
}

const formatVerboseEvent = (event: OoProxyServerLogEvent): string => {
	const ts = formatTimestamp()
	if (event.type === "chat_request") {
		const header = `[${ts}][R][${event.model ?? "?"}]`
		return event.prompt
			? `${header}\n${event.prompt}`
			: header
	}
	if (event.type === "chat_response") {
		const header = `[${ts}][A][${event.model ?? "?"}]`
		return event.responseText
			? `${header}\n${event.responseText}\n`
			: `${header}\n`
	}
	if (event.type === "chat_error") {
		return `[${ts}][E] ${event.message}`
	}
	return `[${ts}] ${JSON.stringify(event)}`
}

export const createRequestLogger = (
	settings: OoProxyServerOptions,
): ((event: OoProxyServerLogEvent) => void) | undefined => {
	if (typeof settings.requestLogger === "function") {
		return settings.requestLogger
	}

	if (settings.verbose) {
		return (event) => {
			console.log(formatVerboseEvent(event))
		}
	}

	if (process.env.CODEX_OPENAI_SERVER_LOG_REQUESTS !== "1") {
		return undefined
	}

	return (event) => {
		console.log(
			JSON.stringify({
				source: "oo-proxy",
				timestamp: new Date().toISOString(),
				...event,
			}),
		)
	}
}

export const emitRequestLog = (
	logger: ((event: OoProxyServerLogEvent) => void) | undefined,
	event: OoProxyServerLogEvent,
) => {
	try {
		logger?.(event)
	} catch {}
}
