import { afterEach, describe, expect, test, vi } from "vitest"
import { createRequestLogger, emitRequestLog } from "../src/logging.js"
import { summarizeChatRequest } from "../src/shared.js"
import type { OoProxyServerLogEvent } from "../src/types.js"

const TS_PATTERN = /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/

describe("createRequestLogger", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	test("returns undefined when verbose is off and env var is not set", () => {
		expect(createRequestLogger({})).toBeUndefined()
	})

	test("returns undefined when verbose is explicitly false", () => {
		expect(createRequestLogger({ verbose: false })).toBeUndefined()
	})

	test("returns a logger when verbose is true", () => {
		expect(createRequestLogger({ verbose: true })).toBeTypeOf("function")
	})

	test("returns a logger when CODEX_OPENAI_SERVER_LOG_REQUESTS=1", () => {
		vi.stubEnv("CODEX_OPENAI_SERVER_LOG_REQUESTS", "1")
		expect(createRequestLogger({})).toBeTypeOf("function")
	})

	test("prefers custom requestLogger over verbose flag", () => {
		const custom = vi.fn()
		const logger = createRequestLogger({ verbose: true, requestLogger: custom })
		expect(logger).toBe(custom)
	})

	test("prefers custom requestLogger over env var", () => {
		vi.stubEnv("CODEX_OPENAI_SERVER_LOG_REQUESTS", "1")
		const custom = vi.fn()
		const logger = createRequestLogger({ requestLogger: custom })
		expect(logger).toBe(custom)
	})
})

describe("verbose output format", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	const getLogOutput = (event: OoProxyServerLogEvent): string => {
		const lines: string[] = []
		vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg))
		const logger = createRequestLogger({ verbose: true })!
		logger(event)
		return lines[0] ?? ""
	}

	test("formats chat_request with model and message count", () => {
		const out = getLogOutput({
			type: "chat_request",
			requestId: "req-1",
			path: "/v1/chat/completions",
			model: "gpt-5.2",
			messageCount: 3,
			messageRoles: ["system", "user", "assistant"],
			bodyKeys: ["model", "messages"],
			stream: false,
			toolCount: 0,
		})

		expect(out).toMatch(TS_PATTERN)
		expect(out).toContain("[R]")
		expect(out).toContain("[gpt-5.2]")
	})

	test("formats chat_request with prompt text including role prefix", () => {
		const out = getLogOutput({
			type: "chat_request",
			requestId: "req-2",
			path: "/v1/chat/completions",
			model: "gpt-5.2",
			messageCount: 2,
			messageRoles: ["system", "user"],
			bodyKeys: ["model", "messages"],
			stream: false,
			toolCount: 0,
			prompt: "[system] 당신은 도우미입니다.\n[user] 안녕하세요",
		})

		expect(out).toContain("[R]")
		expect(out).toContain("[system] 당신은 도우미입니다.")
		expect(out).toContain("[user] 안녕하세요")
	})

	test("shows full prompt without truncation", () => {
		const long = "가".repeat(120)
		const out = getLogOutput({
			type: "chat_request",
			requestId: "req-3",
			path: "/v1/chat/completions",
			model: "gpt-5.2",
			messageCount: 1,
			messageRoles: ["user"],
			bodyKeys: ["model", "messages"],
			stream: false,
			toolCount: 0,
			prompt: long,
		})

		expect(out).toContain(long)
		expect(out).not.toContain("…")
	})

	test("formats chat_request with unknown model as ?", () => {
		const out = getLogOutput({
			type: "chat_request",
			requestId: "req-4",
			path: "/v1/chat/completions",
			model: undefined,
			messageCount: 1,
			messageRoles: ["user"],
			bodyKeys: ["messages"],
			stream: false,
			toolCount: 0,
		})

		expect(out).toContain("[?]")
	})

	test("formats chat_response with response text", () => {
		const out = getLogOutput({
			type: "chat_response",
			requestId: "req-5",
			path: "/v1/chat/completions",
			status: 200,
			stream: false,
			durationMs: 1234,
			finishReason: "stop",
			model: "gpt-5.2",
			responseText: "안녕하세요! 저는 AI입니다.",
			usage: { totalTokens: 512 },
		})

		expect(out).toMatch(TS_PATTERN)
		expect(out).toContain("[A]")
		expect(out).toContain("[gpt-5.2]")
		expect(out).toContain("안녕하세요! 저는 AI입니다.")
	})

	test("shows full response text without truncation", () => {
		const long = "나".repeat(120)
		const out = getLogOutput({
			type: "chat_response",
			requestId: "req-6",
			path: "/v1/chat/completions",
			status: 200,
			stream: true,
			durationMs: 800,
			finishReason: "stop",
			model: "gpt-5.2",
			responseText: long,
			usage: {},
		})

		expect(out).toContain(long)
		expect(out).not.toContain("…")
	})

	test("formats chat_error", () => {
		const out = getLogOutput({
			type: "chat_error",
			requestId: "req-8",
			path: "/v1/chat/completions",
			durationMs: 42,
			message: "messages must be an array",
		})

		expect(out).toMatch(TS_PATTERN)
		expect(out).toContain("[E]")
		expect(out).toContain("messages must be an array")
	})
})

