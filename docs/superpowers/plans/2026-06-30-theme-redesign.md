# 桌面端主题重新设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将桌面端主题从纯黑白更新为 Notion 风格的暖棕灰配色，提升视觉层次感和温暖舒适度。

**Architecture:** 直接更新 CSS 变量定义，保持现有主题切换机制不变，仅替换颜色值。

**Tech Stack:** Tailwind CSS v4、CSS 变量、Vue 3 (Pinia store)

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/desktop/src/renderer/styles/global.css` | Modify | 更新深色/浅色主题的所有 CSS 变量 |
| `packages/desktop/src/renderer/stores/theme.ts` | Modify | 更新标题栏颜色以匹配新主题 |

---

### Task 1: 更新深色主题 CSS 变量

**Files:**
- Modify: `packages/desktop/src/renderer/styles/global.css:3-81`（@theme 块）

- [ ] **Step 1: 更新背景层级变量**

替换 `@theme` 块中的背景颜色变量（第 5-10 行）：

```css
  --color-bg: #191919;
  --color-bg-elevated: #202020;
  --color-bg-surface: #262626;
  --color-bg-hover: #303030;
  --color-bg-active: #3a3a3a;
```

- [ ] **Step 2: 更新文字颜色变量**

替换文字颜色变量（第 12-14 行）：

```css
  --color-text: #e8e4dc;
  --color-text-secondary: #a8a4a0;
  --color-text-muted: #6b6b6b;
```

- [ ] **Step 3: 更新边框颜色变量**

替换边框颜色变量（第 16-17 行）：

```css
  --color-border: #2a2a2a;
  --color-border-light: #3a3a3a;
```

- [ ] **Step 4: 更新强调色变量**

替换强调色变量（第 19-22 行）：

```css
  --color-accent: #d4d0c8;
  --color-accent-hover: #e8e4dc;
  --color-accent-muted: rgba(212, 208, 200, 0.08);
  --color-accent-glow: rgba(212, 208, 200, 0.1);
```

- [ ] **Step 5: 更新状态色变量**

替换状态色变量（第 24-28 行）：

```css
  --color-success: #4ade80;
  --color-success-muted: rgba(74, 222, 128, 0.1);
  --color-warning: #fbbf24;
  --color-warning-muted: rgba(251, 191, 36, 0.1);
  --color-error: #f87171;
  --color-error-muted: rgba(248, 113, 113, 0.1);
```

- [ ] **Step 6: 更新代码块背景变量**

替换代码块背景变量（第 30 行）：

```css
  --color-code-bg: #1e1e1e;
```

- [ ] **Step 7: 更新阴影变量**

替换阴影变量（第 54-57 行）：

```css
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.25);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px var(--color-accent-glow);
```

- [ ] **Step 8: 更新 shadcn-vue 组件变量**

替换 shadcn-vue 变量（第 59-81 行），保留 `--accent` 和 `--accent-muted` 别名：

```css
  /* shadcn-vue color variables (dark theme) */
  --color-background: #191919;
  --color-foreground: #e8e4dc;
  --color-card: #202020;
  --color-card-foreground: #e8e4dc;
  --color-popover: #202020;
  --color-popover-foreground: #e8e4dc;
  --color-primary: #d4d0c8;
  --color-primary-foreground: #191919;
  --color-secondary: #262626;
  --color-secondary-foreground: #e8e4dc;
  --color-muted: #262626;
  --color-muted-foreground: #a8a4a0;
  --color-accent-foreground: #191919;
  --color-destructive: #5c1a1a;
  --color-destructive-foreground: #fdfcfa;
  --color-input: #303030;
  --color-ring: #d4d0c8;

  /* Backward-compatible aliases */
  --accent: var(--color-accent);
  --accent-muted: var(--color-accent-muted);
```

---

### Task 2: 更新浅色主题 CSS 变量

**Files:**
- Modify: `packages/desktop/src/renderer/styles/global.css:88-145`（[data-theme="light"] 块）

- [ ] **Step 1: 更新背景层级变量**

替换 `[data-theme="light"]` 块中的背景颜色变量（第 89-93 行）：

```css
  --color-bg: #fdfcfa;
  --color-bg-elevated: #f8f7f5;
  --color-bg-surface: #f2f1ef;
  --color-bg-hover: #e8e6e3;
  --color-bg-active: #ddd9d4;
