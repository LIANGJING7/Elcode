/**
 * Built-in tool registrations.
 *
 * Import this module to activate all built-in tool metadata.
 */
import { registerTool, getRegisteredTools } from './registry-new'
import type { ToolMeta } from './meta'
import type { ToolCall } from '../../types/ipc'
import {
  ICON_GLOB, ICON_GREP, ICON_READ, ICON_WEBFETCH, ICON_WEBSEARCH,
  ICON_SKILL, ICON_BASH, ICON_EDIT, ICON_WRITE, ICON_TODO,
  ICON_QUESTION, ICON_PATCH, ICON_TASK_RUNNING, ICON_TASK_DONE, ICON_TASK_ERROR
} from './icons'
import { truncate, firstArgString, PATH_KEYS, COMMAND_KEYS } from './summary'

// ============================================
// Inline Tools
// ============================================

const globMeta: ToolMeta = {
  display: 'inline',
  icon: ICON_GLOB,
  pending: 'Finding files...',
  summary: (tool) => {
    const pattern = tool.args.pattern as string ?? ''
    const path = tool.args.path as string ?? ''
    const count = (tool.output?.structured as any)?.count ?? 0
    const pathStr = path ? ` in ${truncate(path, 30)}` : ''
    return `Glob "${truncate(pattern)}"${pathStr} (${count} matches)`
  },
  title: () => '',
  detail: () => ''
}
registerTool('glob', globMeta)

const grepMeta: ToolMeta = {
  display: 'inline',
  icon: ICON_GREP,
  pending: 'Searching content...',
  summary: (tool) => {
    const pattern = tool.args.pattern as string ?? ''
    const path = tool.args.path as string ?? ''
    const matches = (tool.output?.structured as any)?.matches ?? 0
    const pathStr = path ? ` in ${truncate(path, 30)}` : ''
    return `Grep "${truncate(pattern)}"${pathStr} (${matches} matches)`
  },
  title: () => '',
  detail: () => ''
}
registerTool('grep', grepMeta)

const readMeta: ToolMeta = {
  display: 'inline',
  icon: ICON_READ,
  pending: 'Reading file...',
  summary: (tool) => {
    const filePath = firstArgString(tool.args, PATH_KEYS)
    const offset = tool.args.offset as number
    const limit = tool.args.limit as number
    let rangeStr = ''
    if (offset || limit) {
      rangeStr = ` [${offset ?? 1}-${(offset ?? 1) + (limit ?? 2000) - 1}]`
    }
    return `Read ${truncate(filePath)}${rangeStr}`
  },
  title: () => '',
  detail: () => ''
}
registerTool('read', readMeta)

const webfetchMeta: ToolMeta = {
  display: 'inline',
  icon: ICON_WEBFETCH,
  pending: 'Fetching URL...',
  summary: (tool) => {
    const url = tool.args.url as string ?? ''
    return `Webfetch ${truncate(url, 60)}`
  },
  title: () => '',
  detail: () => ''
}
registerTool('webfetch', webfetchMeta)

const websearchMeta: ToolMeta = {
  display: 'inline',
  icon: ICON_WEBSEARCH,
  pending: 'Searching web...',
  summary: (tool) => {
    const query = tool.args.query as string ?? ''
    const numResults = tool.args.numResults as number ?? 5
    return `Websearch "${truncate(query)}" (${numResults} results)`
  },
  title: () => '',
  detail: () => ''
}
registerTool('websearch', websearchMeta)

const skillMeta: ToolMeta = {
  display: 'inline',
  icon: ICON_SKILL,
  pending: 'Loading skill...',
  summary: (tool) => {
    const name = tool.args.name as string ?? ''
    return `Skill "${truncate(name)}"`
  },
  title: () => '',
  detail: () => ''
}
registerTool('skill', skillMeta)

// ============================================
// Block Tools
// ============================================

const bashMeta: ToolMeta = {
  display: 'block',
  icon: ICON_BASH,
  pending: 'Running command...',
  summary: (tool) => {
    const command = firstArgString(tool.args, COMMAND_KEYS)
    const workdir = tool.args.workdir as string ?? ''
    const workdirStr = workdir ? ` in ${truncate(workdir, 30)}` : ''
    return `Bash ${truncate(command)}${workdirStr}`
  },
  title: (tool) => {
    const command = firstArgString(tool.args, COMMAND_KEYS)
    const workdir = tool.args.workdir as string ?? ''
    const workdirStr = workdir ? ` [${truncate(workdir, 40)}]` : ''
    return `$ ${command}${workdirStr}`
  },
  detail: (tool) => {
    const output = tool.output?.result as string ?? ''
    const structured = tool.output?.structured as any
    if (structured?.type === 'bash') {
      const exitCode = structured.exitCode ?? 0
      const duration = structured.duration ?? tool.duration ?? 0
      const header = `Exit code: ${exitCode} | Duration: ${duration}ms\n\n`
      return header + output
    }
    return output
  },
  error: (tool) => {
    const structured = tool.output?.structured as any
    if (structured?.type === 'bash' && structured.exitCode !== 0) {
      return `Exit code ${structured.exitCode}: ${truncate(tool.error ?? '', 100)}`
    }
    return tool.error ?? 'Command failed'
  }
}
registerTool('bash', bashMeta)
registerTool('shell', bashMeta) // Same metadata for 'shell'

