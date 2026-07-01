import { ProviderAuth } from "@/provider/auth"
import { Provider } from "@/provider/provider"

import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"
import { described } from "./metadata"
import { ProviderV2 } from "@/core/provider"

const root = "/provider"

const ProviderAuthErrorName = Schema.Union([
  Schema.Literal("BadRequest"),
  Schema.Literal("ProviderAuthOauthMissing"),
  Schema.Literal("ProviderAuthOauthCodeMissing"),
  Schema.Literal("ProviderAuthOauthCallbackFailed"),
  Schema.Literal("ProviderAuthValidationFailed"),
])
export class ProviderAuthApiError extends Schema.ErrorClass<ProviderAuthApiError>("ProviderAuthError")(
  {
    name: ProviderAuthErrorName,
    data: Schema.Struct({
      providerID: Schema.optional(ProviderV2.ID),
      field: Schema.optional(Schema.String),
      message: Schema.optional(Schema.String),
      kind: Schema.optional(Schema.String),
    }),
  },
  { httpApiStatus: 400 },
) {}

// Payload schemas for provider mutations
export const AddProviderPayload = Schema.Struct({
  name: Schema.String,
  apiKey: Schema.String,
  baseUrl: Schema.String.pipe(Schema.optional),
}).annotate({ identifier: "Provider.AddPayload" })
export type AddProviderPayload = typeof AddProviderPayload.Type

export const UpdateProviderPayload = Schema.Struct({
  apiKey: Schema.String.pipe(Schema.optional),
  baseUrl: Schema.String.pipe(Schema.optional),
  enabled: Schema.Boolean.pipe(Schema.optional),
}).annotate({ identifier: "Provider.UpdatePayload" })
export type UpdateProviderPayload = typeof UpdateProviderPayload.Type

export const ProviderMutationResult = Schema.Struct({
  success: Schema.Boolean,
  provider: Schema.optional(ProviderV2.Info),
  error: Schema.String.pipe(Schema.optional),
}).annotate({ identifier: "Provider.MutationResult" })
export type ProviderMutationResult = typeof ProviderMutationResult.Type

export const ProviderTestResult = Schema.Struct({
  success: Schema.Boolean,
  modelCount: Schema.Number.pipe(Schema.optional),
  error: Schema.String.pipe(Schema.optional),
}).annotate({ identifier: "Provider.TestResult" })
export type ProviderTestResult = typeof ProviderTestResult.Type

export const ProviderRefreshResult = Schema.Struct({
  success: Schema.Boolean,
  models: Schema.Array(Schema.Any).pipe(Schema.optional),
  changed: Schema.Boolean.pipe(Schema.optional),
  error: Schema.String.pipe(Schema.optional),
}).annotate({ identifier: "Provider.RefreshResult" })
export type ProviderRefreshResult = typeof ProviderRefreshResult.Type

export const ProviderApi = HttpApi.make("provider")
  .add(
    HttpApiGroup.make("provider")
      .add(
        HttpApiEndpoint.get("list", root, {
          query: WorkspaceRoutingQuery,
          success: described(Provider.ListResult, "List of providers"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.list",
            summary: "List providers",
            description: "Get a list of all available AI providers, including both available and connected ones.",
          }),
        ),
        HttpApiEndpoint.get("auth", `${root}/auth`, {
          query: WorkspaceRoutingQuery,
          success: described(ProviderAuth.Methods, "Provider auth methods"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.auth",
            summary: "Get provider auth methods",
            description: "Retrieve available authentication methods for all AI providers.",
          }),
        ),
        HttpApiEndpoint.post("authorize", `${root}/:providerID/oauth/authorize`, {
          params: { providerID: ProviderV2.ID },
          query: WorkspaceRoutingQuery,
          payload: ProviderAuth.AuthorizeInput,
          success: described(Schema.UndefinedOr(ProviderAuth.Authorization), "Authorization URL and method"),
          error: ProviderAuthApiError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.oauth.authorize",
            summary: "Start OAuth authorization",
            description: "Start the OAuth authorization flow for a provider.",
          }),
        ),
        HttpApiEndpoint.post("callback", `${root}/:providerID/oauth/callback`, {
          params: { providerID: ProviderV2.ID },
          query: WorkspaceRoutingQuery,
          payload: ProviderAuth.CallbackInput,
          success: described(Schema.Boolean, "OAuth callback processed successfully"),
          error: ProviderAuthApiError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.oauth.callback",
            summary: "Handle OAuth callback",
            description: "Handle the OAuth callback from a provider after user authorization.",
          }),
        ),
        // Provider mutation endpoints
        HttpApiEndpoint.post("add", root, {
          query: WorkspaceRoutingQuery,
          payload: AddProviderPayload,
          success: described(ProviderMutationResult, "Add provider result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.add",
            summary: "Add a custom provider",
            description: "Add a new custom AI provider with API key and optional base URL.",
          }),
        ),
        HttpApiEndpoint.patch("update", `${root}/:providerID`, {
          params: { providerID: ProviderV2.ID },
          query: WorkspaceRoutingQuery,
          payload: UpdateProviderPayload,
          success: described(ProviderMutationResult, "Update provider result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.update",
            summary: "Update a provider",
            description: "Update an existing provider's API key, base URL, or enabled status.",
          }),
        ),
        HttpApiEndpoint.delete("delete", `${root}/:providerID`, {
          params: { providerID: ProviderV2.ID },
          query: WorkspaceRoutingQuery,
          success: described(ProviderMutationResult, "Delete provider result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.delete",
            summary: "Delete a provider",
            description: "Delete a custom provider from the catalog.",
          }),
        ),
        HttpApiEndpoint.post("test", `${root}/:providerID/test`, {
          params: { providerID: ProviderV2.ID },
          query: WorkspaceRoutingQuery,
          success: described(ProviderTestResult, "Test provider result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.test",
            summary: "Test provider connection",
            description: "Test if a provider's API key is valid by listing available models.",
          }),
        ),
        HttpApiEndpoint.post("refreshModels", `${root}/:providerID/refresh-models`, {
          params: { providerID: ProviderV2.ID },
          query: WorkspaceRoutingQuery,
          success: described(ProviderRefreshResult, "Refresh models result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "provider.refreshModels",
            summary: "Refresh provider models",
            description: "Refresh the list of models available for a provider.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "provider",
          description: "Experimental HttpApi provider routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode experimental HttpApi",
      version: "0.0.1",
      description: "Experimental HttpApi surface for selected instance routes.",
    }),
  )
