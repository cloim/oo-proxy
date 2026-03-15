# openai-oauth

Free OpenAI API access with your ChatGPT account.

Just run `npx openai-oauth`.

## How to Use

You can currently use `openai-oauth` in two different ways:

### `openai-oauth` CLI

This package lets you create a localhost proxy to `chatgpt.com/backend-api/codex/responses` pre-authenticated with your Oauth tokens.

Use directly:

```
$ npx openai-oauth

Starting server on 127.0.0.1:10000
```


## How it Works

OpenAI's Codex CLI uses a special endpoint at `chatgpt.com/backend-api/codex/responses` to let you use special OpenAI rate limits tied to your ChatGPT account.

By using the same Oauth tokens as Codex, we can effectively use OpenAI's API through Oauth instead of buying API credits.

## Monorepo

- `packages/openai-oauth-core`
  Private shared transport, auth refresh, SSE helpers, and replay state.
- `packages/openai-oauth-provider`
  Public Vercel AI SDK provider that talks directly to Codex using local auth files.
- `packages/openai-oauth`
  Public CLI and localhost proxy package intended for `npx openai-oauth`.