<script setup>
import { ref } from 'vue'
import SearchForm from './components/SearchForm.vue'
import ResultsTable from './components/ResultsTable.vue'
import { searchBusinesses, liveSearch } from './services/api.js'

const results = ref([])
const loading = ref(false)
const error = ref('')
const lastQuery = ref('')
const lastCity = ref('')
const searched = ref(false)
const isLive = ref(false)

async function handleSearch({ category, city, cityName }) {
  loading.value = true
  error.value = ''
  results.value = []
  searched.value = true
  isLive.value = false
  lastQuery.value = category
  lastCity.value = cityName || city

  try {
    const data = await searchBusinesses(category, city)
    results.value = data.results
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function handleLiveSearch({ query, city, cityName }) {
  loading.value = true
  error.value = ''
  results.value = []
  searched.value = true
  isLive.value = true
  lastQuery.value = query
  lastCity.value = cityName || city

  try {
    const data = await liveSearch(query, city)
    results.value = data.results
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Сбор номеров заведений</h1>
      <p class="subtitle">Поиск по базе данных или напрямую с Яндекс Карт</p>
    </header>

    <main class="main">
      <SearchForm
        :loading="loading"
        @search="handleSearch"
        @live-search="handleLiveSearch"
      />

      <Transition name="fade">
        <div v-if="loading && isLive" class="alert alert-info">
          Сбор данных с Яндекс Карт... Это может занять 1–3 минуты.
        </div>
      </Transition>

      <Transition name="fade">
        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>
      </Transition>

      <ResultsTable
        :results="results"
        :query="lastQuery"
        :city="lastCity"
      />

      <Transition name="fade">
        <div
          v-if="searched && !loading && results.length === 0 && !error"
          class="alert alert-empty"
        >
          По запросу «{{ lastQuery }}» в городе «{{ lastCity }}» ничего не найдено
        </div>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px 60px;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.subtitle {
  margin-top: 6px;
  font-size: 15px;
  color: var(--color-text-muted);
}

.main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.alert {
  padding: 14px 20px;
  border-radius: var(--radius);
  font-size: 14px;
  animation: fadeIn 0.3s ease;
}

.alert-error {
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 1px solid rgb(220 38 38 / 0.2);
}

.alert-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid rgb(59 130 246 / 0.2);
  text-align: center;
}

.alert-empty {
  background: var(--color-card);
  color: var(--color-text-muted);
  text-align: center;
  box-shadow: var(--shadow);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
