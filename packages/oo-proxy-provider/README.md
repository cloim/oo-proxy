# oo-proxy-provider

[GitHub](https://github.com/cloim/oo-proxy) | [Legal](#legal)

ChatGPT 계정을 사용하는 Vercel AI SDK 프로바이더.

## Usage

```ts
import { generateText } from "ai"
import { createOoProxy } from "oo-proxy-provider"

const openai = createOoProxy({
  authFilePath: "/path/to/auth.json", // 생략 시 기본 경로에서 탐색
})

const result = await generateText({
  model: openai("gpt-5.4"),
  prompt: "write an essay about dogs",
})

console.log(result.text)
```

## Configuration

`createOoProxy(...)` accepts:

| Config              | Option         | Default                                                                                                                                                 | Description                                                                      |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Upstream base URL   | `baseURL`      | `https://chatgpt.com/backend-api/codex`                                                                                                                 | Override the upstream Codex base URL.                                            |
| Codex API version   | `codexVersion` | Local `codex --version`, then `@openai/codex` latest from npm, then `0.111.0`                                                                           | Override the Codex API client version.                                           |
| OAuth client id     | `clientId`     | `app_EMoamEEZ73f0CkXaXp7hrann`                                                                                                                          | Override the OAuth client id used for refresh.                                   |
| OAuth token URL     | `tokenUrl`     | `https://auth.openai.com/oauth/token`                                                                                                                   | Override the OAuth token URL used for refresh.                                   |
| Auth file path      | `authFilePath` | `$CHATGPT_LOCAL_HOME/auth.json`, `$CODEX_HOME/auth.json`, `~/.chatgpt-local/auth.json`, `~/.codex/auth.json` | Override where the local OAuth auth file is discovered.                          |
| Ensure fresh tokens | `ensureFresh`  | `true`                                                                                                                                                  | Control whether access tokens are refreshed automatically.                       |
| Provider name       | `name`         | `openai`                                                                                                                                                | Override the provider name exposed to Vercel AI SDK internals.                   |

## Features

- Vercel AI SDK 프로바이더 (로컬 프록시 없이 Codex 직접 호출)
- OAuth 토큰 자동 갱신
- 스트리밍 텍스트
- Tool calls
- `gpt-5.4` 등 Responses 모델 지원

## Known Limitations

- 로그인 플로우 미포함 — `npx @openai/codex login`으로 auth 파일을 먼저 생성하세요.
- auth 파일이 실제로 존재하는 환경(로컬)에서만 동작합니다.
- Embedding, Image 모델 미지원.

## Legal

This is an unofficial, community-maintained project and is not affiliated with, endorsed by, or sponsored by OpenAI, Inc.

It uses your local Codex/ChatGPT authentication cache (auth.json, e.g. `~/.codex/auth.json`) and should be treated like password-equivalent credentials.

Use only for personal, local experimentation on trusted machines; do not run as a hosted service, do not share access, and do not pool or redistribute tokens.

You are solely responsible for complying with OpenAI's Terms, policies, and any applicable agreements; misuse may result in rate limits, suspension, or termination.

Provided "as is" with no warranties; you assume all risk for data exposure, costs, and account actions.
