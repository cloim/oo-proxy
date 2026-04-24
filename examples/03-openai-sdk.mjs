/**
 * 03-openai-sdk.mjs
 *
 * 공식 OpenAI Node.js SDK와 함께 사용하는 예제.
 * baseURL만 교체하면 기존 OpenAI 코드를 그대로 사용할 수 있습니다.
 *
 * 사전 설치:
 *   npm install openai
 *
 * 실행 방법:
 *   bun run start &
 *   node examples/03-openai-sdk.mjs
 */

import OpenAI from "openai"

const client = new OpenAI({
	baseURL: process.env.OO_PROXY_BASE_URL ?? "http://127.0.0.1:40531/v1",
	apiKey: "unused", // oo-proxy는 API 키가 필요 없습니다
})

// 1. 일반 요청
const completion = await client.chat.completions.create({
	model: "gpt-5.2",
	messages: [
		{ role: "system", content: "당신은 친절한 코드 리뷰어입니다." },
		{ role: "user", content: "변수명으로 `x`를 사용하는 게 왜 좋지 않나요?" },
	],
})
console.log("일반 응답:", completion.choices[0].message.content)

// 2. 스트리밍 요청
console.log("\n스트리밍 응답:")
const stream = await client.chat.completions.create({
	model: "gpt-5.2",
	stream: true,
	messages: [{ role: "user", content: "TypeScript의 장점을 간단히 설명해 줘." }],
})

for await (const chunk of stream) {
	const content = chunk.choices[0]?.delta?.content
	if (content) process.stdout.write(content)
}
process.stdout.write("\n")
