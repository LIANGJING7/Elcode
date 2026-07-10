/**
 * @提及类型定义
 */

export type MentionKind = 'file' | 'agent' | 'resource'

export interface MentionItem {
  kind: MentionKind
  value: string
  display: string
  description?: string
  directory?: boolean
  mime?: string
  url?: string
}

export interface MentionState {
  visible: boolean
  query: string
  atIndex: number
  selectedIndex: number
  items: MentionItem[]
}

/**
 * 解析行范围
 * @example "@src/main.ts#10-20" => { path: "src/main.ts", lineStart: 10, lineEnd: 20 }
 */
export function parseMentionPath(input: string): {
  path: string
  lineStart?: number
  lineEnd?: number
} {
  const match = input.match(/^(.+?)#(\d+)(?:-(\d+))?$/)
  if (!match) return { path: input }
  
  return {
    path: match[1],
    lineStart: parseInt(match[2], 10),
    lineEnd: match[3] ? parseInt(match[3], 10) : undefined
  }
}