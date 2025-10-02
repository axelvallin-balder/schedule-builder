<template>
  <div
    class="class-manager"
    :data-testid="'class-manager'"
    :role="'region'"
    :aria-label="'Class Management'"
  >
    <!-- Header with Actions -->
    <div class="class-manager__header">
      <div class="class-manager__title-section">
        <h2 class="class-manager__title">Classes</h2>
        <span class="class-manager__count">{{ filteredClasses.length }} total</span>
      </div>
      
      <div class="class-manager__actions">
        <!-- Search -->
        <div class="class-manager__search">
          <input
            v-model="classesStore.searchQuery"
            type="text"
            placeholder="Search classes..."
            class="class-manager__search-input"
            :data-testid="'search-input'"
          >
        </div>
        
        <!-- Bulk Actions -->
        <div v-if="classesStore.selectedIds.length > 0" class="class-manager__bulk-actions">
          <span class="class-manager__selected-count">
            {{ classesStore.selectedIds.length }} selected
          </span>
          <button
            type="button"
            class="class-manager__bulk-button class-manager__bulk-button--danger"
            :data-testid="'bulk-delete-button'"
            @click="handleBulkDelete"
          >
            Delete Selected
          </button>
        </div>
        
        <!-- Create Button -->
        <button
          type="button"
          class="class-manager__create-button"
          :data-testid="'create-class-button'"
          @click="showCreateForm = true"
        >
          Add Class
        </button>
      </div>
    </div>

    <!-- Classes List -->
    <div class="class-manager__content">
      <!-- Loading State -->
      <div
        v-if="classesStore.isLoading"
        class="class-manager__loading"
        :data-testid="'loading'"
      >
        <div class="class-manager__spinner"></div>
        <p>Loading classes...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="classesStore.error"
        class="class-manager__error"
        :data-testid="'error'"
      >
        <p>{{ classesStore.error }}</p>
        <button
          type="button"
          class="class-manager__retry-button"
          @click="loadClasses"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredClasses.length === 0"
        class="class-manager__empty"
        :data-testid="'empty-state'"
      >
        <p>No classes found</p>
        <button
          type="button"
          class="class-manager__create-button"
          @click="showCreateForm = true"
        >
          Add First Class
        </button>
      </div>

      <!-- Classes Grid -->
      <div
        v-else
        class="class-manager__grid"
        :data-testid="'classes-grid'"
      >
        <div
          v-for="classItem in filteredClasses"
          :key="classItem.id"
          class="class-manager__card"
          :class="{ 'class-manager__card--selected': classesStore.selectedIds.includes(classItem.id) }"
          :data-testid="'class-card'"
        >
          <!-- Card Header -->
          <div class="class-manager__card-header">
            <input
              type="checkbox"
              :checked="classesStore.selectedIds.includes(classItem.id)"
              class="class-manager__checkbox"
              :data-testid="`class-checkbox-${classItem.id}`"
              @change="classesStore.toggleSelection(classItem.id)"
            >
            
            <div class="class-manager__card-info">
              <h3 class="class-manager__card-title">{{ classItem.name }}</h3>
              <div class="class-manager__card-details">
                <span v-if="classItem.academicYear" class="class-manager__card-year">
                  {{ classItem.academicYear }}
                </span>
                <span v-if="classItem.level" class="class-manager__card-level">
                  {{ classItem.level }}
                </span>
              </div>
            </div>
            
            <div class="class-manager__card-actions">
              <button
                type="button"
                class="class-manager__action-button"
                :data-testid="`edit-class-${classItem.id}`"
                @click="editClass(classItem)"
              >
                Edit
              </button>
              <button
                type="button"
                class="class-manager__action-button class-manager__action-button--danger"
                :data-testid="`delete-class-${classItem.id}`"
                @click="deleteClass(classItem.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Card Content -->
          <div class="class-manager__card-content">
            <!-- Lunch Duration -->
            <div class="class-manager__card-field">
              <span class="class-manager__card-label">Lunch Duration:</span>
              <span class="class-manager__card-value">{{ classItem.lunchDuration }} minutes</span>
            </div>

            <!-- Academic Year -->
            <div v-if="classItem.academicYear" class="class-manager__card-field">
              <span class="class-manager__card-label">Academic Year:</span>
              <span class="class-manager__card-value">{{ classItem.academicYear }}</span>
            </div>

            <!-- Level -->
            <div v-if="classItem.level" class="class-manager__card-field">
              <span class="class-manager__card-label">Level:</span>
              <span class="class-manager__card-value">{{ classItem.level }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div
      v-if="showCreateForm || editingClass"
      class="class-manager__modal"
      @click.self="closeForm"
    >
      <div class="class-manager__form-container">
        <EntityForm
          entity-type="Class"
          :form-fields="classFormFields"
          :initial-data="editingClass || {}"
          :is-submitting="isSubmitting"
          @submit="handleSubmit"
          @cancel="closeForm"
          @close="closeForm"
        />
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirmation"
      class="class-manager__modal"
    >
      <div class="class-manager__confirmation-container">
        <h3 class="class-manager__confirmation-title">Confirm Delete</h3>
        <p class="class-manager__confirmation-message">
          Are you sure you want to delete "{{ deletingClass?.name }}"? This action cannot be undone.
        </p>
        <div class="class-manager__confirmation-actions">
          <button
            type="button"
            class="class-manager__button class-manager__button--secondary"
            @click="showDeleteConfirmation = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="class-manager__button class-manager__button--danger"
            :disabled="isSubmitting"
            @click="confirmDelete"
          >
            {{ isSubmitting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClassesStore } from '../../stores/classes'
import EntityForm from './EntityForm.vue'
import type { Class } from '../../types/entities'

// Stores
const classesStore = useClassesStore()

// State
const showCreateForm = ref(false)
const editingClass = ref<Class | null>(null)
const showDeleteConfirmation = ref(false)
const deletingClass = ref<Class | null>(null)
const isSubmitting = ref(false)

// Computed
const filteredClasses = computed(() => classesStore.filteredClasses || [])

const classFormFields = computed(() => [
  {
    name: 'name',
    label: 'Class Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter class name'
  },
  {
    name: 'lunchDuration',
    label: 'Lunch Duration (minutes)',
    type: 'number' as const,
    required: true,
    placeholder: 'Lunch duration',
    min: 15,
    max: 90,
    step: 5
  },
  {
    name: 'academicYear',
    label: 'Academic Year',
    type: 'text' as const,
    required: false,
    placeholder: 'e.g., 2024-2025'
  },
  {
    name: 'level',
    label: 'Level',
    type: 'select' as const,
    required: false,
    placeholder: 'Select level',
    options: [
      { value: 'Elementary', label: 'Elementary' },
      { value: 'Middle School', label: 'Middle School' },
      { value: 'High School', label: 'High School' },
      { value: 'Grade 1', label: 'Grade 1' },
      { value: 'Grade 2', label: 'Grade 2' },
      { value: 'Grade 3', label: 'Grade 3' },
      { value: 'Grade 4', label: 'Grade 4' },
      { value: 'Grade 5', label: 'Grade 5' },
      { value: 'Grade 6', label: 'Grade 6' },
      { value: 'Grade 7', label: 'Grade 7' },
      { value: 'Grade 8', label: 'Grade 8' },
      { value: 'Grade 9', label: 'Grade 9' },
      { value: 'Grade 10', label: 'Grade 10' },
      { value: 'Grade 11', label: 'Grade 11' },
      { value: 'Grade 12', label: 'Grade 12' }
    ]
  }
])

// Methods
const loadClasses = async () => {
  try {
    await classesStore.loadClasses()
  } catch (error) {
    console.error('Failed to load classes:', error)
  }
}

const editClass = (classItem: Class) => {
  editingClass.value = { ...classItem }
  showCreateForm.value = false
}

const deleteClass = (classId: string) => {
  const classItem = classesStore.getClassById(classId)
  if (classItem) {
    deletingClass.value = classItem
    showDeleteConfirmation.value = true
  }
}

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  
  try {
    if (editingClass.value) {
      await classesStore.updateClass({ ...editingClass.value, ...formData })
    } else {
      await classesStore.createClass(formData)
    }
    closeForm()
  } catch (error: any) {
    console.error('Failed to save class:', error)
    // Handle error (could emit to parent or show notification)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async () => {
  if (!deletingClass.value) return
  
  isSubmitting.value = true
  
  try {
    await classesStore.deleteClass(deletingClass.value.id)
    showDeleteConfirmation.value = false
    deletingClass.value = null
  } catch (error: any) {
    console.error('Failed to delete class:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleBulkDelete = async () => {
  if (classesStore.selectedIds.length === 0) return
  
  const confirmed = confirm(`Delete ${classesStore.selectedIds.length} selected classes? This action cannot be undone.`)
  if (!confirmed) return
  
  try {
    await classesStore.bulkDelete(classesStore.selectedIds)
    classesStore.clearSelection()
  } catch (error: any) {
    console.error('Failed to delete classes:', error)
  }
}

const closeForm = () => {
  showCreateForm.value = false
  editingClass.value = null
}

// Lifecycle
onMounted(async () => {
  await loadClasses()
})
</script>

<style scoped>
.class-manager {
  @apply space-y-6;
}

.class-manager__header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4;
}

.class-manager__title-section {
  @apply flex items-center gap-3;
}

.class-manager__title {
  @apply text-2xl font-bold text-gray-900;
}

.class-manager__count {
  @apply text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded;
}

.class-manager__actions {
  @apply flex flex-col sm:flex-row items-stretch sm:items-center gap-3;
}

.class-manager__search {
  @apply relative;
}

.class-manager__search-input {
  @apply w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.class-manager__bulk-actions {
  @apply flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg;
}

.class-manager__selected-count {
  @apply text-sm text-blue-700 font-medium;
}

.class-manager__bulk-button {
  @apply px-3 py-1 text-sm font-medium rounded transition-colors;
}

.class-manager__bulk-button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.class-manager__create-button {
  @apply px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.class-manager__content {
  @apply min-h-64;
}

.class-manager__loading,
.class-manager__error,
.class-manager__empty {
  @apply flex flex-col items-center justify-center py-12 text-gray-500;
}

.class-manager__spinner {
  @apply w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.class-manager__retry-button {
  @apply mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.class-manager__grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.class-manager__card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.class-manager__card--selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.class-manager__card-header {
  @apply flex items-start gap-3 mb-4;
}

.class-manager__checkbox {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
}

.class-manager__card-info {
  @apply flex-1;
}

.class-manager__card-title {
  @apply font-semibold text-gray-900;
}

.class-manager__card-details {
  @apply flex gap-2 text-sm text-gray-600;
}

.class-manager__card-year,
.class-manager__card-level {
  @apply px-2 py-1 bg-gray-100 rounded text-xs;
}

.class-manager__card-actions {
  @apply flex gap-2;
}

.class-manager__action-button {
  @apply px-2 py-1 text-xs font-medium rounded transition-colors;
}

.class-manager__action-button {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.class-manager__action-button--danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200;
}

.class-manager__card-content {
  @apply space-y-3;
}

.class-manager__card-field {
  @apply flex flex-col gap-1;
}

.class-manager__card-label {
  @apply text-xs font-medium text-gray-500 uppercase tracking-wide;
}

.class-manager__card-value {
  @apply text-sm text-gray-900;
}

.class-manager__modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4;
}

.class-manager__form-container {
  @apply w-full max-w-2xl max-h-[90vh] overflow-y-auto;
}

.class-manager__confirmation-container {
  @apply bg-white rounded-lg p-6 max-w-md w-full;
}

.class-manager__confirmation-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.class-manager__confirmation-message {
  @apply text-gray-700 mb-6;
}

.class-manager__confirmation-actions {
  @apply flex gap-3;
}

.class-manager__button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.class-manager__button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.class-manager__button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>