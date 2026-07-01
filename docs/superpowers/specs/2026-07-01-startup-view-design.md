# 桌面端启动视图设计

## 背景

当前桌面端启动时的视图展示逻辑不够清晰：
- 有工作区但没有活动会话时，显示空的 ChatView
- 用户期望：有工作区时应显示"新建会话"页面

## 核心原则

**业务状态决定默认页面，临时 UI 状态只表示用户操作。**

```
业务状态
├── workspace: 是否有工作区
└── currentSessionId: 是否有活动会话
    → 决定默认视图

临时 UI 状态
└── isPendingNewSession: 用户正在创建新会话
    → 覆盖默认视图
```

### 单向数据流

业务状态 → 视图，避免在应用启动时通过修改状态来驱动页面，降低维护成本。

## 视图优先级

```
1. 无工作区          → WelcomeView（选择工作区）
2. 无活动会话        → NewSessionView（新建会话）
3. isPendingNewSession → NewSessionView（用户正在创建）
4. ui.view          → 用户选择的视图
```

## 代码改动

### 1. App.vue effectiveView

修改 `effectiveView` 计算属性：

```typescript
const effectiveView = computed(() => {
  // 业务状态决定默认页面
  if (!hasCurrentWorkspace.value) return 'welcome'
  if (!currentSessionId.value) return 'newSession'
  
  // 临时 UI 状态：用户正在创建新会话
  if (sessionStore.isPendingNewSession) return 'newSession'
  
  // 用户选择的视图
  return ui.view
})
```

### 2. WelcomeView.vue 中文化

| 原文 | 中文 |
|------|------|
| Welcome to OpenCode | 欢迎使用 OpenCode |
| Open a folder to start chatting with your codebase. OpenCode can read, write, and edit files, run commands, and help you build faster. | 打开文件夹开始与你的代码库对话。OpenCode 可以读取、写入和编辑文件，运行命令，帮助你更高效地构建。 |
| Open Folder | 打开文件夹 |
| to open quickly | 快速打开 |

### 3. isPendingNewSession 使用场景

保留现有语义，仅用于用户主动操作：

| 场景 | isPendingNewSession |
|------|---------------------|
| 用户点击"新建会话"按钮 | → `true` |
| 用户发送第一条消息创建会话 | → `false` |
| 用户选择已有会话 | → `false` |
| 删除当前会话 | → `false` |
| 切换工作区 | → `false` |

无需改动 session.ts 中的状态管理逻辑。

## 改动文件清单

| 文件 | 改动类型 |
|------|----------|
| `packages/desktop/src/renderer/App.vue` | 修改 `effectiveView` 逻辑 |
| `packages/desktop/src/renderer/components/WelcomeView.vue` | 文案中文化 |

## 测试场景

1. **首次启动（无工作区）**：显示 WelcomeView
2. **有工作区启动（无活动会话）**：显示 NewSessionView
3. **有工作区启动（有活动会话）**：显示 ChatView
4. **点击"新建会话"按钮**：从 ChatView → NewSessionView
5. **发送第一条消息创建会话**：NewSessionView → ChatView
6. **删除当前会话**：ChatView → NewSessionView