# Tool Call UI Redesign

**Date**: 2026-06-30  
**Status**: Draft  
**Author**: vera

## Problem

当前工具调用的展示方式存在以下问题：

1. **视觉噪音过大** - 每个工具调用占据大量垂直空间（带左侧时间线、shimmer 动画、大边框）
2. **信息密度低** - 默认显示工具名和空参数 `{}`，用户需要点击才能看到有意义的信息
3. **布局不紧凑** - Reasoning、Tool Calls、Text 都是独立的大卡片，页面纵向高度浪费严重
4. **不符合主流产品习惯** - ChatGPT、Claude Code、Cursor 等已验证的交互模式未被采用

## Goal

将工具调用展示从「独立大卡片」重构为「紧凑列表行 + 按需展开详情」，参考主流 AI 产品（ChatGPT / Claude Code / Cursor）的交互模式。

## Design Principles

1. **Timeline > Grouping** - 工具调用按时间顺序排列，不按类型分组。AI Agent 的执行是推理过程，用户需要理解「为什么模型这么做」。
2. **Summary > Completeness** - 列表只显示最关键信息（工具名 + 摘要），详情按需展开。
3. **Lightweight > Fancy** - 用轻量动画（呼吸点）代替旋转 spinner，减少视觉干扰。
4. **Progressive Disclosure** - 默认紧凑，点击展开详情。

---

## Architecture

### 整体结构

```
▼ Reasoning
──────────────────────────────────────
The user wants me to inspect the reducer...

▼ Tool Calls (5)                    ← 仅当工具数量 ≥ 8 或折叠时显示标题
──────────────────────────────────────
✓ read    reducer.ts
✓ read    dispatcher.ts
✓ read    selectors.ts
● bash    npm run build           ← 运行中带呼吸动画
✓ glob    **/*.test.ts    3 files ← 灰字摘要

(点击某一行展开详情)

✓ read    reducer.ts
──────────────────────────────────────
Input
packages/desktop/src/store/reducer.ts

Output
export interface StreamingState {
  ...
}

23 ms
```

### 区域折叠逻辑

| 区域 | 默认状态 | 折叠条件 |
|------|----------|----------|
| Reasoning | 展开 | 用户手动折叠，或内容过长时自动折叠 |
| Tool Calls | 展开（无标题） | 工具数量 ≥ 8 时显示标题 "Tool Calls (N)"；用户可手动折叠整个区域 |
| Text | 展开 | 不折叠 |

### 工具行设计

#### 状态图标

| 生命周期 | 图标 | 动画 |
|----------|------|------|
| `preparing` | ○ | 无 |
| `waiting` | ○ | pulse |
| `running` / `streaming` | ● | pulse（呼吸动画） |
| `completed` | ✓ | 无 |
| `failed` | ✗ | 无 |
| `cancelled` | ○ | 删除线 |

#### 列布局

```
[状态图标] [工具名] [摘要]              [可选：灰字详情]
   ✓        read   reducer.ts
   ●        bash   npm run build
   ✓        glob   **/*.test.ts       3 files
```

- **工具名**：等宽字体，固定宽度（约 80px）
- **摘要**：工具最关键信息（文件名、命令、模式等），加粗
- **灰字详情**：可选，用于补充信息（如 "3 files"、"5 matches"）

#### Hover 状态

```
默认：  ✓ read    reducer.ts
Hover： ✓ read    reducer.ts                       >  (背景高亮 + 右侧箭头)
```

---

## Component Changes

### Modified Files

