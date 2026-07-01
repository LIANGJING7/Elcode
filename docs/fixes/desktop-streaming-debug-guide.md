# 流式消息问题诊断日志分析指南

## 添加的日志位置

已在以下关键位置添加详细的诊断日志：

### 1. SSE 事件接收 (session.ts:266-283)
```
[DEBUG] === SSE EVENT RECEIVED ===
[DEBUG] Event type: session.next.text.started
[DEBUG] Event keys: id,type,properties
[DEBUG] Properties keys: sessionID,assistantMessageID,textID
[DEBUG] Event sessionID: ses_xxx
[DEBUG] Current sessionID: ses_xxx
```

### 2. Session 创建事件 (session.ts:286-299)
```
[DEBUG] === session.created EVENT ===
[DEBUG] isPendingNewSession: true/false
[DEBUG] eventSessionId: ses_xxx
[DEBUG] ✓ Set currentSessionId to: ses_xxx
```

### 3. Session 过滤 (session.ts:311-320)
```
[DEBUG] === SESSION FILTERING ===
[DEBUG] eventSessionId: ses_xxx
[DEBUG] currentSessionId: ses_xxx
[DEBUG] ✓ PASSED session filter
```

### 4. sendMessage 流程 (session.ts:135-210)
```
[DEBUG] === sendMessage CALLED ===
[DEBUG] Content: hello
[DEBUG] isPendingNewSession: true
[DEBUG] === Creating new session ===
[DEBUG] createSession returned: ses_xxx
[DEBUG] === Adding user message ===
[DEBUG] ✓ User message added, total messages: 1
[DEBUG] === Resetting streaming store ===
[DEBUG] Before reset: version=0, status=idle
[DEBUG] After reset: version=1, status=idle
[DEBUG] === Sending prompt ===
[DEBUG] ✓ prompt sent successfully
```

### 5. Watch 和 Assistant 消息添加 (session.ts:398-441)
```
[DEBUG] === WATCH TRIGGERED ===
[DEBUG] Streaming status changed to: done
[DEBUG] currentConversation: exists
[DEBUG] currentConversation.messages: 1
[DEBUG] === ADDING ASSISTANT MESSAGE ===
[DEBUG] Final message content length: 50
[DEBUG] ✓✓✓ ASSISTANT MESSAGE ADDED ✓✓✓
[DEBUG] Total messages now: 2
```

## 关键诊断点

### 检查点 1: SSE 事件是否到达？
查找日志：
```
[DEBUG] === SSE EVENT RECEIVED ===
```

如果**没有看到**：说明 SSE 连接有问题，检查：
- preload 是否正确监听 IPC
- main process 是否正确发送事件
- backend 是否正确生成 SSE 流

### 检查点 2: sessionID 是否正确？
查找日志：
```
[DEBUG] Event sessionID: xxx
[DEBUG] Current sessionID: xxx
```

如果两者**不一致**：
- 检查 session.created 事件处理
- 检查 sendMessage 中的 createSession 时序

### 检查点 3: Session 过滤是否阻止了事件？
查找日志：
```
[DEBUG] ✗ FILTERED OUT - session mismatch
```

如果看到这条日志：
- sessionID 不匹配，事件被丢弃
- 需要检查为什么会话 ID 不一致

### 检查点 4: User message 是否正确添加？
查找日志：
```
[DEBUG] ✓ User message added, total messages: 1
```

如果消息数**为 0 或负数**：
- currentConversation 可能被覆盖
- loadConversations 竞态条件

### 检查点 5: Watch 是否触发？
查找日志：
```
[DEBUG] === WATCH TRIGGERED ===
[DEBUG] Streaming status changed to: done
```

如果**没有看到**：
- streaming store 的 status 没变为 'done'
- 或 Vue watch 没正确监听

### 检查点 6: Assistant 消息是否添加？
查找日志：
```
[DEBUG] ✓✓✓ ASSISTANT MESSAGE ADDED ✓✓✓
或
[DEBUG] ✗✗✗ SKIPPED adding message ✗✗✗
```

如果看到 SKIPPED：
- 检查 exists 和 hasContent 的值
- 可能是重复添加或内容为空

## 常见问题模式

### 问题 1: 没有任何 SSE 事件日志
**原因**: SSE 连接未建立
**解决**: 检查 main process 和 preload 的 IPC 连接

### 问题 2: Session mismatch
```
[DEBUG] ✗ FILTERED OUT - session mismatch
[DEBUG] Event sessionID: ses_A
[DEBUG] Current sessionID: ses_B
```
**原因**: 会话 ID 不一致
**解决**: 检查 session.created 和 sendMessage 的时序

### 问题 3: Watch 不触发
```
[DEBUG] === sendMessage CALLED ===
... (有 SSE 事件日志)
... (但缺少 WATCH TRIGGERED 日志)
```
**原因**: streaming store status 没变为 'done'
**解决**: 检查 step.ended 事件是否到达

### 问题 4: currentConversation 为 null
```
[DEBUG] === WATCH TRIGGERED ===
[DEBUG] ✗ status=done but no currentConversation
```
**原因**: 会话对象丢失
**解决**: 检查 conversations 数组是否被覆盖

### 问题 5: Assistant message SKIPPED
```
[DEBUG] ✗✗✗ SKIPPED adding message ✗✗✗
[DEBUG] Reason: exists=true, hasContent=true
```
**原因**: 消息已存在（重复添加）
**解决**: 正常情况，但如果 UI 不显示，检查 Vue 渲染

## 测试步骤

1. **启动应用**并打开开发者工具（F12）
2. **创建新会话**并发送消息
3. **查看 Console**，找到所有 `[DEBUG]` 日志
4. **按时间顺序**分析日志，找出哪个检查点失败
5. **复制日志片段**并反馈，我会帮助分析

## 日志搜索技巧

Chrome DevTools Console 中搜索：
- 输入 `DEBUG` 查看所有诊断日志
- 输入 `✓` 查看成功的步骤
- 输入 `✗` 查看失败的步骤
- 输入 `ASSISTANT MESSAGE` 查看最终消息添加

## 日期
2026-06-30