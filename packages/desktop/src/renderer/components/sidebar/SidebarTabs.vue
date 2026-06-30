<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import SidebarWorkspaces from './SidebarWorkspaces.vue'
import SidebarSessions from './SidebarSessions.vue'
import { useWorkspaceStore } from '../../stores/workspace'

// 两 Tab: Workspaces(多目录管理) / 当前目录(当前 workspace 的会话).
// 无当前 workspace 时 sessions tab 禁用 — 没有锚点就没法列会话.
const workspace = useWorkspaceStore()
const { currentWorkspace } = storeToRefs(workspace)
const tab = ref<'workspaces' | 'sessions'>('workspaces')

// 当前 workspace 被移除(变为 null)时, sessions tab 失去锚点 → 退回 workspaces tab,
// 避免 sessions tab 渲染空列表且 New Session 变 no-op 的降级态.
watch(currentWorkspace, (ws) => {
  if (!ws) tab.value = 'workspaces'
})
</script>

<template>
  <Tabs v-model="tab" class="flex flex-col flex-1 min-h-0">
    <TabsList class="grid w-full grid-cols-2 px-2 pt-2 bg-transparent border-b border-border/60">
      <TabsTrigger 
        value="workspaces" 
        class="text-xs"
      >
        Workspaces
      </TabsTrigger>
      <TabsTrigger 
        value="sessions" 
        class="text-xs"
        :disabled="!currentWorkspace"
      >
        当前目录<span
          v-if="currentWorkspace"
          class="ml-1 text-muted-foreground inline-block truncate max-w-[72px] align-bottom"
          :title="currentWorkspace.name"
        >({{ currentWorkspace.name }})</span>
      </TabsTrigger>
    </TabsList>
    <TabsContent value="workspaces" class="flex-1 min-h-0 m-0">
      <SidebarWorkspaces />
    </TabsContent>
    <TabsContent value="sessions" class="flex-1 min-h-0 m-0">
      <SidebarSessions />
    </TabsContent>
  </Tabs>
</template>
