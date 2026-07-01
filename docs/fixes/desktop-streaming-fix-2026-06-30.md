# 流式消息显示问题修复

## 问题症状
- 发送消息后看不到模型回复
- 时间线工具调用、thinking 动画没有展示
- 需要重新进入页面才能看到消息

## 根本原因分析

经过深入调试，发现两个关键问题：

### 问题 1: Vue 3 响应式数组更新方式错误

在 reducer 中，数组更新使用了错误的模式：
```typescript
// ❌ 错误：创建新数组替换原数组
state.message.pending = [...state.message.pending, action.delta]
```

Vue 3 对 reactive 对象的数组替换追踪不完整，可能导致依赖该数组的 computed 属性不更新。

### 问题 2: SSE handler 中的竞态条件导致消息丢失

**关键问题：双重 loadConversations 调用**

```
用户发送第一条消息 (pendingNewSession) 的时序：

1. sendMessage() 调用 createSession()
   - HTTP API 返回 sessionId (后端创建会话)
   - currentSessionId = sessionId
   - loadConversations() → conversations 被替换 (包含新会话)
   - createSession 返回

2. sendMessage() 继续执行
   - 创建/更新 currentConversation
   - 添加 userMessage
   - reset() → version 增加
   - prompt() → SSE stream 开始

3. SSE 事件到达：session.created
   - SSE handler 检查 isPendingNewSession = false ❌ (已被 HTTP 设置)
   - 如果为 true，会调用 loadConversations() → 再次替换 conversations
   - **之前的 userMessage 可能丢失**！

4. SSE 事件流继续
   - streaming store 处理事件
   - status = 'streaming' → 'done'
   - watch 触发，添加 assistant 消息

问题：如果 SSE handler 也调用 loadConversations，会覆盖之前添加的 userMessage，
导致 currentConversation.messages 不完整，assistant 消息添加失败。
```

## 修复方案

### 修复 1: Vue 响应式数组更新（reducer.ts, scheduler.ts, store.ts）

```typescript
// ✅ 正确：直接在原数组上 push
state.message.pending.push(action.delta)
state.reasoning.pending.push(action.delta)
toolForProgress.progress.push(...progressItems)

// ✅ 正确：使用 length = 0 清空
state.message.content += pending.join('')
pending.length = 0
```

### 修复 2: 移除 SSE handler 中的 loadConversations（session.ts）

```typescript
// ✅ 正确：不在 SSE handler 中调用 loadConversations
// createSession 已经处理了会话加载，重复调用会导致竞态条件
if (eventType === 'session.created') {
  if (isPendingNewSession.value && eventSessionId) {
    currentSessionId.value = eventSessionId
    isPendingNewSession.value = false
    // ❌ 移除：loadConversations(workspaceStore.currentWorkspace?.path)
  }
  return
}
```

### 修复 3: 确保 messages 数组初始化（session.ts）

```typescript
// ✅ 正确：确保 messages 数组存在
if (!currentConversation.value) {
  // 创建新 conversation
} else {
  // loadConversations 可能返回空的 messages
  if (!currentConversation.value.messages) {
    currentConversation.value.messages = []
  }
  currentConversation.value.messages.push(userMessage)
}
```

## 完整事件流程（修复后）

```
用户发送第一条消息：

1. sendMessage() → createSession()
   - HTTP 创建会话，返回 sessionId
   - currentSessionId = sessionId
   - isPendingNewSession = false
   - loadConversations() 加载会话列表（新会话在列表中）
   - 返回 sessionId

2. sendMessage() 继续
   - currentConversation 存在（loadConversations 加载的）
   - 初始化 messages（如果为空）
   - push userMessage ✓
   - streamingStore.reset() → version = 1
   - prompt() → SSE 开始

3. SSE: session.created 到达
   - SSE handler: isPendingNewSession = false (跳过处理) ✓
   - 不调用 loadConversations ✓

4. SSE: 流式事件到达
   - normalizer: version = 1
   - dispatcher: version 检查通过
   - reducer: 处理事件，更新状态
   - status = 'streaming'

5. SSE: session.next.step.ended 到达
   - reducer: status = 'done'
   - watch 触发
   - currentConversation 存在 ✓
   - push assistant message ✓
   - nextTick 后 reset()

结果：用户立即看到 assistant 消息 ✓
```

## Vue 3 响应式最佳实践

| 操作 | Vue 追踪 | 推荐方式 |
|------|---------|---------|
| 添加元素 | ✅ push() | `array.push(item)` |
| 清空数组 | ✅ length = 0 | `array.length = 0` |
| 替换数组 | ⚠️ 可能不追踪 | 避免使用 `array = newArray` |

## 修改的文件
- `packages/desktop/src/renderer/stores/streaming/reducer.ts`
- `packages/desktop/src/renderer/stores/streaming/scheduler.ts`
- `packages/desktop/src/renderer/stores/streaming/store.ts`
- `packages/desktop/src/renderer/stores/session.ts` (关键修复)

## 验证步骤
1. 启动桌面应用
2. 创建新会话并发送第一条消息
3. 观察：
   - Thinking 动画是否显示
   - 工具调用是否实时展示
   - 文本内容是否流式显示
   - **消息完成后立即显示在历史中**
4. 发送第二条消息，验证持续可用

## 关键要点
- **避免双重处理**：HTTP API 和 SSE handler 不要重复处理同一事件
- **避免竞态条件**：loadConversations 只在必要时调用，避免覆盖本地状态
- **Vue 响应式**：使用 push/length 操作数组，避免创建新数组

## 日期
2026-06-30