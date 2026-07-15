# Elcode

基于 AI 的智能编程助手，通过自然语言对话帮助你编写、理解和修改代码。

## 功能特性

### AI 智能编程
- **代码生成**：通过自然语言描述生成代码
- **代码理解**：询问代码库相关问题，获取准确解答
- **代码修改**：在 AI 辅助下编辑和重构代码
- **Bug 修复**：识别并修复代码问题

### 开发工具
- **文件操作**：读取、写入、搜索和导航项目文件
- **代码搜索**：基于 Grep 和 Glob 的模式匹配文件搜索
- **Shell 执行**：安全执行终端命令
- **Git 集成**：版本控制操作和分支管理

### 大模型支持
支持多个 AI 提供商：
- OpenAI（GPT-4、GPT-4o 等）
- Anthropic（Claude 系列）
- Google（Gemini）
- Azure OpenAI
- Amazon Bedrock
- OpenRouter
- Groq、Cohere、Mistral、xAI 等

### 会话管理
- **会话持久化**：保存并恢复对话
- **会话分支**：从当前会话创建分支以探索不同方案
- **会话历史**：查看和继续历史会话

### MCP 协议支持
- 通过 MCP 服务器扩展能力
- 连接外部工具和数据源
- 自定义工具集成

## 项目结构

```
Elcode/
├── packages/
│   ├── core/           # 核心引擎（CLI + API）
│   └── desktop/        # Electron 桌面应用
└── package.json        # Monorepo 配置
```

### 包说明

#### @model-agent/core
核心引擎，提供：
- REST API 服务器
- **AI Agent 编排系统**：
  - 通过 Task 工具调度子代理，每个子代理拥有独立的会话上下文
  - 子代理类型包括：`general`（通用任务）、`explore`（代码库探索）、`build`（构建执行）等
  - 权限继承机制：子会话从父会话继承权限，并可根据代理类型限制工具访问
  - 支持前台阻塞执行和后台异步执行两种模式
  - 后台任务完成时自动向父会话注入结果通知
- 工具执行引擎
- 多提供商 LLM 集成

#### @model-agent/desktop
基于 Electron 的桌面应用，包含：
- Vue 3 + Pinia + Tailwind CSS 前端
- Monaco 代码编辑器集成
- 实时聊天界面
- 会话管理界面
- MCP 服务器配置

## 安装

```bash
bun install
```

## 开发

### 核心包
```bash
cd packages/core
bun dev
```

### 桌面应用
```bash
cd packages/desktop
bun dev
```

## 构建

```bash
# 构建所有包
bun run build

# 构建桌面应用（指定平台）
cd packages/desktop
bun run build:win    # Windows
bun run build:mac    # macOS
bun run build:linux  # Linux
```

## 许可证

MIT