```

- [ ] **Step 2: 更新文字颜色变量**

替换文字颜色变量（第 95-97 行）：

```css
  --color-text: #37352f;
  --color-text-secondary: #6b6b6b;
  --color-text-muted: #9b9a97;
```

- [ ] **Step 3: 更新边框颜色变量**

替换边框颜色变量（第 99-100 行）：

```css
  --color-border: #e8e6e3;
  --color-border-light: #ddd9d4;
```

- [ ] **Step 4: 更新强调色变量**

替换强调色变量（第 102-105 行）：

```css
  --color-accent: #37352f;
  --color-accent-hover: #54524d;
  --color-accent-muted: rgba(55, 53, 47, 0.06);
  --color-accent-glow: rgba(55, 53, 47, 0.06);
```

- [ ] **Step 5: 更新状态色变量**

替换状态色变量（第 107-112 行）：

```css
  --color-success: #22c55e;
  --color-success-muted: rgba(34, 197, 94, 0.08);
  --color-warning: #f59e0b;
  --color-warning-muted: rgba(245, 158, 11, 0.08);
  --color-error: #ef4444;
  --color-error-muted: rgba(239, 68, 68, 0.08);
```

- [ ] **Step 6: 更新代码块背景变量**

替换代码块背景变量（第 114 行）：

```css
  --color-code-bg: #f5f4f2;
```

- [ ] **Step 7: 更新 shadcn-vue 组件变量**

替换 shadcn-vue 变量（第 116-133 行）：

```css
  /* shadcn-vue color variables for light theme */
  --color-background: #fdfcfa;
  --color-foreground: #37352f;
  --color-card: #f8f7f5;
  --color-card-foreground: #37352f;
  --color-popover: #f8f7f5;
  --color-popover-foreground: #37352f;
  --color-primary: #37352f;
  --color-primary-foreground: #fdfcfa;
  --color-secondary: #f2f1ef;
  --color-secondary-foreground: #37352f;
  --color-muted: #f2f1ef;
  --color-muted-foreground: #9b9a97;
  --color-accent-foreground: #fdfcfa;
  --color-destructive: #c9342d;
  --color-destructive-foreground: #fdfcfa;
  --color-input: #e8e6e3;
  --color-ring: #37352f;
```

- [ ] **Step 8: 更新阴影变量**

替换阴影变量（第 139-142 行）：

```css
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.1);
```

---

### Task 3: 更新标题栏颜色

**Files:**
- Modify: `packages/desktop/src/renderer/stores/theme.ts:40-52`（updateTitleBarOverlay 函数）

- [ ] **Step 1: 更新浅色主题标题栏颜色**

替换 `updateTitleBarOverlay` 函数中的浅色主题颜色（第 41-44 行）：

```typescript
    if (theme === 'light') {
      window.desktop.window.setTitleBarOverlay({
        color: '#f8f7f5',
        symbolColor: '#37352f'
      })
```

- [ ] **Step 2: 更新深色主题标题栏颜色**

替换深色主题颜色（第 45-48 行）：

```typescript
    } else {
      window.desktop.window.setTitleBarOverlay({
        color: '#191919',
        symbolColor: '#a8a4a0'
      })
```

---

### Task 4: 验证并提交

**Files:**
- None (verification and commit)

- [ ] **Step 1: 启动桌面应用验证**

运行桌面应用开发服务器：

```bash
cd packages/desktop && bun run dev
```

手动验证：
1. 应用以深色主题启动，检查背景层级是否可区分
2. 切换到浅色主题，检查配色是否正确应用
3. 检查标题栏颜色是否与应用主题一致
4. 检查按钮、输入框、下拉菜单等组件颜色是否正确

- [ ] **Step 2: 提交更改**

```bash
git add packages/desktop/src/renderer/styles/global.css packages/desktop/src/renderer/stores/theme.ts
git commit -m "style: update theme colors to Notion warm brown-gray palette"
```

---

## 验收标准

- [ ] 深色主题背景层级可区分（bg → elevated → surface → hover → active）
- [ ] 浅色主题背景层级可区分
- [ ] 文字在所有背景下可读性良好
- [ ] 状态色（成功/警告/错误）与暖灰基调和谐
- [ ] 标题栏颜色与应用主题一致
- [ ] 所有 shadcn-vue 组件颜色正确应用