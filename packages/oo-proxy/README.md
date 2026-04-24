# oo-proxy

[GitHub](https://github.com/cloim/oo-proxy) | [Legal](#legal)

ChatGPT 계정의 OAuth 토큰을 이용한 OpenAI API 호환 로컬 프록시 서버.

## Usage

```bash
# 루트에서 빌드 + 실행
bun run start

# 옵션 전달
bun run start -- --verbose
bun run start -- --verbose --port 8080

# 빌드 없이 소스 직접 실행 (개발용)
bun run dev --verbose
```

서버가 정상 시작되면:

```text
OpenAI-compatible endpoint ready at http://127.0.0.1:40531/v1
Use this as your OpenAI base URL. No API key is required.
Available Models: gpt-5.4, gpt-5.3-codex, ...
```

## Configuration

| Config            | CLI                 | Default                                                                                                                                              | Description                                                                                                                        |
| ----------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Host binding      | `--host`            | `127.0.0.1`                                                                                                                                          | Host interface the local proxy binds to.                                                                                           |
| Port              | `--port`            | `40531`                                                                                                                                              | Port the local proxy binds to.                                                                                                     |
| Verbose logging   | `--verbose`         | off                                                                                                                                                  | Print each request/response to stdout.                                                                                             |
| Model allowlist   | `--models`          | Account-specific Codex models discovered from ChatGPT                                                                                                | Comma-separated list of model ids exposed by `/v1/models`.                                                                        |
| Codex API version | `--codex-version`   | Local `codex --version`, then `@openai/codex` latest from npm, then `0.111.0`                                                                        | Override the Codex API client version used for model discovery.                                                                    |
| Upstream base URL | `--base-url`        | `https://chatgpt.com/backend-api/codex`                                                                                                              | Override the upstream Codex base URL.                                                                                              |
| OAuth client id   | `--oauth-client-id` | `app_EMoamEEZ73f0CkXaXp7hrann`                                                                                                                       | Override the OAuth client id used for refresh.                                                                                     |
| OAuth token URL   | `--oauth-token-url` | `https://auth.openai.com/oauth/token`                                                                                                                | Override the OAuth token URL used for refresh.                                                                                     |
| Auth file path    | `--oauth-file`      | `--oauth-file` path if provided, otherwise `$CHATGPT_LOCAL_HOME/auth.json`, `$CODEX_HOME/auth.json`, `~/.chatgpt-local/auth.json`, `~/.codex/auth.json` | Override where the local OAuth auth file is discovered.                                                                            |

## Verbose Logging

`--verbose` 플래그를 켜면 요청과 응답이 아래 형식으로 출력됩니다:

```text
[2026-04-24T09:41:22.123Z][R][gpt-5.2] 안녕하세요, 오늘 날씨가 어때요?
[2026-04-24T09:41:23.456Z][A][gpt-5.2] 안녕하세요! 오늘 서울 날씨는 맑고 기온은 22도입니다.
[2026-04-24T09:41:24.000Z][E] messages must be an array
```

JSON 형식이 필요하면:

```bash
CODEX_OPENAI_SERVER_LOG_REQUESTS=1 bun run start
```

## Programmatic API

```ts
import { startOoProxyServer, createOoProxyFetchHandler } from "oo-proxy"

// Node.js HTTP 서버로 시작
const server = await startOoProxyServer({
  port: 40531,
  verbose: true,
  models: ["gpt-5.2", "gpt-5.4"],
})
console.log(`서버 시작됨: ${server.url}`)
await server.close()

// 또는 fetch 핸들러만 생성 (Edge/Cloudflare Workers 등)
const handler = createOoProxyFetchHandler({ verbose: true })
const response = await handler(new Request("http://localhost/v1/models"))
```

## Features

- `/v1/chat/completions` — 스트리밍/비스트리밍
- `/v1/responses` — Codex responses 엔드포인트
- `/v1/models` — 계정 연동 모델 목록 또는 `--models`로 고정
- Tool calls
- Reasoning (`reasoning_effort`)
- `--verbose` 요청/응답 로깅
- 커스텀 `requestLogger` 콜백

## Known Limitations

- Codex 지원 모델만 사용 가능합니다.
- 로그인 플로우는 번들되지 않습니다. `npx @openai/codex login`으로 auth 파일을 생성하세요.
- `/v1/responses` 엔드포인트는 stateless입니다. 전체 대화 히스토리를 매 요청마다 전송해야 합니다.

## Legal

This is an unofficial, community-maintained project and is not affiliated with, endorsed by, or sponsored by OpenAI, Inc.

It uses your local Codex/ChatGPT authentication cache (auth.json, e.g. `~/.codex/auth.json`) and should be treated like password-equivalent credentials.

Use only for personal, local experimentation on trusted machines; do not run as a hosted service, do not share access, and do not pool or redistribute tokens.

You are solely responsible for complying with OpenAI's Terms, policies, and any applicable agreements; misuse may result in rate limits, suspension, or termination.

Provided "as is" with no warranties; you assume all risk for data exposure, costs, and account actions.
