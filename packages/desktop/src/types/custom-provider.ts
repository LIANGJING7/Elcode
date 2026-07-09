/**
 * Custom Provider Configuration
 */
export type ProviderType = 
  | 'openai-compatible'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'

export interface CustomProviderConfig {
  providerId: string
  displayName?: string
  providerType: ProviderType
  baseUrl: string
  authType: 'apiKey' | 'envVar'
  authValue: string
  headers?: Record<string, string>
}

/**
 * Provider Type to npm package mapping
 * Hidden from users - they select Provider Type, we map internally
 */
export const PROVIDER_TYPE_TO_NPM: Record<ProviderType, string> = {
  'openai-compatible': '@ai-sdk/openai-compatible',
  'openai': '@ai-sdk/openai',
  'anthropic': '@ai-sdk/anthropic',
  'google': '@ai-sdk/google',
  'openrouter': '@ai-sdk/openai-compatible'
}

/**
 * Provider Type display labels for dropdown
 */
export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  'openai-compatible': 'OpenAI Compatible (Recommended)',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'openrouter': 'OpenRouter'
}

/**
 * Generate Display Name from Provider ID
 * 'deepseek-custom' → 'Deepseek Custom'
 */
export function generateDisplayNameFromId(id: string): string {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Validate Provider ID format
 * Must: lowercase letters/numbers/hyphens/underscores, start with letter/number
 */
export function validateProviderId(id: string): { valid: boolean; error?: string } {
  if (!id || id.trim() === '') {
    return { valid: false, error: 'Provider ID is required' }
  }
  
  const pattern = /^[a-z0-9][a-z0-9\-_]*$/
  if (!pattern.test(id)) {
    return { valid: false, error: 'Must start with letter/number, use lowercase letters, numbers, hyphens, underscores' }
  }
  
  return { valid: true }
}

/**
 * Validate Base URL format
 * Must start with http:// or https://
 */
export function validateBaseUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'Base URL is required' }
  }
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'Base URL must start with http:// or https://' }
  }
  
  return { valid: true }
}