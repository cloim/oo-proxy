import { access } from "node:fs/promises"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import {
	createCodexOAuthClient,
	resolveAuthFileCandidates,
} from "../../oo-proxy-core/src/index.js"
import packageJson from "../package.json" with { type: "json" }
import { installCliWarningLogger, toStartupMessage } from "./cli-logging.js"
import { startOoProxyServer } from "./index.js"
import { resolveOoProxyModels } from "./models.js"
import { DEFAULT_PORT } from "./shared.js"

export type CliArgs = {
	host?: string
	port?: number
	models?: string[]
	codexVersion?: string
	baseURL?: string
	clientId?: string
	tokenUrl?: string
	authFilePath?: string
	verbose?: boolean
}

const parseModels = (value: string | undefined): string[] | undefined => {
	if (typeof value !== "string") {
		return undefined
	}

	const models = value
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)

	return models.length > 0 ? models : undefined
}

const helpLines = [
	"Free OpenAI API access with your ChatGPT account.",
	"",
	"Usage",
	"  npx oo-proxy@latest [options]",
	"",
	"Options",
	"  --host <host>              Host interface to bind to.",
	"  --port <port>              Port to listen on. Default: 40531",
	"  --models <ids>             Comma-separated model ids to expose from /v1/models.",
	"  --codex-version <version>  Codex API version to use for model discovery.",
	"  --base-url <url>           Override the upstream Codex base URL.",
	"  --oauth-client-id <id>     Override the OAuth client id used for refresh.",
	"  --oauth-token-url <url>    Override the OAuth token URL used for refresh.",
	"  --oauth-file <path>        Path to the local auth.json file.",
	"",
	"Flags",
	"  --verbose                  Log each request and response to stdout.",
	"  --help                     Show help",
	`  --version                  Show version (${packageJson.version})`,
	"",
	"Notes",
	"  If no auth file is found, run: npx @openai/codex login",
	"  By default, available models are discovered from your account.",
]

const createCliParser = (argv: string[]) =>
	yargs(argv)
		.scriptName("oo-proxy")
		.strict()
		.help(false)
		.version(false)
		.option("host", {
			type: "string",
			describe: "Host interface to bind to.",
		})
		.option("port", {
			type: "number",
			describe: "Port to listen on. Default: 40531",
		})
		.option("models", {
			type: "string",
			describe: "Comma-separated model ids to expose from /v1/models.",
			coerce: parseModels,
		})
		.option("codex-version", {
			type: "string",
			describe: "Codex API version to use for model discovery.",
		})
		.option("base-url", {
			type: "string",
			describe: "Override the upstream Codex base URL.",
		})
		.option("oauth-client-id", {
			type: "string",
			describe: "Override the OAuth client id used for refresh.",
		})
		.option("oauth-token-url", {
			type: "string",
			describe: "Override the OAuth token URL used for refresh.",
		})
		.option("oauth-file", {
			type: "string",
			describe: "Path to the local auth.json file.",
		})
		.option("verbose", {
			type: "boolean",
			describe: "Log each request and response to stdout.",
		})

const isHelpFlag = (argv: string[]): boolean =>
	argv.includes("--help") || argv.includes("-h")

const isVersionFlag = (argv: string[]): boolean => argv.includes("--version")

export const toHelpMessage = (): string => helpLines.join("\n")

export const parseCliArgs = (argv: string[]): CliArgs => {
	const parsed = createCliParser(argv).parseSync()

	return {
		host: parsed.host,
		port: parsed.port,
		models: parsed.models,
		codexVersion: parsed.codexVersion,
		baseURL: parsed.baseUrl,
		clientId: parsed.oauthClientId,
		tokenUrl: parsed.oauthTokenUrl,
		authFilePath: parsed.oauthFile,
		verbose: parsed.verbose,
	}
}

export const toServerOptions = (args: CliArgs) => ({
	host: args.host,
	port: args.port ?? DEFAULT_PORT,
	models: args.models,
	codexVersion: args.codexVersion,
	baseURL: args.baseURL,
	clientId: args.clientId,
	tokenUrl: args.tokenUrl,
	authFilePath: args.authFilePath,
	verbose: args.verbose,
})

const findExistingAuthFile = async (
	authFilePath: string | undefined,
): Promise<string | undefined> => {
	for (const candidate of resolveAuthFileCandidates(authFilePath)) {
		try {
			await access(candidate)
			return candidate
		} catch {}
	}

	return undefined
}

const toMissingAuthFileMessage = (authFilePath: string | undefined): string => {
	if (authFilePath) {
		return [
			`No auth file was found at ${authFilePath}.`,
			"Run `npx @openai/codex login` and try again.",
		].join("\n")
	}

	const candidates = resolveAuthFileCandidates(undefined)
	return [
		`No auth file was found in the default search paths: ${candidates.join(", ")}.`,
		"Run `npx @openai/codex login` and try again.",
	].join("\n")
}

export const runCli = async (argv: string[] = hideBin(process.argv)) => {
	if (isHelpFlag(argv)) {
		console.log(toHelpMessage())
		return
	}

	if (isVersionFlag(argv)) {
		console.log(packageJson.version)
		return
	}

	installCliWarningLogger()

	const args = parseCliArgs(argv)
	const options = toServerOptions(args)
	const existingAuthFile = await findExistingAuthFile(options.authFilePath)
	if (!existingAuthFile) {
		throw new Error(toMissingAuthFileMessage(options.authFilePath))
	}

	const client = createCodexOAuthClient({
		...options,
		responsesState: false,
	})
	const availableModels = await resolveOoProxyModels(
		client,
		options.models,
		{
			codexVersion: options.codexVersion,
			onWarning: (message) => {
				console.error(message)
			},
		},
	)
	const server = await startOoProxyServer(options)

	console.log(
		toStartupMessage(
			`http://${server.host}:${server.port}/v1`,
			availableModels,
			{
				useColor: process.stdout.isTTY,
			},
		),
	)

	const shutdown = async () => {
		await server.close()
		process.exit(0)
	}

	process.on("SIGINT", () => {
		void shutdown()
	})

	process.on("SIGTERM", () => {
		void shutdown()
	})
}

export { createCliParser, toMissingAuthFileMessage }
