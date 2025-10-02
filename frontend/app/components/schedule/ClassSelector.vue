<template>
  <div class="class-selector" data-testid="class-selector">
    <label for="class-search" class="block text-sm font-medium text-gray-700 mb-2">
      Select Class
    </label>
    <div class="relative">
      <!-- Search input -->
      <input
        id="class-search"
        v-model="searchQuery"
        type="text"
        placeholder="Search for a class..."
        :disabled="loading || classes.length === 0"
        @focus="showDropdown = true"
        @blur="handleBlur"
        @keydown="handleKeyDown"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      
      <!-- Loading spinner -->
      <div
        v-if="loading"
        class="absolute inset-y-0 right-0 flex items-center pr-3"
      >
        <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
      
      <!-- Dropdown options -->
      <div
        v-if="showDropdown && !loading"
        class="dropdown-options absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
      >
        <!-- No results -->
        <div v-if="filteredClasses.length === 0" class="no-results px-3 py-2 text-sm text-gray-500">
          No classes found
        </div>
        
        <!-- Class options -->
        <div
          v-for="(cls, index) in filteredClasses"
          :key="cls.id"
          :class="[
            'class-option px-3 py-2 cursor-pointer flex justify-between items-center hover:bg-gray-50',
            { 'highlighted bg-blue-50': index === highlightedIndex }
          ]"
          @mousedown="selectClass(cls)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="flex-1">
            <div class="font-medium text-gray-900">{{ cls.name }}</div>
            <div class="text-sm text-gray-500">{{ cls.groupCount }} groups</div>
          </div>
          <div class="group-count-badge ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {{ cls.groupCount }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Selected class display -->
    <div v-if="selectedClass && !showDropdown" class="mt-2 p-2 bg-blue-50 rounded-md">
      <div class="flex justify-between items-center">
        <div>
          <div class="font-medium text-blue-900">{{ selectedClass.name }}</div>
          <div class="text-sm text-blue-700">{{ selectedClass.groupCount }} groups</div>
        </div>
        <button
          @click="clearSelection"
          class="text-blue-600 hover:text-blue-800 text-sm"
        >
          Change
        </button>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-if="!loading && classes.length === 0" class="empty-classes mt-2 text-sm text-gray-500">
      No classes available
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { ClassOption } from '../../../types/calendar'

interface Props {
  classes: ClassOption[]
  selectedClassId: string | null
  loading?: boolean
  searchable?: boolean
}

interface Emits {
  'class-selected': [classId: string]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  searchable: true
})

const emit = defineEmits<Emits>()

const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)

// Computed properties
const selectedClass = computed(() => {
  return props.classes.find(c => c.id === props.selectedClassId) || null
})

const filteredClasses = computed(() => {
  if (!searchQuery.value) return props.classes
  
  const query = searchQuery.value.toLowerCase()
  return props.classes.filter(cls => 
    cls.searchText.includes(query) || cls.name.toLowerCase().includes(query)
  )
})

// Methods
const selectClass = (cls: ClassOption) => {
  emit('class-selected', cls.id)
  searchQuery.value = ''
  showDropdown.value = false
  highlightedIndex.value = -1
}

const clearSelection = () => {
  searchQuery.value = ''
  showDropdown.value = true
  nextTick(() => {
    const input = document.getElementById('class-search') as HTMLInputElement
    input?.focus()
  })
}

const handleBlur = () => {
  // Delay hiding dropdown to allow for click events
  setTimeout(() => {
    showDropdown.value = false
    highlightedIndex.value = -1
  }, 150)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!showDropdown.value) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredClasses.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        const selectedClass = filteredClasses.value[highlightedIndex.value]
        if (selectedClass) {
          selectClass(selectedClass)
        }
      }
      break
    case 'Escape':
      showDropdown.value = false
      highlightedIndex.value = -1
      break
  }
}

// Watch for changes in search query
watch(searchQuery, () => {
  highlightedIndex.value = -1
  if (searchQuery.value && !showDropdown.value) {
    showDropdown.value = true
  }
})

// Watch for external changes
watch(() => props.selectedClassId, () => {
  if (!props.selectedClassId) {
    searchQuery.value = ''
  }
})
</script>

<style scoped>
.dropdown-options {
  border-color: #d1d5db;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.class-option:last-child {
  border-bottom: none;
}

.highlighted {
  background-color: #dbeafe;
}

.group-count-badge {
  font-weight: 600;
}
</style>