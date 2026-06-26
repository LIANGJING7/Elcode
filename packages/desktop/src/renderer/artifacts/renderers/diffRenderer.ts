import { registerArtifactRenderer, type ArtifactRenderer } from '../artifactRegistry'

/** Diff 产物渲染器: edit_file / write_file 命中. */
export const diffRenderer: ArtifactRenderer = {
  type: 'diff',
  label: 'Diff',
  applicable: (name) => name === 'edit_file' || name === 'write_file',
}

registerArtifactRenderer(diffRenderer)