describe("JSON output format (env var mode)", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	test("emits JSON with source=oo-proxy and timestamp", () => {
		vi.stubEnv("CODEX_OPENAI_SERVER_LOG_REQUESTS", "1")

		const lines: string[] = []
		vi.spyOn(console, "log").mockImplementation((msg) => lines.push(msg))

		const logger = createRequestLogger({})!
		logger({
			type: "chat_error",
			requestId: "req-json",
			path: "/v1/chat/completions",
			durationMs: 10,
			message: "oops",
		})

		const parsed = JSON.parse(lines[0])
		expect(parsed.source).toBe("oo-proxy")
		expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		expect(parsed.type).toBe("chat_error")
		expect(parsed.requestId).toBe("req-json")
	})
})

describe("emitRequestLog", () => {
	test("calls logger with event", () => {
		const logger = vi.fn()
		const event: OoProxyServerLogEvent = {
			type: "chat_error",
			requestId: "x",
			path: "/v1/chat/completions",
			durationMs: 0,
			message: "err",
		}
		emitRequestLog(logger, event)
		expect(logger).toHaveBeenCalledWith(event)
	})

	test("does not throw when logger is undefined", () => {
		expect(() =>
			emitRequestLog(undefined, {
				type: "chat_error",
				requestId: "x",
				path: "/v1/chat/completions",
				durationMs: 0,
				message: "err",
			}),
		).not.toThrow()
	})

	test("swallows logger errors silently", () => {
		const throwing = () => {
			throw new Error("boom")
		}
		expect(() =>
			emitRequestLog(throwing, {
				type: "chat_error",
				requestId: "x",
				path: "/v1/chat/completions",
				durationMs: 0,
				message: "err",
			}),
		).not.toThrow()
	})
})

describe("summarizeChatRequest prompt extraction", () => {
	test("includes system and user messages with role prefix", () => {
		const { prompt } = summarizeChatRequest({
			model: "gpt-5.2",
			messages: [
				{ role: "system", content: "당신은 도우미입니다." },
				{ role: "user", content: "안녕하세요" },
			],
		})
		expect(prompt).toBe("[system] 당신은 도우미입니다.\n[user] 안녕하세요")
	})

	test("includes all messages including assistant turns", () => {
		const { prompt } = summarizeChatRequest({
			model: "gpt-5.2",
			messages: [
				{ role: "system", content: "You are helpful." },
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there!" },
				{ role: "user", content: "How are you?" },
			],
		})
		expect(prompt).toContain("[system] You are helpful.")
		expect(prompt).toContain("[user] Hello")
		expect(prompt).toContain("[assistant] Hi there!")
		expect(prompt).toContain("[user] How are you?")
	})

	test("extracts text from array content parts", () => {
		const { prompt } = summarizeChatRequest({
			model: "gpt-5.2",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: "이미지 설명해 줘" },
						{ type: "image_url", url: "http://example.com/img.png" },
					],
				},
			],
		})
		expect(prompt).toBe("[user] 이미지 설명해 줘")
	})

	test("returns undefined for empty messages", () => {
		expect(summarizeChatRequest({ messages: [] }).prompt).toBeUndefined()
	})

	test("skips messages with no extractable text", () => {
		const { prompt } = summarizeChatRequest({
			messages: [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: undefined },
			],
		})
		expect(prompt).toBe("[user] Hello")
	})
})
