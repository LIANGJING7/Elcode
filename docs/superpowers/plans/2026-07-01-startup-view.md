# 桌面端启动视图实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 桌面端启动时根据业务状态显示正确的默认视图，并中文化 WelcomeView

**Architecture:** 采用单向数据流原则，业务状态（workspace、currentSessionId）决定默认视图，临时 UI 状态（isPendingNewSession）仅表示用户操作

**Tech Stack:** Vue 3, Pinia, TypeScript, Electron

---

## 文件结构

| 文件 | 改动类型 | 责任 |
|------|----------|------|
| `packages/desktop/src/renderer/App.vue:167-172` | 修改 | 视图优先级逻辑 |
| `packages/desktop/src/renderer/components/WelcomeView.vue` | 修改 | 文案中文化 |

---

### Task 1: 修改 App.vue 视图优先级逻辑

**Files:**
- Modify: `packages/desktop/src/renderer/App.vue:167-172`

- [ ] **Step 1: 修改 effectiveView 计算属性**

修改 `effectiveView` 计算属性，按业务状态优先决定默认视图：

```typescript
// view 由两件事驱动: ui.view 与 workspace 是否存在。
const effectiveView = computed<'welcome' | 'newSession' | 'chat' | 'skills' | 'mcp' | 'settings'>(() => {
  // 业务状态决定默认页面
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (!currentSessionId.value) return 'newSession'
  
  // 临时 UI 状态：用户正在创建新会话
  if (sessionStore.isPendingNewSession) return 'newSession'
  
  // 用户选择的视图
  return ui.view
})
```

替换原有的逻辑（第 167-172 行）。

- [ ] **Step 2: 启动应用验证视图逻辑**

运行桌面端开发服务器：

```bash
cd packages/desktop && bun run dev
```

验证场景：
1. 首次启动（无工作区）→ 应显示 WelcomeView
2. 有工作区启动（无活动会话）→ 应显示 NewSessionView
3. 选择已有会话 → 应显示 ChatView

- [ ] **Step 3: 提交改动**

```bash
git add packages/desktop/src/renderer/App.vue
git commit -m "feat: use business state to determine default view on startup"
```

---

### Task 2: WelcomeView 文案中文化

**Files:**
- Modify: `packages/desktop/src/renderer/components/WelcomeView.vue`

- [ ] **Step 1: 修改标题和描述文案**

修改第 14-17 行的文案：

```vue
<h2 class="text-lg font-semibold text-foreground mb-2">欢迎使用 OpenCode</h2>
<p class="text-sm text-muted-foreground mb-6 leading-relaxed">
  打开文件夹开始与你的代码库对话。OpenCode 可以读取、写入和编辑文件，运行命令，帮助你更高效地构建。
</p>
```

- [ ] **Step 2: 修改按钮文案**

修改第 19-21 行的按钮文案：

```vue
<Button size="lg" class="gap-2" @click="$emit('openFolder')">
  <ArrowDownToLine class="w-4 h-4" />
  <span>打开文件夹</span>
</Button>
```

- [ ] **Step 3: 修改快捷键提示文案**

修改第 23-27 行的快捷键提示：

```vue
<p class="text-xs text-muted-foreground mt-4">
  <kbd class="bg-card px-1.5 py-0.5 rounded font-mono">Ctrl</kbd>
  +
  <kbd class="bg-card px-1.5 py-0.5 rounded font-mono">O</kbd>
  快速打开
</p>
```

- [ ] **Step 4: 启动应用验证中文化**

```bash
cd packages/desktop && bun run dev
```

验证 WelcomeView 所有文案已改为中文。

- [ ] **Step 5: 提交改动**

```bash
git add packages/desktop/src/renderer/components/WelcomeView.vue
git commit -m "feat: localize WelcomeView to Chinese"
```

---

## 完整验证

完成所有任务后，运行完整验证：

```bash
cd packages/desktop && bun run dev
```

验证所有测试场景：
1. **首次启动（无工作区）**：显示 WelcomeView（中文）
2. **有工作区启动（无活动会话）**：显示 NewSessionView
3. **有工作区启动（有活动会话）**：显示 ChatView
4. **点击"新建会话"按钮**：从 ChatView → NewSessionView
5. **发送第一条消息创建会话**：NewSessionView → ChatView
6. **删除当前会话**：ChatView → NewSessionView