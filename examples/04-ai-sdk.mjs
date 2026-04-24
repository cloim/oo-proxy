/**
 * 04-ai-sdk.mjs
 *
 * Vercel AI SDK와 함께 사용하는 예제.
 * generateText, streamText, tool calling을 다룹니다.
 *
 * 사전 설치:
 *   npm install ai @ai-sdk/openai zod
 *
 * 실행 방법:
 *   bun run start &
 *   node examples/04-ai-sdk.mjs
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateText, streamText, tool } from "ai"
import { z } from "zod"

const openai = createOpenAI({
	baseURL: process.env.OO_PROXY_BASE_URL ?? "http://127.0.0.1:40531/v1",
	apiKey: "unused",
})

// 1. generateText
const { text } = await generateText({
	model: openai.chat("gpt-5.2"),
	prompt: "왜 코드 리뷰가 중요한지 두 문장으로 말해 줘.",
})
console.log("generateText:", text)

// 2. streamText
console.log("\nstreamText:")
const result = streamText({
	model: openai.chat("gpt-5.2"),
	prompt: "async/await와 Promise의 차이를 설명해 줘.",
})
for await (const delta of result.textStream) {
	process.stdout.write(delta)
}
process.stdout.write("\n")

// 3. Tool calling
console.log("\nTool calling:")
const { text: toolText, toolCalls } = await generateText({
	model: openai.chat("gpt-5.4"),
	messages: [
		{ role: "user", content: "서울의 현재 날씨를 알려줘." },
	],
	tools: {
		getWeather: tool({
			description: "특정 도시의 현재 날씨를 조회합니다.",
			parameters: z.object({
				city: z.string().describe("도시 이름"),
			}),
			execute: async ({ city }) => ({
				city,
				tempC: 22,
				condition: "맑음",
			}),
		}),
	},
	maxSteps: 2,
})
console.log("tool 결과:", toolText || JSON.stringify(toolCalls, null, 2))
