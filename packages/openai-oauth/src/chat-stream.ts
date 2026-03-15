import { streamText } from "ai"
import type { OpenAIOAuthProvider } from "../../openai-oauth-provider/src/index.js"
import {
	createToolSet,
	toModelMessages,
	toToolChoice,
} from "./chat-messages.js"
import { emitRequestLog } from "./logging.js"
import { corsHeaders, mapFinishReason, sseHeaders, toUsage } from "./shared.js"
import type {
	ChatRequest,
	OpenAIOAuthServerLogEvent,
	UsageLike,
} from "./types.js"

const encodeSse = (data: unknown): Uint8Array =>
	new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

const encodeDone = (): Uint8Array =>
	new TextEncoder().encode("data: [DONE]\n\n")

const logChatStreamResult = (
	logger: ((event: OpenAIOAuthServerLogEvent) => void) | undefined,
	requestId: string,
	startedAt: number,
	finishReason: string,
	usage: UsageLike,
) => {
	emitRequestLog(logger, {
		type: "chat_response",
		requestId,
		path: "/v1/chat/completions",
		status: 200,
		stream: true,
		durationMs: Date.now() - startedAt,
		finishReason,
		usage,
	})
}

export const streamChatCompletions = async (
	request: ChatRequest,
	provider: OpenAIOAuthProvider,
	logContext: {
		logger?: (event: OpenAIOAuthServerLogEvent) => void
		requestId: string
		startedAt: number
	},
): Promise<Response> => {
	const toolIndexes = new Map<string, number>()
	const created = Math.floor(Date.now() / 1000)
	const id = `chatcmpl_${crypto.randomUUID()}`
	const result = streamText({
		model: provider(request.model ?? "gpt-5.2"),
		messages: toModelMessages(request.messages ?? []),
		tools: createToolSet(request.tools),
		toolChoice: toToolChoice(request.tool_choice),
		temperature: request.temperature,
		topP: request.top_p,
		stopSequences:
			typeof request.stop === "string"
				? [request.stop]
				: Array.isArray(request.stop)
					? request.stop
					: undefined,
		maxOutputTokens: request.max_tokens,
		providerOptions: {
			openai: {
				parallelToolCalls: request.parallel_tool_calls,
				reasoningEffort: request.reasoning_effort,
			},
		},
	})

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			controller.enqueue(
				encodeSse({
					id,
					object: "chat.completion.chunk",
					created,
					model: request.model,
					choices: [
						{ index: 0, delta: { role: "assistant" }, finish_reason: null },
					],
				}),
			)

			for await (const part of result.fullStream) {
				switch (part.type) {
					case "text-delta":
						controller.enqueue(
							encodeSse({
								id,
								object: "chat.completion.chunk",
								created,
								model: request.model,
								choices: [
									{
										index: 0,
										delta: { content: part.text },
										finish_reason: null,
									},
								],
							}),
						)
						break
					case "tool-input-start": {
						const nextIndex = toolIndexes.size
						toolIndexes.set(part.id, nextIndex)
						controller.enqueue(
							encodeSse({
								id,
								object: "chat.completion.chunk",
								created,
								model: request.model,
								choices: [
									{
										index: 0,
										delta: {
											tool_calls: [
												{
													index: nextIndex,
													id: part.id,
													type: "function",
													function: { name: part.toolName, arguments: "" },
												},
											],
										},
										finish_reason: null,
									},
								],
							}),
						)
						break
					}
					case "tool-input-delta": {
						const index = toolIndexes.get(part.id)
						if (index == null) {
							break
						}

						controller.enqueue(
							encodeSse({
								id,
								object: "chat.completion.chunk",
								created,
								model: request.model,
								choices: [
									{
										index: 0,
										delta: {
											tool_calls: [
												{ index, function: { arguments: part.delta } },
											],
										},
										finish_reason: null,
									},
								],
							}),
						)
						break
					}
					case "finish":
						logChatStreamResult(
							logContext.logger,
							logContext.requestId,
							logContext.startedAt,
							part.finishReason,
							part.totalUsage,
						)
						controller.enqueue(
							encodeSse({
								id,
								object: "chat.completion.chunk",
								created,
								model: request.model,
								choices: [
									{
										index: 0,
										delta: {},
										finish_reason: mapFinishReason(part.finishReason),
									},
								],
							}),
						)
						controller.enqueue(
							encodeSse({
								id,
								object: "chat.completion.chunk",
								created,
								model: request.model,
								choices: [],
								usage: toUsage(part.totalUsage),
							}),
						)
						break
					case "error":
						emitRequestLog(logContext.logger, {
							type: "chat_error",
							requestId: logContext.requestId,
							path: "/v1/chat/completions",
							durationMs: Date.now() - logContext.startedAt,
							message:
								part.error instanceof Error
									? part.error.message
									: "Streaming chat completion failed.",
						})
						controller.error(
							part.error instanceof Error
								? part.error
								: new Error("Streaming chat completion failed.", {
										cause: part.error,
									}),
						)
						return
				}
			}

			controller.enqueue(encodeDone())
			controller.close()
		},
	})

	return new Response(stream, {
		status: 200,
		headers: {
			...sseHeaders,
			...corsHeaders,
		},
	})
}
