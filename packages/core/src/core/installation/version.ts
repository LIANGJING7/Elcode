declare global {
  const LCODE_VERSION: string
  const LCODE_CHANNEL: string
}

export const InstallationVersion = typeof LCODE_VERSION === "string" ? LCODE_VERSION : "local"
export const InstallationChannel = typeof LCODE_CHANNEL === "string" ? LCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
