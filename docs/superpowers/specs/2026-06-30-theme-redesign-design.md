# 桌面端主题重新设计

## 背景

现有桌面端主题（dark/light）使用纯黑白色调，缺乏视觉层次感和温暖感。用户反馈希望优化为「温暖舒适」风格，类似 Notion、Craft 的纸质质感。

## 设计目标

1. **视觉层次感** — 背景层级更明显，卡片/面板/弹窗区分度更好
2. **色彩和谐度** — 暖灰色调统一整体风格
3. **可读性与对比度** — 文字清晰，代码块舒适
4. **整体精致度** — 边框、阴影、过渡动画细腻

## 设计方向

- **风格**：温暖舒适，类似 Notion、Craft
- **色调**：暖棕灰底色，柔和过渡
- **强调色**：保持中性，使用暖灰而非彩色
- **质感**：纸质质感，细腻柔和

---

## 配色方案 A：Notion 暖棕灰

### 深色主题 (Dark)

```
背景层级（从深到浅）：
  --bg:           #191919  → 暖黑底
  --bg-elevated:  #202020  → 卡片层
  --bg-surface:   #262626  → 面板层
  --bg-hover:     #303030  → 悬停态
  --bg-active:    #3a3a3a  → 激活态

文字：
  --text:          #e8e4dc  → 暖白
  --text-secondary:#a8a4a0  → 次级文字
  --text-muted:    #6b6b6b  → 淡化文字

边框：
  --border:        #2a2a2a
  --border-light:  #3a3a3a

强调色：
  --accent:        #d4d0c8  → 暖灰白
  --accent-hover:  #e8e4dc
  --accent-glow:   rgba(212, 208, 200, 0.1)

状态色：
  --success:          #4ade80
  --success-muted:    rgba(74, 222, 128, 0.1)
  --warning:          #fbbf24
  --warning-muted:    rgba(251, 191, 36, 0.1)
  --error:            #f87171
  --error-muted:      rgba(248, 113, 113, 0.1)

代码块：
  --code-bg:       #1e1e1e

阴影：
  --shadow-sm:     0 1px 3px rgba(0, 0, 0, 0.2)
  --shadow-md:     0 4px 12px rgba(0, 0, 0, 0.25)
  --shadow-lg:     0 8px 24px rgba(0, 0, 0, 0.3)

shadcn-vue 组件变量：
  --background:       #191919
  --foreground:       #e8e4dc
  --card:            #202020
  --card-foreground: #e8e4dc
  --popover:         #202020
  --popover-foreground: #e8e4dc
  --primary:         #d4d0c8
  --primary-foreground: #191919
  --secondary:       #262626
  --secondary-foreground: #e8e4dc
  --muted:           #262626
  --muted-foreground: #a8a4a0
  --accent-foreground: #191919
  --destructive:     #5c1a1a
  --destructive-foreground: #fdfcfa
  --input:           #303030
  --ring:            #d4d0c8
```

### 浅色主题 (Light)

```
背景层级（从浅到深）：
  --bg:           #fdfcfa  → 象牙白
  --bg-elevated:  #f8f7f5  → 卡片层
  --bg-surface:   #f2f1ef  → 面板层
  --bg-hover:     #e8e6e3  → 悬停态
  --bg-active:    #ddd9d4  → 激活态

文字：
  --text:          #37352f  → Notion 经典深棕
  --text-secondary:#6b6b6b
  --text-muted:    #9b9a97

边框：
  --border:        #e8e6e3
  --border-light:  #ddd9d4

强调色：
  --accent:        #37352f
  --accent-hover:  #54524d
  --accent-glow:   rgba(55, 53, 47, 0.06)

状态色：
  --success:          #22c55e
  --success-muted:    rgba(34, 197, 94, 0.08)
  --warning:          #f59e0b
  --warning-muted:    rgba(245, 158, 11, 0.08)
  --error:            #ef4444
  --error-muted:      rgba(239, 68, 68, 0.08)

代码块：
  --code-bg:       #f5f4f2

阴影：
  --shadow-sm:     0 1px 3px rgba(0, 0, 0, 0.05)
  --shadow-md:     0 4px 12px rgba(0, 0, 0, 0.08)
  --shadow-lg:     0 8px 24px rgba(0, 0, 0, 0.1)

shadcn-vue 组件变量：
  --background:       #fdfcfa
  --foreground:       #37352f
  --card:            #f8f7f5
  --card-foreground: #37352f
  --popover:         #f8f7f5
  --popover-foreground: #37352f
  --primary:         #37352f
  --primary-foreground: #fdfcfa
  --secondary:       #f2f1ef
  --secondary-foreground: #37352f
  --muted:           #f2f1ef
  --muted-foreground: #9b9a97
  --accent-foreground: #fdfcfa
  --destructive:     #c9342d
  --destructive-foreground: #fdfcfa
  --input:           #e8e6e3
  --ring:            #37352f
```

---

## 实现要点

### 文件修改

1. **`packages/desktop/src/renderer/styles/global.css`**
   - 更新 `@theme` 块中的深色主题变量
   - 更新 `[data-theme="light"]` 选择器中的浅色主题变量

2. **`packages/desktop/src/renderer/stores/theme.ts`**
   - 更新 `updateTitleBarOverlay` 函数中的标题栏颜色以匹配新主题

### 标题栏颜色

深色主题：
- 背景色：`#191919`
- 图标色：`#a8a4a0`

浅色主题：
- 背景色：`#f8f7f5`
- 图标色：`#37352f`

### 过渡动画

保持现有过渡时长，确保主题切换平滑：
- `--transition-duration-fast: 120ms`
- `--transition-duration-normal: 200ms`
- `--transition-duration-slow: 300ms`

---

## 验收标准

1. 所有背景层级视觉上可区分
2. 文字在所有背景下可读性良好（对比度 ≥ 4.5:1）
3. 状态色与暖灰基调和谐
4. 浅色/深色主题切换流畅无闪烁
5. 标题栏颜色与应用主题一致