| 文件 | 改动内容 |
|------|----------|
| `StreamingMessage.vue` | 调整整体布局，去掉外边框，使 Reasoning / Tools / Text 更紧凑 |
| `StreamingTools.vue` | 去掉左侧时间线（竖线 + 连接点）；增加可选标题栏 "Tool Calls (N)"；增加折叠整个区域的功能 |
| `ToolCallContainer.vue` | 去掉 shimmer 动画、左侧边框；简化为列表行布局；hover 状态 |
| `ToolCallCompact.vue` | 重新设计：去掉耗时显示；加粗摘要；灰字详情；hover 箭头指示器 |
| `ToolCallDetail.vue` | 简化布局；耗时移到这里；Input/Output 分区更清晰 |
| `StreamingReasoning.vue` | 类似折叠模式（已完成，参考） |

### Unchanged Files

| 文件 | 原因 |
|------|------|
| `types.ts` | 类型定义不需要改动 |
| `store.ts` / `reducer.ts` / `selectors.ts` | 状态管理逻辑不需要改动 |
| `StreamingText.vue` | 文本渲染不需要改动 |

---

## Summary Generator

不同工具的摘要生成逻辑：

| 工具名 | 摘要来源 | 示例 |
|--------|----------|------|
| `read` | `filePath` 或 `path` | `reducer.ts` |
| `write` | `filePath` 或 `path` | `ToolCallCompact.vue` |
| `edit` | `filePath` 或 `path` | `streaming.ts` |
| `bash` / `shell` | `command`（截断） | `npm run build` |
| `grep` | `pattern` | `"StreamingState"` |
| `glob` | `pattern` | `**/*.test.ts` |
| `web_search` | `query` | `StreamingState` |
| `web_fetch` | `url`（域名） | `api.openai.com` |
| `task` | `description`（截断） | `Inspect reducer` |
| `todo_write` | 固定文本 | `Update todo list` |
| `skill` | `skill` 或 `name` | `brainstorming` |

### 灰字详情（可选）

某些工具可以在右侧显示灰色小字：

| 工具名 | 灰字内容 |
|--------|----------|
| `glob` | 结果数量（如 `3 files`） |
| `grep` | 匹配数量（如 `5 matches`） |
| `read` / `write` / `edit` | 文件路径（截断，如 `packages/desktop/src/...`） |

---

## Styling

### 间距

```
Reasoning 区块底部：mb-3
Tool Calls 区域顶部：mt-3
工具行之间：无分隔线，行高 28px
工具行内部：px-2 py-1.5
```

### 颜色

```
状态图标：
  ✓ 成功：text-success (#22c55e)
  ● 运行：text-warning (#eab308) + pulse 动画
  ✗ 失败：text-error (#ef4444)
  ○ 其他：text-text-muted

工具名：text-text-secondary, font-mono
摘要：text-text-primary, font-medium
灰字详情：text-text-muted, text-xs
```

### 动画

```
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(1.1); }
}
```

运行中的工具状态点使用上述呼吸动画，周期 1.2s。

---

## Implementation Order

1. **ToolCallCompact.vue** - 重新设计列表行（核心视觉改动）
2. **ToolCallContainer.vue** - 去掉 shimmer 和左侧边框，适配新行布局
3. **ToolCallDetail.vue** - 简化详情，耗时移到这里
4. **StreamingTools.vue** - 去掉时间线，增加可选标题栏和折叠
5. **StreamingMessage.vue** - 调整整体布局间距
6. **测试** - 更新相关测试用例

---

## Out of Scope

- 工具调用的后端数据格式（不需要改动）
- 流式文本渲染（StreamingText.vue 保持不变）
- Reasoning 区块的重新设计（当前实现已符合要求）
- 工具调用的执行逻辑（状态管理保持不变）

---

## Success Criteria

1. [ ] 工具调用列表行高 ≤ 32px
2. [ ] 运行中的工具显示呼吸动画（非旋转）
3. [ ] 点击工具行可展开详情
4. [ ] 工具数量 ≥ 8 时显示 "Tool Calls (N)" 标题
5. [ ] 工具区域可手动折叠
6. [ ] Hover 时行背景高亮 + 右侧箭头
7. [ ] 所有工具类型的摘要正确显示
8. [ ] 现有测试通过
