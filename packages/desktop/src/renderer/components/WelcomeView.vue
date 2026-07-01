<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { FolderOpen, ArrowDownToLine } from 'lucide-vue-next'

defineEmits<{ openFolder: [] }>()
</script>

<template>
  <div class="empty-state flex-1 flex items-center justify-center animate-fade-in">
    <div class="text-center max-w-md">
      <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-card flex items-center justify-center shadow-lg">
        <FolderOpen class="w-10 h-10 text-accent" />
      </div>
      <h2 class="text-lg font-semibold text-foreground mb-2">欢迎使用 LCode</h2>
      <p class="text-sm text-muted-foreground mb-6 leading-relaxed">
        打开文件夹开始与你的代码库对话。LCode 可以读取、写入和编辑文件，运行命令，帮助你更高效地构建。
      </p>
      <Button size="lg" class="gap-2" @click="$emit('openFolder')">
        <ArrowDownToLine class="w-4 h-4" />
        <span>打开文件夹</span>
      </Button>
      <p class="text-xs text-muted-foreground mt-4">
        <kbd class="bg-card px-1.5 py-0.5 rounded font-mono">Ctrl</kbd>
        +
        <kbd class="bg-card px-1.5 py-0.5 rounded font-mono">O</kbd>
        快速打开
      </p>
    </div>
  </div>
</template>