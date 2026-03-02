<script setup>
import { exportToExcel } from '../utils/excel.js'

const props = defineProps({
  results: { type: Array, required: true },
  query: { type: String, default: '' },
  city: { type: String, default: '' },
})

async function handleExport() {
  const date = new Date().toISOString().slice(0, 10)
  const filename = `${props.query}_${props.city}_${date}.xlsx`
  await exportToExcel(props.results, filename)
}
</script>

<template>
  <div class="results" v-if="results.length > 0">
    <div class="results-header">
      <span class="results-count">
        Найдено <strong>{{ results.length }}</strong> заведений
      </span>
      <button class="btn-export" @click="handleExport">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Экспорт в Excel
      </button>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th class="col-index">№</th>
            <th class="col-name">Название</th>
            <th class="col-phone">Телефон</th>
            <th class="col-address">Адрес</th>
            <th class="col-category">Категория</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in results" :key="item.id || index">
            <td class="col-index">{{ index + 1 }}</td>
            <td class="col-name">{{ item.name }}</td>
            <td class="col-phone">{{ item.phones || '—' }}</td>
            <td class="col-address">{{ item.address }}</td>
            <td class="col-category">{{ item.categories }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.results {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  animation: fadeIn 0.3s ease;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border);
}

.results-count {
  font-size: 14px;
  color: var(--color-text-muted);
}

.results-count strong {
  color: var(--color-text);
}

.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1.5px solid var(--color-success);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-export:hover {
  background: var(--color-success);
  color: #fff;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: var(--color-bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

td {
  padding: 10px 16px;
  border-top: 1px solid var(--color-border);
  vertical-align: top;
}

tbody tr:hover {
  background: #f8fafc;
}

.col-index {
  width: 50px;
  text-align: center;
  color: var(--color-text-muted);
}

.col-name {
  min-width: 180px;
  font-weight: 500;
}

.col-phone {
  min-width: 160px;
  white-space: nowrap;
}

.col-address {
  min-width: 200px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.col-category {
  min-width: 140px;
  font-size: 13px;
  color: var(--color-text-muted);
}
</style>
