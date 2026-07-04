import { ProviderAuth } from "@/provider/auth"
import { Config } from "@/config/config"
import { ModelsDev } from "@/core/models-dev"
import { Provider } from "@/provider/provider"
import { Location } from "@/core/location"
import { LocationServiceMap } from "@/core/location-layer"
import { Catalog } from "@/core/catalog"
import { WorkspaceRouteContext } from "../middleware/workspace-routing"
import { AbsolutePath } from "@/core/schema"

import { mapValues } from "remeda"
import { Effect, Schema } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { ProviderAuthApiError, AddProviderPayload, UpdateProviderPayload, ProviderMutationResult, ProviderTestResult, ProviderRefreshResult } from "../groups/provider"
import { ProviderV2 } from "@/core/provider"
import { ConfigV1 } from "@/core/v1/config/config"

function mapProviderAuthError<A, R>(self: Effect.Effect<A, ProviderAuth.Error, R>) {
  return self.pipe(
    Effect.mapError((error) => {
      if (error instanceof ProviderAuth.OauthMissing) {
        return new ProviderAuthApiError({ name: error._tag, data: { providerID: error.providerID } })
      }
      if (error instanceof ProviderAuth.OauthCodeMissing) {
        return new ProviderAuthApiError({ name: error._tag, data: { providerID: error.providerID } })
      }
      if (error instanceof ProviderAuth.OauthCallbackFailed) {
        return new ProviderAuthApiError({ name: error._tag, data: {} })
      }
      if (error instanceof ProviderAuth.ValidationFailed) {
        return new ProviderAuthApiError({ name: error._tag, data: { field: error.field, message: error.message } })
      }
      return new ProviderAuthApiError({ name: "BadRequest", data: {} })
    }),
  )
}

