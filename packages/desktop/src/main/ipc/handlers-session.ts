import { ipcMain } from 'electron'
import { CHANNELS } from './channels'
import { backend } from '../backend-client'
import type { Conversation, LocationRef, PromptInput, SessionUpdate } from '../../types/ipc'
import { readSessionMeta, mergeSessionMeta, removeSessionMeta } from './session-persistence'

const sessionStreams = new Map<string, () => void>()

/**
 * Map a raw backend session (the HTTP `session` resource) to the renderer's
 * `Conversation` shape. The backend nests timestamps under `time.created` /
 * `time.updated` as epoch milliseconds and exposes no top-level
 * `createdAt`/`updatedAt`, so without this mapping the renderer would feed
 * `undefined` to `new Date(...)` and `date-fns` would throw
 * "Invalid time value". Messages are intentionally left empty here — the
 * renderer loads a session's messages lazily via `session.messages`.
 *
 * Desktop-only metadata (pinned/options/workspace anchors) is overlaid from
 * `sessions.json` because core does not persist those fields.
 */
function toConversation(raw: Record<string, unknown>, meta?: Record<string, unknown>): Conversation {
  const time = (raw.time ?? {}) as { created?: number; updated?: number }
  return {
    id: String(raw.id),
    // core 不存桌面端 rename://"sessions.json 的 meta.title 优先; 未改过则 fallback 到 core 的 raw.title"
    title: String(meta?.title ?? raw.title ?? 'Untitled'),
    messages: [],
    createdAt: new Date(time.created ?? Date.now()),
    updatedAt: new Date(time.updated ?? time.created ?? Date.now()),
    // 仅覆盖桌面端附加字段, 不动后端权威的 id/time
    primaryWorkspaceId: meta?.primaryWorkspaceId as string | undefined,
    workspaceIds: meta?.workspaceIds as string[] | undefined,
    pinned: meta?.pinned as boolean | undefined,
    options: meta?.options as Record<string, unknown> | undefined,
  }
}

export function registerSessionHandlers() {
  ipcMain.handle(CHANNELS.SESSION_CREATE, async (_event, location: LocationRef) => {
    const sessionId = await backend.session.create(location.directory, location.workspaceID)
    return sessionId
  })

  ipcMain.handle(CHANNELS.SESSION_GET, async (_event, sessionID: string, directory?: string) => {
    return await backend.session.get(sessionID, directory)
  })

  ipcMain.handle(CHANNELS.SESSION_LIST, async (_event, input?: { directory?: string; workspaceID?: string }) => {
    const raw = await backend.session.list(input?.directory, input?.workspaceID)
    const meta = await readSessionMeta()
    return raw.map((item) => toConversation(item as Record<string, unknown>, meta[String((item as { id: string }).id)]))
  })

  ipcMain.handle(CHANNELS.SESSION_MESSAGES, async (_event, sessionID: string, limit?: number, directory?: string) => {
    return await backend.session.messages(sessionID, limit)
  })

  ipcMain.handle(CHANNELS.SESSION_PROMPT, async (event, sessionID: string, prompt: PromptInput[], directory?: string) => {
    const promptContent = prompt.map(p => {
      if (p.type === 'text') {
        return { type: 'text', text: p.text! }
      }
      return { type: 'tool_result', toolResult: p.toolResult }
    })

    await backend.session.prompt(sessionID, promptContent, directory)

    if (!sessionStreams.has(sessionID)) {
      const unsubscribe = backend.session.events(sessionID, (evt: unknown) => {
        event.sender.send(CHANNELS.SESSION_STREAM_EVENT, {
          sessionID,
          event: evt
        })
      }, directory)
      sessionStreams.set(sessionID, unsubscribe)
    }

    return true
  })

  ipcMain.handle(CHANNELS.SESSION_INTERRUPT, async (_event, sessionID: string, directory?: string) => {
    await backend.session.interrupt(sessionID, directory)
    return true
  })

  ipcMain.handle(CHANNELS.SESSION_RESUME, async (_event, sessionID: string, directory?: string) => {
    await backend.session.resume(sessionID, directory)
    return true
  })

  ipcMain.handle(CHANNELS.SESSION_DELETE, async (_event, sessionID: string, directory?: string) => {
    const removed = await backend.session.remove(sessionID, directory)
    stopSessionStream(sessionID)
    // 同步清理桌面端附加 metadata, 避免 sessions.json 残留
    await removeSessionMeta(sessionID).catch(() => {})
    return removed
  })

  // 桌面端 metadata 改写(rename/pin/options). core 无该路由, 全部落本地 sessions.json.
  ipcMain.handle(CHANNELS.SESSION_UPDATE, async (_event, sessionID: string, patch: SessionUpdate) => {
    await mergeSessionMeta(sessionID, patch)
    return true
  })
}

export function startSessionStream(sessionID: string, webContents: Electron.WebContents) {
  if (!sessionStreams.has(sessionID)) {
    const unsubscribe = backend.session.events(sessionID, (event: unknown) => {
      webContents.send(CHANNELS.SESSION_STREAM_EVENT, {
        sessionID,
        event
      })
    })
    sessionStreams.set(sessionID, unsubscribe)
  }
}

export function stopSessionStream(sessionID: string) {
  const unsubscribe = sessionStreams.get(sessionID)
  if (unsubscribe) {
    unsubscribe()
    sessionStreams.delete(sessionID)
  }
}