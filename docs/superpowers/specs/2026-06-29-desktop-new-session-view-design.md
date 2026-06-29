# Desktop 新建会话欢迎界面设计

## 概述

改造桌面端新建会话时的用户体验，从当前直接显示底部输入框改为居中卡片式欢迎界面，同时优化选择器样式并实现模型选择持久化。

## 需求背景

当前新建会话时直接显示底部固定的输入框（Composer），用户体验不够友好。参考用户提供的设计图，需要一个居中的欢迎界面，包含：
- 品牌标识（LCODE）
- 居中的卡片式输入区域
- 工作区选择器
- Build 模式和模型选择器（无边框样式）
- 模型选择持久化

## 设计方案

### 方案选择

采用方案 A：创建独立的 `NewSessionView.vue` 组件。

**优点：**
- 新建会话和已有会话逻辑完全分离
- 不影响现有 ChatView/Composer 功能
- 易于维护和扩展

### 视图状态流转

```
无工作区 → WelcomeView（打开文件夹引导）
有工作区 + 新建会话（isPendingNewSession） → NewSessionView（居中输入卡片）
有工作区 + 已有会话 → ChatView（Timeline + 底部 Composer）
```

## 组件设计

### NewSessionView.vue

**布局结构：**

```
┌─────────────────────────────────────────┐
│                                         │
│              LCODE                      │
│           （大号淡色文字）              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  📁 agent-repo ∨                  │  │  ← 工作区选择器
│  │                                   │  │
│  │  [文本输入区域 - 居中 placeholder]│  │
│  │                                   │  │
│  │  [+] [Build∨] [glm-5∨] [发送→]    │  │  ← 底部工具栏（无边框）
│  └───────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**组件职责：**
1. 显示 LCODE 品牌标识（淡色大号文字，居中）
2. 居中的卡片式输入框
3. 工作区选择器（卡片顶部）
4. Build 模式选择器（无边框）
5. 模型选择器（无边框）
6. 发送按钮
7. 发送消息后调用 sessionStore.sendMessage，自动切换到 ChatView

**样式规范：**
- 外层容器：`flex-1 flex items-center justify-center bg-bg`
- 卡片容器：`bg-bg-elevated rounded-2xl shadow-lg p-4 max-w-2xl w-full mx-6`
- LCODE 标识：`text-4xl font-bold text-text-muted/30 mb-8 text-center`
- 输入区域：复用 ComposerInput 组件逻辑
- 工作区选择器：复用现有工作区数据，下拉选择样式

### 样式变更

#### SessionOptions.vue - Build 模式选择器

移除边框样式：

```vue
<!-- 当前 -->
<SelectTrigger class="h-7 px-2.5 text-xs border border-border rounded-lg bg-bg-elevated hover:bg-bg-hover">

<!-- 改为 -->
<SelectTrigger class="h-7 px-2.5 text-xs rounded-lg bg-bg-elevated hover:bg-bg-hover">
```

#### ModelSelector.vue - 模型选择器

移除边框样式：

```vue
<!-- 当前 -->
<button class="h-7 px-2.5 border border-border rounded-lg bg-bg-elevated hover:bg-bg-hover">

<!-- 改为 -->
<button class="h-7 px-2.5 rounded-lg bg-bg-elevated hover:bg-bg-hover">
```

### 模型选择持久化

**存储机制：**
- 使用 `window.desktop.config.set/get` API
- 配置键名：`selectedModel`
- 存储时机：用户选择模型时立即保存

**models.ts store 修改：**

```typescript
// 新增状态
const selectedModel = ref<string>('')

// 加载模型时恢复已选模型
async function loadModels(directory?: string) {
  // ... 现有逻辑
  
  // 恢复持久化的模型选择
  const saved = await window.desktop.config.get('selectedModel')
  if (saved && modelOptions.value.some(o => o.value === saved)) {
    selectedModel.value = saved
  }
}

// 新增方法：选择并保存模型
async function setSelectedModel(modelId: string) {
  selectedModel.value = modelId
  await window.desktop.config.set('selectedModel', modelId)
}
```

**SessionOptions.vue 绑定：**
- 初始化时从 `modelsStore.selectedModel` 获取默认值
- 用户选择时调用 `modelsStore.setSelectedModel` 保存

## 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `packages/desktop/src/renderer/components/NewSessionView.vue` | 新建 | 居中欢迎输入界面组件 |
| `packages/desktop/src/renderer/App.vue` | 修改 | 添加 NewSessionView 条件渲染 |
| `packages/desktop/src/renderer/components/composer/SessionOptions.vue` | 修改 | 移除边框 + 绑定持久化模型 |
| `packages/desktop/src/renderer/components/composer/ModelSelector.vue` | 修改 | 移除边框 |
| `packages/desktop/src/renderer/stores/models.ts` | 修改 | 添加 selectedModel 状态和持久化逻辑 |

## 实现要点

1. **状态判断**：App.vue 中 `effectiveView` 增加 `'newSession'` 判断条件
2. **组件复用**：NewSessionView 可复用 ComposerInput、SessionOptions 等子组件
3. **发送流程**：发送第一条消息后，`isPendingNewSession` 变为 false，视图自动切换到 ChatView
4. **样式一致性**：确保无边框选择器在 light/dark 主题下都表现良好
5. **持久化兼容**：已选模型不在当前模型列表中时，重置为空

## 测试要点

1. 新建会话时显示居中 NewSessionView
2. 发送消息后自动切换到 ChatView
3. Build 模式和模型选择器无边框显示正常
4. 模型选择后重启应用，模型保持选中状态
5. Light/Dark 主题下样式正确
6. 工作区选择器功能正常