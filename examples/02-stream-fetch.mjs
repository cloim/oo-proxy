/**
 * 02-stream-fetch.mjs
 *
 * SSE(Server-Sent Events) 스트리밍 예제.
 * 응답을 토큰 단위로 실시간 출력합니다.
 *
 * 실행 방법:
 *   bun run start &
 *   node examples/02-stream-fetch.mjs
 */

const BASE_URL = process.env.OO_PROXY_BASE_URL ?? "http://127.0.0.1:40531/v1";

const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        model: "gpt-5.4",
        stream: true,
        messages: [{ role: "user", content: "나 누군지 알아?" }],
    }),
});

if (!res.ok || !res.body) {
    console.error("요청 실패:", res.status, await res.text());
    process.exit(1);
}

process.stdout.write("응답: ");

const decoder = new TextDecoder();
for await (const chunk of res.body) {
    const text = decoder.decode(chunk, { stream: true });
    for (const line of text.split("\n")) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        const data = JSON.parse(line.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (content) process.stdout.write(content);
    }
}

process.stdout.write("\n");
