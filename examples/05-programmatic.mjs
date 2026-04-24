/**
 * 05-programmatic.mjs
 *
 * oo-proxy 서버를 코드에서 직접 임베드하는 예제.
 * CLI 없이 Node.js 앱 내부에서 서버를 시작/종료합니다.
 *
 * 실행 방법:
 *   bun run build:proxy
 *   node examples/05-programmatic.mjs
 */

import { startOoProxyServer } from "../packages/oo-proxy/dist/index.js"

const server = await startOoProxyServer({
	host: "127.0.0.1",
	port: 0, // 0 = OS가 빈 포트를 자동 할당
	models: ["gpt-5.2", "gpt-5.4"],
	verbose: true,
})

console.log(`서버 시작됨: ${server.url}`)

// 서버를 통해 직접 요청
const res = await fetch(`${server.url}/chat/completions`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		model: "gpt-5.2",
		messages: [{ role: "user", content: "안녕!" }],
	}),
})
const data = await res.json()
console.log("응답:", data.choices[0].message.content)

// 서버 종료
await server.close()
console.log("서버 종료됨")
