<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { fetchCities, fetchCategories } from '../services/api.js'

const emit = defineEmits(['search', 'live-search'])
const props = defineProps({
  loading: Boolean,
})

const mode = ref('db')
const cities = ref([])
const categories = ref([])
const selectedCity = ref('')
const selectedCategory = ref('')
const liveQuery = ref('')

onMounted(async () => {
  cities.value = await fetchCities()
})

watch(selectedCity, async (city) => {
  selectedCategory.value = ''
  if (!city) { categories.value = []; return }
  categories.value = await fetchCategories(city)
})

const canSubmitDb = computed(() =>
  selectedCategory.value && selectedCity.value && !props.loading,
)

const canSubmitLive = computed(() =>
  liveQuery.value.trim() && selectedCity.value && !props.loading,
)

function handleDbSearch() {
  if (!canSubmitDb.value) return
  emit('search', {
    category: selectedCategory.value,
    city: selectedCity.value,
    cityName: cities.value.find(c => c.key === selectedCity.value)?.name || '',
  })
}

function handleLiveSearch() {
  if (!canSubmitLive.value) return
  emit('live-search', {
    query: liveQuery.value.trim(),
    city: selectedCity.value,
    cityName: cities.value.find(c => c.key === selectedCity.value)?.name || '',
  })
}
</script>

<template>
  <div class="form-card">
    <div class="form-group">
      <label for="city">Город</label>
      <select id="city" v-model="selectedCity" required>
        <option value="" disabled>Выберите город</option>
        <option v-for="city in cities" :key="city.key" :value="city.key">
          {{ city.name }}
        </option>
      </select>
    </div>

    <div class="tabs">
      <button
        type="button"
        class="tab"
        :class="{ active: mode === 'db' }"
        @click="mode = 'db'"
      >
        Из базы данных
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: mode === 'live' }"
        @click="mode = 'live'"
      >
        Ручной поиск
      </button>
    </div>

    <form v-if="mode === 'db'" class="search-row" @submit.prevent="handleDbSearch">
      <div class="form-group grow">
        <label for="category">Категория</label>
        <select
          id="category"
          v-model="selectedCategory"
          :disabled="!selectedCity"
          required
        >
          <option value="" disabled>
            {{ selectedCity ? 'Выберите категорию' : 'Сначала выберите город' }}
          </option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
      <button type="submit" class="btn-primary" :disabled="!canSubmitDb">
        <span v-if="loading" class="spinner" />
        {{ loading ? 'Поиск...' : 'Найти' }}
      </button>
    </form>

    <form v-else class="search-row" @submit.prevent="handleLiveSearch">
      <div class="form-group grow">
        <label for="live-query">Ключевые слова</label>
        <input
          id="live-query"
          v-model="liveQuery"
          type="text"
          placeholder="Например: пиццерия, шиномонтаж, зоомагазин..."
          :disabled="!selectedCity"
        />
      </div>
      <button type="submit" class="btn-live" :disabled="!canSubmitLive">
        <span v-if="loading" class="spinner" />
        {{ loading ? 'Парсинг...' : 'Парсить' }}
      </button>
    </form>

    <p v-if="mode === 'live'" class="hint">
      Данные собираются напрямую с Яндекс Карт. Это может занять 1–3 минуты.
    </p>
  </div>
</template>

<style scoped>
.form-card {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--color-bg);
  padding: 4px;
  border-radius: 10px;
}

.tab {
  flex: 1;
  padding: 9px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: #fff;
  color: var(--color-text);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.grow {
  flex: 1;
}

label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

select, input {
  padding: 10px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: 8px;
  font-size: 15px;
  color: var(--color-text);
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}

select { cursor: pointer; }

select:focus, input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.15);
}

select:disabled, input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary, .btn-live {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 22px;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}

.btn-primary {
  background: var(--color-primary);
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-live {
  background: #f59e0b;
}
.btn-live:hover:not(:disabled) {
  background: #d97706;
}

.btn-primary:disabled, .btn-live:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: -8px 0 0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgb(255 255 255 / 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@media (max-width: 600px) {
  .search-row { flex-direction: column; }
}
</style>
