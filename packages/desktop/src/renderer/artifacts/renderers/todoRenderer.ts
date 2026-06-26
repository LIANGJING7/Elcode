import { registerArtifactRenderer, type ArtifactRenderer } from '../artifactRegistry'

/** Todo 产物渲染器: todo_write / todo_update 命中. */
export const todoRenderer: ArtifactRenderer = {
  type: 'todo',
  label: 'Todo',
  applicable: (name) => name === 'todo_write' || name === 'todo_update',
}

registerArtifactRenderer(todoRenderer)