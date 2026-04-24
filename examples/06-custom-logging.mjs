/**
 * 06-custom-logging.mjs
 *
 * requestLogger 콜백으로 요청/응답 이벤트를 커스텀 처리하는 예제.
 * 파일 저장, 외부 모니터링 연동 등에 활용할 수 있습니다.
 *
 * 실행 방법:
 *   bun run build:proxy
 *   node examples/06-custom-logging.mjs
 */

import { startOoProxyServer } from "../packages/oo-proxy/dist/index.js"

// 간단한 인메모리 통계 수집기
const stats = {
	requests: 0,
	responses: 0,
	errors: 0,
	totalTokens: 0,
	totalDurationMs: 0,
}

const server = await startOoProxyServer({
	host: "127.0.0.1",
	port: 0,
	models: ["gpt-5.2"],
	requestLogger: (event) => {
		const ts = new Date().toISOString()

		switch (event.type) {
			case "chat_request":
				stats.requests++
				console.log(
					`[${ts}] REQ #${stats.requests} model=${event.model} messages=${event.messageCount}`,
				)
				break

			case "chat_response":
				stats.responses++
				stats.totalDurationMs += event.durationMs
				if (event.usage.totalTokens) stats.totalTokens += event.usage.totalTokens
				console.log(
					`[${ts}] RES #${stats.responses} status=${event.status} ${event.durationMs}ms tokens=${event.usage.totalTokens ?? 0}`,
				)
				break

			case "chat_error":
				stats.errors++
				console.error(`[${ts}] ERR ${event.message}`)
				break
		}
	},
})

console.log(`서버 시작됨: ${server.url}\n`)

// 요청 3회 반복
for (let i = 1; i <= 3; i++) {
	await fetch(`${server.url}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: "gpt-5.2",
			messages: [{ role: "user", content: `${i}번 요청: 숫자 ${i}를 한글로 말해줘.` }],
		}),
	})
}

// 통계 출력
console.log("\n--- 통계 ---")
console.log(`총 요청: ${stats.requests}`)
console.log(`총 응답: ${stats.responses}`)
console.log(`총 에러: ${stats.errors}`)
console.log(`총 토큰: ${stats.totalTokens}`)
console.log(`평균 응답 시간: ${Math.round(stats.totalDurationMs / stats.responses)}ms`)

await server.close()
