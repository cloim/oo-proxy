# openai-oauth

OpenAI-compatible local endpoint backed by your ChatGPT account.

## Usage

```bash
npx openai-oauth
```

When startup succeeds, the CLI prints:

```text
OpenAI-compatible endpoint ready at http://127.0.0.1:10531/v1
Use this as your OpenAI base URL. No API key is required.
```

If no auth file is available, it fails early and tells you to run:

```bash
npx @openai/codex login
```

## Configuration

| Config | CLI | Default | Description |
| --- | --- | --- | --- |
| Host binding | `--host` | `127.0.0.1` | Host interface the local proxy binds to. |
| Port | `--port` | `10531` | Port the local proxy binds to. |
| Model allowlist | `--models` | `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.3-codex-spark`, `gpt-5.2`, `gpt-5.1`, `gpt-5.1-codex`, `gpt-5.1-codex-max` | Comma-separated list of model ids exposed by `/v1/models`. |
| Upstream base URL | `--base-url` | `https://chatgpt.com/backend-api/codex` | Override the upstream Codex base URL. |
| OAuth client id | `--oauth-client-id` | `app_EMoamEEZ73f0CkXaXp7hrann` | Override the OAuth client id used for refresh. |
| OAuth token URL | `--oauth-token-url` | `https://auth.openai.com/oauth/token` | Override the OAuth token URL used for refresh. |
| Auth file path | `--oauth-file` | `--oauth-file` path if provided, otherwise `$CHATGPT_LOCAL_HOME/auth.json`, `$CODEX_HOME/auth.json`, `~/.chatgpt-local/auth.json`, `~/.codex/auth.json` | Override where the local OAuth auth file is discovered. |

## Features

What currently works:

- Working Endpoints:
  - `/v1/responses`
  - `/v1/chat/completions`
  - `/v1/models` (with configurable model allowlist)
- Streaming Responses
- Toolcalls
- Reasoning Traces

## Known Limitations

What is intentionally not there yet:

- Only LLMs supported by Codex are available. This lists updates over time and is dependent on your Codex plan.
- Login flow is intentionally not bundled. Simply run `npx @openai/codex login` to create the auth file.
- There is no stateful replay support on the CLI `/v1/responses` endpoint. The proxy is stateless and expects callers to send the full conversation history.

## How it Works

OpenAI's Codex CLI uses a special endpoint at `chatgpt.com/backend-api/codex/responses` to let you use special OpenAI rate limits tied to your ChatGPT account.

By using the same Oauth tokens as Codex, we can effectively use OpenAI's API through Oauth instead of buying API credits.