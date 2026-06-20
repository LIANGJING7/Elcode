# OpenCode Desktop App Design Spec

## 概述

为 OpenCode 项目构建 Electron 桌面端应用，复用现有后端功能，通过 WebSocket 进行通信，UI 参考 OpenAI Codex 桌面客户端风格。

## 目标用户

- OpenCode CLI 用户，希望获得图形化界面体验
- 需要 AI Agent 辅助开发工作的开发者
- 希望在桌面环境中管理多个 session 和文件的开发者

## 功能范围

### 核心功能（复用现有后端）

1. **聊天对话**
   - 创建、切换、清除 session
   - 发送消息、接收流式响应
   - 消息历史记录

2. **文件操作**
   - 文件读取、写入
   - 文件搜索
   - 文件树浏览

3. **模型配置**
   - Provider 选择
   - Model 选择

### 不包含的功能（留空后续开发）

- 系统托盘、原生菜单
- 离线缓存、消息队列
- 多窗口、多工作区
- 其他 Codex 桌面端可能的高级功能

## 架构设计

### 方案选择

**方案A：Electron + WebSocket 直连**

Electron 主进程启动现有后端 server，渲染进程通过 WebSocket 直接连接后端 API。

### 系统架构

```
┌─────────────────────────────────────────────────┐
│           Electron Desktop App                   │
├─────────────────────────────────────────────────┤
│  Main Process                                    │
│  ├─ 启动现有后端 server.ts                        │
│  ├─ 管理窗口生命周期                              │
│  └─ 提供 native 集成（托盘、菜单）                │
├─────────────────────────────────────────────────┤
│  Renderer Process (Codex 风格 UI)               │
│  ├─ 聊天界面（消息列表、输入框）                  │
│  ├─ Session 管理（新建、清除、历史）              │
│  ├─ 文件操作面板                                 │
│  └─ WebSocket 连接现有后端 API                   │
└─────────────────────────────────────────────────┘
          ↕ WebSocket
┌─────────────────────────────────────────────────┐
│  现有后端 (src/server/server.ts)                │
│  ├─ Session routes (session.ts)                 │
│  ├─ Message routes (message handlers)           │
│  ├─ File routes (file.ts)                       │
│  ├─ WebSocket transport                         │
│  └─ Provider/Model config                       │
└─────────────────────────────────────────────────┘
```

## 项目结构

新增目录 `packages/desktop/`：

```
packages/desktop/
├─ src/
│  ├─ main/               # Electron 主进程
│  │  ├─ index.ts        # 启动后端 server + 窗口管理
│  │  ├─ server.ts       # 后端 server 启动封装
│  │  └─ tray.ts         # 系统托盘（可选，暂不实现）
│  ├─ renderer/          # 渲染进程（UI）
│  │  ├─ index.html      # 入口 HTML
│  │  ├─ App.tsx         # 主应用组件
│  │  ├─ components/     # UI 组件
│  │  │  ├─ ChatView.tsx
│  │  │  ├─ MessageList.tsx
│  │  │  ├─ InputBox.tsx
│  │  │  ├─ Sidebar.tsx
│  │  │  └─ FilePanel.tsx
│  │  ├─ hooks/          # WebSocket 连接、状态管理
│  │  │  ├─ useWebSocket.ts
│  │  │  ├─ useSession.ts
│  │  │  └─ useMessages.ts
│  │  ├─ api/            # WebSocket API 封装
│  │  │  ├─ client.ts    # WebSocket 客户端
│  │  │  └─ protocol.ts  # 消息协议（映射现有 API）
│  │  └─ styles/         # CSS/Tailwind
│  ├─ preload/           # preload script（暴露必要 API）
│  │  └─ index.ts
├─ electron-builder.yml  # 打包配置
├─ package.json
└─ tsconfig.json
```

## WebSocket 消息协议

### 请求格式

```typescript
interface WSRequest {
  type: 'request'
  id: string          // 请求唯一标识（UUID）
  route: string       // 路由路径，如 'session/create', 'message/send'
  payload: any        // 请求参数
}
```

### 响应格式

```typescript
interface WSResponse {
  type: 'response'
  id: string          // 对应请求 id
  success: boolean
  data?: any          // 成功时返回数据
  error?: string      // 失败时错误信息
}
```

### 流式响应（消息流）

```typescript
interface WSStreamEvent {
  type: 'stream'
  sessionId: string
  event: 'message' | 'partial' | 'complete' | 'error'
  data: {
    content?: string      // 消息内容（partial 为增量）
    messageId?: string
    role?: 'user' | 'assistant'
  }
}
```

