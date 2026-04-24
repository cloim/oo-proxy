/**
 * 01-basic-fetch.mjs
 *
 * 가장 간단한 사용 예제.
 * oo-proxy 서버가 실행 중인 상태에서 fetch로 직접 요청합니다.
 *
 * 실행 방법:
 *   bun run start &          # 서버 백그라운드 실행
 *   node examples/01-basic-fetch.mjs
 */

const BASE_URL = process.env.OO_PROXY_BASE_URL ?? "http://127.0.0.1:40531/v1"

// 1. 사용 가능한 모델 목록 조회
const modelsRes = await fetch(`${BASE_URL}/models`)
const models = await modelsRes.json()
console.log("사용 가능한 모델:")
for (const model of models.data) {
	console.log(" -", model.id)
}

// 2. 단순 텍스트 생성
const chatRes = await fetch(`${BASE_URL}/chat/completions`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		model: "gpt-5.2",
		messages: [{ role: "user", content: "한 문장으로 자기소개해 줘." }],
	}),
})

const chat = await chatRes.json()
console.log("\n응답:", chat.choices[0].message.content)
