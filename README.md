# oo-proxy

[GitHub](https://github.com/cloim/oo-proxy) | [Legal](#legal)

ChatGPT 계정의 OAuth 토큰을 이용한 무료 OpenAI API 호환 로컬 프록시.

`openai-oauth`를 fork하여 개발 중인 프로젝트입니다.

## 빠른 시작

```bash
# 의존성 설치 (최초 1회)
bun install

# 빌드 + 실행
bun run start

# 옵션 예시
bun run start -- --verbose
bun run start -- --verbose --port 8080
```

서버가 정상 시작되면:

```text
OpenAI-compatible endpoint ready at http://127.0.0.1:40531/v1
Use this as your OpenAI base URL. No API key is required.
Available Models: gpt-5.4, gpt-5.3-codex, ...
```

auth 파일이 없으면 먼저 아래를 실행하세요:

```bash
npx @openai/codex login
```

## 개발 워크플로우

```bash
# 의존성 설치
bun install

# 빌드만
bun run build:proxy

# 빌드 없이 TypeScript 소스 직접 실행
cd packages/oo-proxy && bun run dev --verbose

# 테스트
cd packages/oo-proxy && npx vitest run
```

## How to Use

### CLI

```bash
bun run start -- [options]
```

### 프로그래매틱 사용

```ts
import { startOoProxyServer } from "./packages/oo-proxy/dist/index.js"

const server = await startOoProxyServer({
  host: "127.0.0.1",
  port: 40531,
  verbose: true,
})

console.log(`서버 시작됨: ${server.url}`)
await server.close()
```

### oo-proxy-provider (Vercel AI SDK)

```ts
import { generateText } from "ai"
import { createOoProxy } from "oo-proxy-provider"

const openai = createOoProxy()

const result = await generateText({
  model: openai("gpt-5.4"),
  prompt: "write an essay about dogs",
})

console.log(result.text)
```

## Configuration

| Config              | CLI                 | Provider       | Default                                                                                                                                              | Description                                                                                                                        |
| ------------------- | ------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Host binding        | `--host`            | N/A            | `127.0.0.1`                                                                                                                                          | Host interface the local proxy binds to.                                                                                           |
| Port                | `--port`            | N/A            | `40531`                                                                                                                                              | Port the local proxy binds to.                                                                                                     |
| Verbose logging     | `--verbose`         | `verbose`      | off                                                                                                                                                  | Print each request/response to stdout in `[ts][R/A][model] text` format.                                                          |
| Model allowlist     | `--models`          | N/A            | Account-specific Codex models discovered from ChatGPT                                                                                                | Comma-separated list of model ids exposed by `/v1/models`.                                                                        |
| Codex API version   | `--codex-version`   | `codexVersion` | Local `codex --version`, then `@openai/codex` latest from npm, then `0.111.0`                                                                        | Override the Codex API client version used for model discovery.                                                                    |
| Upstream base URL   | `--base-url`        | `baseURL`      | `https://chatgpt.com/backend-api/codex`                                                                                                              | Override the upstream Codex base URL.                                                                                              |
| OAuth client id     | `--oauth-client-id` | `clientId`     | `app_EMoamEEZ73f0CkXaXp7hrann`                                                                                                                       | Override the OAuth client id used for refresh.                                                                                     |
| OAuth token URL     | `--oauth-token-url` | `tokenUrl`     | `https://auth.openai.com/oauth/token`                                                                                                                | Override the OAuth token URL used for refresh.                                                                                     |
| Auth file path      | `--oauth-file`      | `authFilePath` | `--oauth-file` path if provided, otherwise `$CHATGPT_LOCAL_HOME/auth.json`, `$CODEX_HOME/auth.json`, `~/.chatgpt-local/auth.json`, `~/.codex/auth.json` | Override where the local OAuth auth file is discovered.                                                                            |
| Ensure fresh tokens | N/A                 | `ensureFresh`  | `true`                                                                                                                                               | Control whether access tokens are refreshed automatically.                                                                         |
| Provider name       | N/A                 | `name`         | `openai`                                                                                                                                             | Override the provider name exposed to Vercel AI SDK internals.                                                                     |
| Custom logger       | N/A                 | `requestLogger`| off                                                                                                                                                  | Callback `(event) => void` for custom request/response logging.                                                                    |

## Verbose Logging

`--verbose` 플래그를 켜면 요청과 응답이 아래 형식으로 출력됩니다:

```text
[2026-04-24T09:41:22.123Z][R][gpt-5.2] 안녕하세요, 오늘 날씨가 어때요?
[2026-04-24T09:41:23.456Z][A][gpt-5.2] 안녕하세요! 오늘 서울 날씨는 맑고 기온은 22도입니다.
[2026-04-24T09:41:24.000Z][E] messages must be an array
```

- `[R]` 요청 (마지막 user 메시지, 100자 초과 시 `…` 처리)
- `[A]` 응답 (assistant 텍스트, 100자 초과 시 `…` 처리)
- `[E]` 에러

JSON 형식 로그가 필요하면 환경변수를 사용하세요:

```bash
CODEX_OPENAI_SERVER_LOG_REQUESTS=1 bun run start
```

## Features

- `/v1/chat/completions` — 스트리밍/비스트리밍
- `/v1/responses` — Codex responses 엔드포인트
- `/v1/models` — 계정 연동 모델 목록 또는 `--models`로 고정
- Tool calls
- Reasoning (`reasoning_effort`)
- 커스텀 request logger 콜백

## Monorepo

| 패키지 | 설명 |
| --- | --- |
| `packages/oo-proxy` | CLI 및 로컬 프록시 서버 |
| `packages/oo-proxy-provider` | Vercel AI SDK 프로바이더 |
| `packages/oo-proxy-core` | OAuth 인증, Codex 전송, SSE 파싱 공유 내부 패키지 |

## Examples

`examples/` 디렉터리에 사용 예제가 있습니다:

| 파일 | 설명 |
| --- | --- |
| `01-basic-fetch.mjs` | `fetch`로 모델 목록 조회 + 텍스트 생성 |
| `02-stream-fetch.mjs` | SSE 스트리밍 직접 파싱 |
| `03-openai-sdk.mjs` | 공식 OpenAI Node.js SDK 연동 |
| `04-ai-sdk.mjs` | Vercel AI SDK (generateText / streamText / tool calling) |
| `05-programmatic.mjs` | 서버 직접 시작/종료 |
| `06-custom-logging.mjs` | `requestLogger` 커스텀 통계 수집 |

## Legal

This is an unofficial, community-maintained project and is not affiliated with, endorsed by, or sponsored by OpenAI, Inc.

It uses your local Codex/ChatGPT authentication cache (auth.json, e.g. `~/.codex/auth.json`) and should be treated like password-equivalent credentials.

Use only for personal, local experimentation on trusted machines; do not run as a hosted service, do not share access, and do not pool or redistribute tokens.

You are solely responsible for complying with OpenAI's Terms, policies, and any applicable agreements; misuse may result in rate limits, suspension, or termination.

Provided "as is" with no warranties; you assume all risk for data exposure, costs, and account actions.