### 主要路由映射

| UI 操作 | WebSocket 路由 | 对应后端 handler |
|---------|---------------|-----------------|
| 创建会话 | `session/create` | `handlers/session.ts` |
| 发送消息 | `message/send` | `handlers/message.ts` |
| 获取历史 | `session/history` | `handlers/session.ts` |
| 清除会话 | `session/clear` | `handlers/session.ts` |
| 读文件 | `file/read` | `handlers/file.ts` |
| 写文件 | `file/write` | `handlers/file.ts` |
| 搜索文件 | `file/search` | `handlers/file.ts` |

## UI 设计（Codex 风格）

### 界面布局

```
┌──────────────────────────────────────────────────┐
│  [≡]  OpenCode Desktop        [Model: ▼]  [●]   │ ← 标题栏
├──────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────┐  │
│  │ Sidebar  │  │     Chat Area               │  │
│  │          │  │                             │  │
│  │ Sessions │  │  ┌───────────────────────┐  │  │
│  │ ──────── │  │  │ [User] Hello...       │  │  │
│  │ • Chat 1 │  │  │ [AI]   I'll help...   │  │  │
│  │ • Chat 2 │  │  │ [AI]   <partial>...   │  │  │
│  │          │  │  └───────────────────────┘  │  │
│  │ Files    │  │                             │  │
│  │ ──────── │  │  ┌───────────────────────┐  │  │
│  │ 📁 src/  │  │  │ [Input Box]           │  │  │
│  │ 📄 a.ts  │  │  │ Type message here...  │  │  │
│  │ 📄 b.ts  │  │  │             [Send] ↵  │  │  │
│  │          │  │  └───────────────────────┘  │  │
│  └──────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 核心组件

**ChatView.tsx**
- 主聊天区域
- 消息列表（支持流式显示 partial 消息）
- 输入框（支持 Enter 发送、Shift+Enter 换行）

**Sidebar.tsx**
- 左侧边栏（可折叠）
- Session 列表（切换、新建、删除）
- 文件树（显示当前工作区文件）

**InputBox.tsx**
- 消息输入组件
- 支持文件拖放上传（映射到 file/write）
- 发送按钮 + Enter 快捷键

**MessageList.tsx**
- 消息渲染（用户/助手消息区分样式）
- Markdown 渲染（代码块高亮）
- 流式消息实时更新

### 技术栈

- Electron（桌面框架）
- React 18 + TypeScript（UI）
- Tailwind CSS（样式）
- react-markdown + remark-gfm（Markdown 渲染）
- @shikijs/core（代码高亮，项目已有依赖）

## 技术实现要点

### 主进程启动后端

```typescript
// packages/desktop/src/main/server.ts
import { listen } from '@/server/server'

export async function startBackend() {
  const listener = await listen({
    port: 0, // 自动分配端口
    hostname: 'localhost'
  })
  return listener
}
```

### WebSocket 客户端连接

```typescript
// packages/desktop/src/renderer/api/client.ts
export class WebSocketClient {
  private ws: WebSocket | null = null
  
  async connect(url: string) {
    this.ws = new WebSocket(url)
    // 监听消息、错误、关闭事件
  }
  
  send(request: WSRequest) {
    this.ws?.send(JSON.stringify(request))
  }
  
  onMessage(callback: (response: WSResponse | WSStreamEvent) => void) {
    this.ws?.addEventListener('message', (event) => {
      callback(JSON.parse(event.data))
    })
  }
}
```

### 消息流处理

渲染进程监听 WebSocket 流式事件，实时更新消息列表：

```typescript
// packages/desktop/src/renderer/hooks/useMessages.ts
export function useMessages(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [partialContent, setPartialContent] = useState('')
  
  // 监听 stream 事件，累积 partial content
  // complete 时将完整消息加入 messages 列表
  
  return { messages, partialContent }
}
```

## 错误处理

- WebSocket 连接断开时显示错误提示，提供重连按钮
- 后端启动失败时显示错误信息，退出应用
- API 调用失败时显示错误消息，不阻塞用户操作

## 测试策略

- WebSocket 客户端单元测试（连接、发送、接收）
- React 组件测试（渲染、交互）
- 集成测试（完整流程：启动后端 → 连接 → 发送消息 → 接收响应）

## 后续扩展

- 系统托盘图标（显示连接状态）
- 多窗口支持（不同工作区）
- 离线消息缓存
- 本地配置管理（保存用户偏好）