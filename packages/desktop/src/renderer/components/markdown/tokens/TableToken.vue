<script setup lang="ts">
import { computed } from 'vue'
import InlineToken from './InlineToken.vue'

const props = defineProps<{
  openToken: any
  inlineTokens: any[]
  messageId: string
  codeIndex: number
}>()

interface Cell { tokens: any[] }
interface Row { cells: Cell[] }

const rows = computed<Row[]>(() => {
  const result: Row[] = []
  let currentRow: Row | null = null
  let currentCell: Cell | null = null

  for (const t of props.inlineTokens) {
    if (t.type === 'tr_open') {
      currentRow = { cells: [] }
    } else if (t.type === 'tr_close') {
      if (currentRow) result.push(currentRow)
      currentRow = null
    } else if (t.type === 'th_open' || t.type === 'td_open') {
      currentCell = { tokens: [] }
    } else if (t.type === 'th_close' || t.type === 'td_close') {
      if (currentCell && currentRow) currentRow.cells.push(currentCell)
      currentCell = null
    } else if (currentCell && !t.type.endsWith('_open') && !t.type.endsWith('_close')) {
      currentCell.tokens.push(t)
    }
  }
  return result
})

const headerRow = computed(() => rows.value[0])
const bodyRows = computed(() => rows.value.slice(1))
</script>

<template>
  <table class="w-full border-collapse mb-3 text-xs">
    <thead v-if="headerRow">
      <tr>
        <th v-for="(cell, i) in headerRow.cells" :key="i" class="border border-border px-2 py-1 text-left font-semibold bg-bg-surface">
          <InlineToken :tokens="cell.tokens" :message-id="messageId" />
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, ri) in bodyRows" :key="ri">
        <td v-for="(cell, ci) in row.cells" :key="ci" class="border border-border px-2 py-1">
          <InlineToken :tokens="cell.tokens" :message-id="messageId" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