export const providerHandlers = HttpApiBuilder.group(InstanceHttpApi, "provider", (handlers) =>
  Effect.gen(function* () {
    const cfg = yield* Config.Service
    const provider = yield* Provider.Service
    const svc = yield* ProviderAuth.Service
    const modelsDev = yield* ModelsDev.Service

    const list = Effect.fn("ProviderHttpApi.list")(function* () {
      const config = yield* cfg.get()
      const all = yield* ModelsDev.Service.use((s) => s.get())
      const disabled = new Set(config.disabled_providers ?? [])
      const enabled = config.enabled_providers ? new Set(config.enabled_providers) : undefined
      const filtered: Record<string, (typeof all)[string]> = {}
      for (const [key, value] of Object.entries(all)) {
        if ((enabled ? enabled.has(key) : true) && !disabled.has(key)) filtered[key] = value
      }
      const connected = yield* provider.list()
      const providers = Object.assign(
        mapValues(filtered, (item) => Provider.fromModelsDevProvider(item)),
        connected,
      )
      return {
        all: Object.values(providers).map(Provider.toPublicInfo),
        default: Provider.defaultModelIDs(providers),
        connected: Object.keys(connected),
      }
    })

    const auth = Effect.fn("ProviderHttpApi.auth")(function* () {
      return yield* svc.methods()
    })

    const authorize = Effect.fn("ProviderHttpApi.authorize")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      payload: ProviderAuth.AuthorizeInput
    }) {
      return yield* mapProviderAuthError(
        svc.authorize({
          providerID: ctx.params.providerID,
          method: ctx.payload.method,
          inputs: ctx.payload.inputs,
        }),
      )
    })

    const authorizeRaw = Effect.fn("ProviderHttpApi.authorizeRaw")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      request: HttpServerRequest.HttpServerRequest
    }) {
      const body = yield* Effect.orDie(ctx.request.text)
      const payload = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(ProviderAuth.AuthorizeInput))(body).pipe(
        Effect.mapError(() => new ProviderAuthApiError({ name: "BadRequest", data: {} })),
      )
      // Match legacy route behavior: when authorize() resolves without a
      // result (e.g. no further redirect), serialize as JSON `null` instead
      // of an empty body so clients can `.json()` parse the response.
      const result = yield* authorize({ params: ctx.params, payload })
      return HttpServerResponse.jsonUnsafe(result ?? null)
    })

    const callback = Effect.fn("ProviderHttpApi.callback")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      payload: ProviderAuth.CallbackInput
    }) {
      yield* mapProviderAuthError(
        svc.callback({
          providerID: ctx.params.providerID,
          method: ctx.payload.method,
          code: ctx.payload.code,
        }),
      )
      return true
    })

    // Helper to get location services (including Catalog.Service) for a directory
    const withCatalog = <A, E>(
      effect: Effect.Effect<A, E, Catalog.Service>,
    ): Effect.Effect<A, E, WorkspaceRouteContext | LocationServiceMap> =>
      Effect.gen(function* () {
        const routeCtx = yield* WorkspaceRouteContext
        const locations = yield* LocationServiceMap
        const ref: Location.Ref = {
          directory: AbsolutePath.make(routeCtx.directory),
          workspaceID: routeCtx.workspaceID,
        }
        const locationServices = locations.get(ref)
        return yield* effect.pipe(Effect.provide(locationServices))
      })

    // Add a new custom provider
    const add = Effect.fn("ProviderHttpApi.add")(function* (ctx: {
      payload: AddProviderPayload
    }) {
      return yield* withCatalog(
        Effect.scoped(
          Effect.gen(function* () {
            const catalog = yield* Catalog.Service
            const transform = yield* catalog.transform()
            
            // Generate a provider ID from the name (lowercase, replace spaces with dashes)
            const providerID = ProviderV2.ID.make(
              ctx.payload.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
            )
            
            yield* transform((editor) => {
              editor.provider.update(providerID, (provider) => {
                provider.name = ctx.payload.name
                provider.enabled = { via: "custom", data: {} }
                if (ctx.payload.baseUrl) {
                  provider.api = {
                    type: "aisdk",
                    package: "openai", // Use OpenAI-compatible SDK
                    url: ctx.payload.baseUrl,
                    settings: {},
                  }
                }
                // Store API key in request headers
                provider.request.headers["Authorization"] = `Bearer ${ctx.payload.apiKey}`
              })
            })
            
            const record = catalog.provider.get(providerID)
            const providerInfo = yield* Effect.option(record)
            
            return {
              success: true,
              provider: providerInfo._tag === "Some" ? providerInfo.value : undefined,
            }
          }),
        ),
      ).pipe(
        Effect.tap(() => modelsDev.refresh(true)),
        Effect.catch(() =>
          Effect.succeed({
            success: false,
            error: "Provider operation failed",
          }),
        ),
      )
    })

    // Update an existing provider
    const update = Effect.fn("ProviderHttpApi.update")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      payload: UpdateProviderPayload
    }) {
      return yield* withCatalog(
        Effect.scoped(
          Effect.gen(function* () {
            const catalog = yield* Catalog.Service
            const transform = yield* catalog.transform()
            
            yield* transform((editor) => {
              editor.provider.update(ctx.params.providerID, (provider) => {
                if (ctx.payload.apiKey !== undefined) {
                  provider.request.headers["Authorization"] = `Bearer ${ctx.payload.apiKey}`
                }
                if (ctx.payload.baseUrl !== undefined) {
                  provider.api = {
                    type: "aisdk",
                    package: "openai",
                    url: ctx.payload.baseUrl,
                    settings: {},
                  }
                }
                if (ctx.payload.enabled !== undefined) {
                  provider.enabled = ctx.payload.enabled ? { via: "custom", data: {} } : false
                }
              })
            })
            
            const record = catalog.provider.get(ctx.params.providerID)
            const providerInfo = yield* Effect.option(record)
            
            return {
              success: true,
              provider: providerInfo._tag === "Some" ? providerInfo.value : undefined,
            }
          }),
        ),
      ).pipe(
        Effect.tap(() => modelsDev.refresh(true)),
        Effect.catch(() =>
          Effect.succeed({
            success: false,
            error: "Provider operation failed",
          }),
        ),
      )
    })

    // Delete a provider
    const deleteProvider = Effect.fn("ProviderHttpApi.delete")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
    }) {
      return yield* withCatalog(
        Effect.scoped(
          Effect.gen(function* () {
            const catalog = yield* Catalog.Service
            const transform = yield* catalog.transform()
            
            yield* transform((editor) => {
              editor.provider.remove(ctx.params.providerID)
            })
            
            return { success: true }
          }),
        ),
      ).pipe(
        Effect.tap(() => modelsDev.refresh(true)),
        Effect.catch(() =>
          Effect.succeed({
            success: false,
            error: "Provider operation failed",
          }),
        ),
      )
    })

    // Test a provider connection
    const test = Effect.fn("ProviderHttpApi.test")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
    }) {
      return yield* withCatalog(
        Effect.gen(function* () {
          const catalog = yield* Catalog.Service
          
          const providerInfo = yield* Effect.option(catalog.provider.get(ctx.params.providerID))
          if (providerInfo._tag === "None") {
            return { success: false, error: "Provider not found" }
          }
          
          const models = yield* catalog.model.available()
          const providerModels = models.filter((m) => m.providerID === ctx.params.providerID)
          
          return {
            success: true,
            modelCount: providerModels.length,
          }
        }),
      ).pipe(
        Effect.catch(() =>
          Effect.succeed({
            success: false,
            error: "Provider operation failed",
          }),
        ),
      )
    })

    // Refresh models for a provider
    const refreshModels = Effect.fn("ProviderHttpApi.refreshModels")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
    }) {
      return yield* withCatalog(
        Effect.gen(function* () {
          const catalog = yield* Catalog.Service
          
          const models = yield* catalog.model.available()
          const providerModels = models.filter((m) => m.providerID === ctx.params.providerID)
          
          return {
            success: true,
            models: providerModels,
            changed: false, // We don't track changes for now
          }
        }),
      ).pipe(
        Effect.catch(() =>
          Effect.succeed({
            success: false,
            error: "Provider operation failed",
          }),
        ),
      )
    })

    // Delete a model from provider config (writes to config file)
    const deleteModel = Effect.fn("ProviderHttpApi.deleteModel")(function* (ctx: {
      params: { providerID: ProviderV2.ID, modelID: string }
    }) {
      console.log('[DeleteModel] providerID:', ctx.params.providerID, 'modelID:', ctx.params.modelID)
      
      // Use Config.Service to read and write the global config file
      const cfg = yield* Config.Service
      
      // Get current global config
      const currentConfig = yield* cfg.getGlobal()
      console.log('[DeleteModel] current config keys:', Object.keys(currentConfig))
      console.log('[DeleteModel] current provider keys:', currentConfig.provider ? Object.keys(currentConfig.provider) : 'no provider')
      
      // Check if provider and model exist in config
      if (!currentConfig.provider?.[ctx.params.providerID]) {
        console.log('[DeleteModel] provider not in config')
        return { success: true, notInConfig: true }
      }
      
      const providerConfig = currentConfig.provider[ctx.params.providerID]
      console.log('[DeleteModel] provider config:', JSON.stringify(providerConfig).slice(0, 300))
      
      if (!providerConfig.models?.[ctx.params.modelID]) {
        console.log('[DeleteModel] model not in provider.models')
        return { success: true, notInConfig: true }
      }
      
      console.log('[DeleteModel] model found in config, deleting...')
      console.log('[DeleteModel] models before delete:', Object.keys(providerConfig.models || {}))
      
      // Delete the model from config - set to undefined to trigger JSONC removal
      providerConfig.models[ctx.params.modelID] = undefined
      
      console.log('[DeleteModel] models after setting undefined:', Object.keys(providerConfig.models || {}))
      
      // Write back to config file
      const updatedConfig: ConfigV1.Info = {
        ...currentConfig,
        provider: {
          ...currentConfig.provider,
          [ctx.params.providerID]: providerConfig
        }
      }
      
      console.log('[DeleteModel] updatedConfig provider[' + ctx.params.providerID + '] models:')
      console.log('[DeleteModel]   keys:', Object.keys(updatedConfig.provider[ctx.params.providerID].models || {}))
      console.log('[DeleteModel]   qwen3.5-plus value:', updatedConfig.provider[ctx.params.providerID].models?.["qwen3.5-plus"])
      
      console.log('[DeleteModel] writing updated config...')
      const result = yield* cfg.updateGlobal(updatedConfig)
      console.log('[DeleteModel] config updated, changed:', result.changed)
      
      yield* modelsDev.refresh(true)
      
      return { success: true, notInConfig: false }
    })

    return handlers
      .handle("list", list)
      .handle("auth", auth)
      .handleRaw("authorize", authorizeRaw)
      .handle("callback", callback)
      .handle("add", add)
      .handle("update", update)
      .handle("delete", deleteProvider)
      .handle("test", test)
      .handle("refreshModels", refreshModels)
      .handle("deleteModel", deleteModel)
  }),
)
