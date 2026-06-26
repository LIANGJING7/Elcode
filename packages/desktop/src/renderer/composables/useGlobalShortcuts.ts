import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '../stores/ui'

// 跨平台修饰键: Ctrl(Win/Linux) 与 Cmd(Mac) 都视为同一修饰键,
// 这样在桌面 Electron 应用里双侧键均能触发同一快捷键, 单测也无需 mock 平台。
const mod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey

export function useGlobalShortcuts() {
  const ui = useUiStore()

  const onKey = (e: KeyboardEvent) => {
    // Ctrl/Cmd+B — 切侧栏
    if (mod(e) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      ui.toggleSidebar()
      return
    }
    // 其他快捷键(Esc 中断、Ctrl+N 新会话)留给具体场景所在的组件/store 注册,
    // 因它们依赖的 store(如 messageStore/sessionStore)在阶段 1 尚未落地或尚未持有相关状态
  }

  onMounted(() => document.addEventListener('keydown', onKey))
  onUnmounted(() => document.removeEventListener('keydown', onKey))
}