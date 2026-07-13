import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createIpcMessageRepository } from './repositories/MessageRepository'
import { setMessageRepository } from './stores/message'
import './styles/global.css'

// Apply default dark theme immediately to prevent flash
document.documentElement.setAttribute('data-theme', 'dark')

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

const repo = createIpcMessageRepository()
setMessageRepository(repo)

app.mount('#app')