const editMeta: ToolMeta = {
  display: 'block',
  icon: ICON_EDIT,
  pending: 'Editing file...',
  summary: (tool) => {
    const filePath = firstArgString(tool.args, PATH_KEYS)
    const replaceAll = tool.args.replaceAll as boolean
    const allStr = replaceAll ? ' (all)' : ''
    return `Edit ${truncate(filePath)}${allStr}`
  },
  title: (tool) => {
    const filePath = firstArgString(tool.args, PATH_KEYS)
    return `← Edit ${truncate(filePath, 60)}`
  },
  detail: (tool) => {
    const structured = tool.output?.structured as any
    if (structured?.type === 'edit' && structured.diff) {
      return truncate(structured.diff, 500)
    }
    const oldString = tool.args.oldString as string ?? ''
    const newString = tool.args.newString as string ?? ''
    return `Old: ${truncate(oldString, 100)}\nNew: ${truncate(newString, 100)}`
  }
}
registerTool('edit', editMeta)

const writeMeta: ToolMeta = {
  display: 'block',
  icon: ICON_WRITE,
  pending: 'Writing file...',
  summary: (tool) => {
    const filePath = firstArgString(tool.args, PATH_KEYS)
    return `Write ${truncate(filePath)}`
  },
  title: (tool) => {
    const filePath = firstArgString(tool.args, PATH_KEYS)
    return `← Write ${truncate(filePath, 60)}`
  },
  detail: (tool) => {
    const content = tool.args.content as string ?? ''
    const lines = content.split('\n').length
    const bytes = content.length
    return `${lines} lines | ${bytes} bytes\n\n${truncate(content, 200)}`
  }
}
registerTool('write', writeMeta)

const todowriteMeta: ToolMeta = {
  display: 'block',
  icon: ICON_TODO,
  pending: 'Updating todos...',
  summary: (tool) => {
    const todos = tool.args.todos as Array<any> ?? []
    return `Todo (${todos.length} items)`
  },
  title: (tool) => {
    const todos = tool.args.todos as Array<any> ?? []
    return `☰ Todo (${todos.length} items)`
  },
  detail: (tool) => {
    const todos = tool.args.todos as Array<any> ?? []
    return todos.map((t, i) => `${i + 1}. ${t.status ?? 'pending'}: ${truncate(t.content ?? '', 50)}`).join('\n')
  }
}
registerTool('todowrite', todowriteMeta)

const questionMeta: ToolMeta = {
  display: 'block',
  icon: ICON_QUESTION,
  pending: 'Waiting for answer...',
  summary: (tool) => {
    const questions = tool.args.questions as Array<any> ?? []
    return `Question (${questions.length} questions)`
  },
  title: (tool) => {
    const questions = tool.args.questions as Array<any> ?? []
    return `? Question (${questions.length} questions)`
  },
  detail: (tool) => {
    const questions = tool.args.questions as Array<any> ?? []
    const answers = tool.output?.result as Array<any> ?? []
    return questions.map((q, i) => {
      const answer = answers[i]?.answer ?? '(pending)'
      return `Q${i + 1}: ${truncate(q.question ?? q.text ?? '', 80)}\nA${i + 1}: ${truncate(answer, 80)}`
    }).join('\n\n')
  }
}
registerTool('question', questionMeta)

const applyPatchMeta: ToolMeta = {
  display: 'block',
  icon: ICON_PATCH,
  pending: 'Applying patch...',
  summary: (tool) => {
    const files = tool.args.files as Array<any> ?? []
    return `Patch (${files.length} files)`
  },
  title: (tool) => {
    const files = tool.args.files as Array<any> ?? []
    return `% Patch (${files.length} files)`
  },
  detail: (tool) => {
    const files = tool.args.files as Array<any> ?? []
    const patches = tool.args.patches as Array<any> ?? []
    return files.map((f, i) => {
      const patch = patches[i] ?? ''
      return `${truncate(f, 60)}:\n${truncate(patch, 150)}`
    }).join('\n\n')
  }
}
registerTool('apply_patch', applyPatchMeta)

// ============================================
// Subagent Tool
// ============================================

const taskMeta: ToolMeta = {
  display: 'subagent',
  icon: ICON_TASK_RUNNING,
  pending: 'Starting subagent...',
  summary: (tool) => {
    const subagentType = tool.args.subagent_type as string ?? 'unknown'
    const description = tool.args.description as string ?? ''
    const background = tool.args.background as boolean
    const bgStr = background ? ' [bg]' : ''
    const structured = tool.output?.structured as any
    
    // Show state indicator
    if (structured?.type === 'task') {
      const state = structured.state ?? tool.status
      const stateIcon = state === 'completed' ? ICON_TASK_DONE : 
                       state === 'error' ? ICON_TASK_ERROR : ICON_TASK_RUNNING
      return `${stateIcon} ${truncate(subagentType, 20)}: ${truncate(description, 40)}${bgStr}`
    }
    
    return `${ICON_TASK_RUNNING} ${truncate(subagentType, 20)}: ${truncate(description, 40)}${bgStr}`
  },
  title: (tool) => {
    const subagentType = tool.args.subagent_type as string ?? 'unknown'
    const description = tool.args.description as string ?? ''
    const structured = tool.output?.structured as any
    
    if (structured?.type === 'task') {
      const state = structured.state ?? tool.status
      const stateIcon = state === 'completed' ? ICON_TASK_DONE : 
                       state === 'error' ? ICON_TASK_ERROR : ICON_TASK_RUNNING
      return `${stateIcon} ${truncate(subagentType, 20)}`
    }
    
    return `${ICON_TASK_RUNNING} ${truncate(subagentType, 20)}`
  },
  detail: (tool) => {
    const description = tool.args.description as string ?? ''
    const structured = tool.output?.structured as any
    const summary = structured?.summary ?? tool.output?.result as string ?? ''
    
    return `Task: ${truncate(description, 200)}\n\n${truncate(summary, 300)}`
  },
  error: (tool) => tool.error ?? 'Subagent failed'
}
registerTool('task', taskMeta)

// ============================================
// Logging
// ============================================

console.log('[tool/builtins] Registered', getRegisteredTools().length, 'built-in tools')