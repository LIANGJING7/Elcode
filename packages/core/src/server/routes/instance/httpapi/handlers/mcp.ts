import { MCP } from "@/mcp"
import { Effect, Schema } from "effect"
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { McpServerNotFoundError } from "../errors"
import { AddPayload, AuthCallbackPayload, StatusMap, UnsupportedOAuthError } from "../groups/mcp"

export const mcpHandlers = HttpApiBuilder.group(InstanceHttpApi, "mcp", (handlers) =>
  Effect.gen(function* () {
    const mcp = yield* MCP.Service

    const status = Effect.fn("McpHttpApi.status")(function* () {
      return yield* mcp.status()
    })

    const config = Effect.fn("McpHttpApi.config")(function* () {
      return yield* mcp.config()
    })

    const add = Effect.fn("McpHttpApi.add")(function* (ctx: { payload: typeof AddPayload.Type }) {
      const result = (yield* mcp.add(ctx.payload.name, ctx.payload.config)).status
      return yield* Schema.decodeUnknownEffect(StatusMap)(
        "status" in result ? { [ctx.payload.name]: result } : result,
      ).pipe(Effect.mapError(() => new HttpApiError.BadRequest({})))
    })

    const authStart = Effect.fn("McpHttpApi.authStart")(function* (ctx: { params: { name: string } }) {
      return yield* Effect.gen(function* () {
        if (!(yield* mcp.supportsOAuth(ctx.params.name))) {
          return yield* new UnsupportedOAuthError({ error: `MCP server ${ctx.params.name} does not support OAuth` })
        }
        return yield* mcp.startAuth(ctx.params.name)
      }).pipe(
        Effect.catchTag("MCP.NotFoundError", (error) =>
          Effect.fail(new McpServerNotFoundError({ name: error.name, message: `MCP server not found: ${error.name}` })),
        ),
      )
    })

    const authCallback = Effect.fn("McpHttpApi.authCallback")(function* (ctx: {
      params: { name: string }
      payload: typeof AuthCallbackPayload.Type
    }) {
      return yield* mcp
        .finishAuth(ctx.params.name, ctx.payload.code)
        .pipe(
          Effect.catchTag("MCP.NotFoundError", (error) =>
            Effect.fail(
              new McpServerNotFoundError({ name: error.name, message: `MCP server not found: ${error.name}` }),
            ),
          ),
        )
    })

    const authAuthenticate = Effect.fn("McpHttpApi.authAuthenticate")(function* (ctx: { params: { name: string } }) {
      return yield* Effect.gen(function* () {
        if (!(yield* mcp.supportsOAuth(ctx.params.name))) {
          return yield* new UnsupportedOAuthError({ error: `MCP server ${ctx.params.name} does not support OAuth` })
        }
        return yield* mcp.authenticate(ctx.params.name)
      }).pipe(
        Effect.catchTag("MCP.NotFoundError", (error) =>
          Effect.fail(new McpServerNotFoundError({ name: error.name, message: `MCP server not found: ${error.name}` })),
        ),
      )
    })

    const authRemove = Effect.fn("McpHttpApi.authRemove")(function* (ctx: { params: { name: string } }) {
      const status = yield* mcp.status()
      if (!(ctx.params.name in status))
        return yield* new McpServerNotFoundError({
          name: ctx.params.name,
          message: `MCP server not found: ${ctx.params.name}`,
        })
      yield* mcp.removeAuth(ctx.params.name)
      return { success: true as const }
    })

    const connect = Effect.fn("McpHttpApi.connect")(function* (ctx: { params: { name: string } }) {
      yield* mcp
        .connect(ctx.params.name)
        .pipe(
          Effect.catchTag("MCP.NotFoundError", (error) =>
            Effect.fail(
              new McpServerNotFoundError({ name: error.name, message: `MCP server not found: ${error.name}` }),
            ),
          ),
        )
      return true
    })

    const disconnect = Effect.fn("McpHttpApi.disconnect")(function* (ctx: { params: { name: string } }) {
      yield* mcp
        .disconnect(ctx.params.name)
        .pipe(
          Effect.catchTag("MCP.NotFoundError", (error) =>
            Effect.fail(
              new McpServerNotFoundError({ name: error.name, message: `MCP server not found: ${error.name}` }),
            ),
          ),
        )
      return true
    })

    // Tools handler - get all tools grouped by server
    const tools = Effect.fn("McpHttpApi.tools")(function* () {
      const allTools = yield* mcp.tools()
      // Group by server: { serverName: [tool1, tool2, ...] }
      const grouped: Record<string, unknown[]> = {}
      for (const [key, tool] of Object.entries(allTools)) {
        const serverName = key.split(':')[0]
        if (!grouped[serverName]) grouped[serverName] = []
        grouped[serverName].push(tool)
      }
      return grouped
    })

    // Prompts handler - get all prompts
    const prompts = Effect.fn("McpHttpApi.prompts")(function* () {
      const allPrompts = yield* mcp.prompts()
      // Group by server
      const grouped: Record<string, unknown[]> = {}
      for (const [key, prompt] of Object.entries(allPrompts)) {
        const serverName = key.split(':')[0]
        if (!grouped[serverName]) grouped[serverName] = []
        grouped[serverName].push(prompt)
      }
      return grouped
    })

    // Resources handler - get all resources
    const resources = Effect.fn("McpHttpApi.resources")(function* () {
      const allResources = yield* mcp.resources()
      // Group by server
      const grouped: Record<string, unknown[]> = {}
      for (const [key, resource] of Object.entries(allResources)) {
        const serverName = key.split(':')[0]
        if (!grouped[serverName]) grouped[serverName] = []
        grouped[serverName].push(resource)
      }
      return grouped
    })

    // Server-specific tools handler
    const serverTools = Effect.fn("McpHttpApi.serverTools")(function* (ctx: { params: { name: string } }) {
      const status = yield* mcp.status()
      if (!(ctx.params.name in status))
        return yield* new McpServerNotFoundError({
          name: ctx.params.name,
          message: `MCP server not found: ${ctx.params.name}`,
        })
      
      const allTools = yield* mcp.tools()
      const serverTools: unknown[] = []
      for (const [key, tool] of Object.entries(allTools)) {
        if (key.startsWith(ctx.params.name + ':')) {
          serverTools.push(tool)
        }
      }
      return serverTools
    })

    return handlers
      .handle("status", status)
      .handle("config", config)
      .handle("add", add)
      .handle("authStart", authStart)
      .handle("authCallback", authCallback)
      .handle("authAuthenticate", authAuthenticate)
      .handle("authRemove", authRemove)
      .handle("connect", connect)
      .handle("disconnect", disconnect)
      .handle("tools", tools)
      .handle("prompts", prompts)
      .handle("resources", resources)
      .handle("serverTools", serverTools)
  }),
)
