<script setup lang="ts">
import { computed } from 'vue'
import { usePermissionStore, type PermissionRequest } from '@/stores/permission'

const permissionStore = usePermissionStore()

const current = computed(() => {
  const requests = permissionStore.currentRequests
  return requests.length > 0 ? requests[0] : null
})

const permissionType = computed(() => current.value?.permission ?? '')

const title = computed(() => {
  if (!current.value) return ''
  const perm = current.value.permission
  const meta = current.value.metadata
  
  if (perm === 'edit') {
    return '编辑文件'
  }
  
  if (perm === 'read') {
    return '读取文件'
  }
  
  if (perm === 'external_directory') {
    return '访问项目目录之外的文件'
  }
  
  if (perm === 'bash') {
    return '运行命令'
  }
  
  if (perm === 'task') {
    return '运行子代理任务'
  }
  
  if (perm === 'webfetch') {
    return '获取 URL'
  }
  
  return perm
})

const description = computed(() => {
  if (!current.value) return ''
  const perm = current.value.permission
  
  if (perm === 'external_directory') {
    return '访问项目目录之外的文件'
  }
  
  return ''
})

const patterns = computed(() => {
  return current.value?.patterns ?? []
})

async function handleAllowOnce() {
  if (!current.value) return
  await permissionStore.reply(current.value.id, 'once')
}

async function handleAllowAlways() {
  if (!current.value) return
  await permissionStore.reply(current.value.id, 'always')
}

async function handleReject() {
  if (!current.value) return
  await permissionStore.reply(current.value.id, 'reject')
}
</script>

<template>
  <div v-if="current" class="permission-prompt">
    <div class="permission-header">
      <span class="permission-icon">⚠</span>
      <span class="permission-title">需要权限</span>
    </div>
    
    <div class="permission-content">
      <div class="permission-description">{{ description }}</div>
      <div v-if="patterns.length > 0" class="permission-patterns">
        <div v-for="pattern in patterns" :key="pattern" class="pattern-item">{{ pattern }}</div>
      </div>
    </div>
    
    <div class="permission-actions">
      <button class="action-btn reject-btn" @click="handleReject">
        拒绝
      </button>
      <button class="action-btn" @click="handleAllowAlways">
        始终允许
      </button>
      <button class="action-btn primary-btn" @click="handleAllowOnce">
        允许一次
      </button>
    </div>
  </div>
</template>

<style scoped>
.permission-prompt {
  background: var(--color-bg-elevated, #1a1a1a);
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  padding: 0;
  margin: 8px 0;
  overflow: hidden;
}

.permission-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border, #333);
}

.permission-icon {
  color: var(--color-warning, #f59e0b);
  font-size: 16px;
}

.permission-title {
  color: var(--color-text, #e5e5e5);
  font-weight: 500;
  font-size: 14px;
}

.permission-content {
  padding: 16px;
  background: var(--color-bg-muted, #252525);
}

.permission-action {
  color: var(--color-text, #e5e5e5);
  font-size: 14px;
  margin-bottom: 4px;
}

.permission-description {
  color: var(--color-text-muted, #888);
  font-size: 13px;
  margin-bottom: 12px;
}

.permission-patterns {
  margin-top: 8px;
}

.pattern-item {
  color: var(--color-text, #e5e5e5);
  font-family: monospace;
  font-size: 13px;
  padding: 4px 0;
}

.permission-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border, #333);
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--color-text, #e5e5e5);
  font-size: 13px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--color-bg-hover, #333);
}

.reject-btn {
  color: var(--color-error, #ef4444);
}

.reject-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.primary-btn {
  background: var(--color-bg-elevated, #1a1a1a);
  border: 1px solid var(--color-border, #333);
}

.primary-btn:hover {
  background: var(--color-bg-hover, #333);
}
</style>