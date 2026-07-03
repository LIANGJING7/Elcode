/**
 * Language detection utilities.
 *
 * Maps file extensions and special filenames to Shiki language identifiers.
 * Used by code-renderer.ts to determine syntax highlighting language.
 */

/** Map of file extensions to Shiki language names */
const LANG_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',

  // Vue/Svelte
  vue: 'vue',
  svelte: 'svelte',

  // Data formats
  json: 'json',
  jsonc: 'jsonc',
  json5: 'json5',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',

  // Markup
  html: 'html',
  htm: 'html',
  xml: 'xml',
  svg: 'xml',
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'mdx',

  // Styles
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',

  // Programming languages
  py: 'python',
  python: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  lua: 'lua',
  perl: 'perl',
  pl: 'perl',
  pm: 'perl',
  r: 'r',
  scala: 'scala',
  clj: 'clojure',
  cljs: 'clojure',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hrl: 'erlang',
  hs: 'haskell',
  lhaskell: 'literate-haskell',
  lhs: 'literate-haskell',
  ml: 'ocaml',
  mli: 'ocaml',
  f90: 'fortran',
  f95: 'fortran',
  f03: 'fortran',
  f: 'fortran',
  for: 'fortran',

  // Shell/Scripts
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  ksh: 'bash',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'bat',
  cmd: 'bat',

  // Config/Build
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  cmake: 'cmake',
  gradle: 'gradle',
  ant: 'ant',
  mvn: 'xml',
  pom: 'xml',

  // Database
  sql: 'sql',
  mysql: 'sql',
  pgsql: 'sql',
  plsql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  prisma: 'prisma',

  // Other
  diff: 'diff',
  patch: 'diff',
  log: 'log',
  env: 'dotenv',
  gitignore: 'gitignore',
  dockerignore: 'dockerignore',
  editorconfig: 'editorconfig',
  prettierignore: 'gitignore',
  eslintignore: 'gitignore',
}

/** Special filenames that map to specific languages */
const SPECIAL_FILES: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  gnumakefile: 'makefile',
  cmakecache: 'cmake',
  '.env': 'dotenv',
  '.env.local': 'dotenv',
  '.env.development': 'dotenv',
  '.env.production': 'dotenv',
  '.env.test': 'dotenv',
  '.gitignore': 'gitignore',
  '.dockerignore': 'dockerignore',
  '.editorconfig': 'editorconfig',
  '.prettierrc': 'json',
  '.eslintrc': 'json',
  '.eslintrc.json': 'json',
  '.eslintrc.js': 'javascript',
  '.eslintrc.yaml': 'yaml',
  '.eslintrc.yml': 'yaml',
  'tsconfig.json': 'jsonc',
  'jsconfig.json': 'jsonc',
  'package.json': 'json',
  'package-lock.json': 'json',
  'yarn.lock': 'yaml',
  'pnpm-lock.yaml': 'yaml',
  'composer.json': 'json',
  'composer.lock': 'json',
  'cargo.toml': 'toml',
  'cargo.lock': 'toml',
  'go.mod': 'go',
  'go.sum': 'go',
  'pyproject.toml': 'toml',
  'poetry.lock': 'toml',
  'requirements.txt': 'pip-requirements',
  'pipfile': 'toml',
  'pipfile.lock': 'json',
  '.npmrc': 'ini',
  '.yarnrc': 'ini',
  'jest.config.js': 'javascript',
  'jest.config.ts': 'typescript',
  'vite.config.js': 'javascript',
  'vite.config.ts': 'typescript',
  'webpack.config.js': 'javascript',
  'webpack.config.ts': 'typescript',
  'rollup.config.js': 'javascript',
  'rollup.config.ts': 'typescript',
  'nuxt.config.js': 'javascript',
  'nuxt.config.ts': 'typescript',
  'next.config.js': 'javascript',
  'next.config.mjs': 'javascript',
  'vue.config.js': 'javascript',
  'svelte.config.js': 'javascript',
  'tailwind.config.js': 'javascript',
  'tailwind.config.ts': 'typescript',
  'postcss.config.js': 'javascript',
  'babel.config.js': 'javascript',
  '.babelrc': 'json',
  '.babelrc.json': 'json',
  '.babelrc.js': 'javascript',
  'renovate.json': 'json',
  'renovate.json5': 'json5',
  '.releaserc': 'json',
  '.releaserc.json': 'json',
  '.releaserc.yaml': 'yaml',
  '.releaserc.yml': 'yaml',
}

/**
 * Detect Shiki language from file path.
 *
 * @param filePath - The file path (e.g., 'src/components/App.vue')
 * @returns The Shiki language name, or undefined if not detected
 */
export function detectLanguage(filePath: string): string | undefined {
  const fileName = filePath.split('/').pop()?.split('\\').pop() ?? ''
  const lowerFileName = fileName.toLowerCase()

  // Check special filenames first
  if (SPECIAL_FILES[lowerFileName]) {
    return SPECIAL_FILES[lowerFileName]
  }

  // Check extension
  const parts = fileName.split('.')
  if (parts.length < 2) return undefined

  // Handle double extensions like .d.ts, .spec.ts, .test.ts
  const ext = parts.pop()?.toLowerCase()
  if (!ext) return undefined

  // Direct extension lookup
  if (LANG_MAP[ext]) {
    return LANG_MAP[ext]
  }

  // Try compound extension (e.g., .d.ts -> typescript)
  const compoundExt = parts.length > 1 ? `${parts.pop()?.toLowerCase()}.${ext}` : undefined
  if (compoundExt && LANG_MAP[compoundExt]) {
    return LANG_MAP[compoundExt]
  }

  return undefined
}

/**
 * Normalize language name to Shiki identifier.
 *
 * @param lang - The language name (could be alias or shorthand)
 * @returns The normalized Shiki language name
 */
export function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase()
  return LANG_MAP[lower] ?? SPECIAL_FILES[lower] ?? lower
}

/**
 * Check if a language is supported by Shiki.
 *
 * @param lang - The language name to check
 * @returns true if the language is in our known map
 */
export function isLanguageKnown(lang: string): boolean {
  const lower = lang.toLowerCase()
  return LANG_MAP[lower] !== undefined || SPECIAL_FILES[lower] !== undefined
}