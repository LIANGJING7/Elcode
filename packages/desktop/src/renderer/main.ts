import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createIpcMessageRepository } from './repositories/MessageRepository'
import { setMessageRepository } from './stores/message'
import './styles/global.css'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

// Create repo and set globally for message store (stores will read via module import)
const repo = createIpcMessageRepository()
setMessageRepository(repo)

app.mount('#app')