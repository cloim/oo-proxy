import type {
	OoProxyServerLogEvent,
	OoProxyServerOptions,
} from "./types.js"

const formatVerboseEvent = (event: OoProxyServerLogEvent): string => {
	const ts = new Date().toISOString()
	if (event.type === "chat_request") {
		return `[${ts}][R][${event.model ?? "?"}] ${event.prompt ?? ""}`
	}
	if (event.type === "chat_response") {
		return `[${ts}][A][${event.model ?? "?"}] ${event.responseText ?? ""}`
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
