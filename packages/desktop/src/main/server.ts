import { listen, type Listener } from "../../../../src/server/server"

let listener: Listener | null = null

export async function startBackend(): Promise<{ port: number }> {
  try {
    listener = await listen({
      port: 0,
      hostname: "localhost",
      mdns: false,
    })

    console.log(`Backend server started at ${listener.url}`)

    return { port: listener.port }
  } catch (error) {
    console.error("Failed to start backend:", error)
    throw error
  }
}

export async function stopBackend(): Promise<void> {
  if (listener) {
    await listener.stop()
    listener = null
  }
}