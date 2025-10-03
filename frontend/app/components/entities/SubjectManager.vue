<template>
  <div
    class="subject-manager"
    :data-testid="'subject-manager'"
    :role="'region'"
    :aria-label="'Subject Management'"
  >
    <!-- Header with Actions -->
    <div class="subject-manager__header">
      <div class="subject-manager__title-section">
        <h2 class="subject-manager__title">Subjects</h2>
        <span class="subject-manager__count">{{ filteredSubjects.length }} total</span>
      </div>
      
      <div class="subject-manager__actions">
        <!-- Search -->
        <div class="subject-manager__search">
          <input
            v-model="subjectsStore.searchQuery"
            type="text"
            placeholder="Search subjects..."
            class="subject-manager__search-input"
            :data-testid="'search-input'"
          >
        </div>
        
        <!-- Bulk Actions -->
        <div v-if="subjectsStore.selectedIds.length > 0" class="subject-manager__bulk-actions">
          <span class="subject-manager__selected-count">
            {{ subjectsStore.selectedIds.length }} selected
          </span>
          <button
            type="button"
            class="subject-manager__bulk-button subject-manager__bulk-button--danger"
            :data-testid="'bulk-delete-button'"
            @click="handleBulkDelete"
          >
            Delete Selected
          </button>
        </div>
        
        <!-- Create Button -->
        <button
          type="button"
          class="subject-manager__create-button"
          :data-testid="'create-subject-button'"
          @click="showCreateForm = true"
        >
          Add Subject
        </button>
      </div>
    </div>

    <!-- Subjects List -->
    <div class="subject-manager__content">
      <!-- Loading State -->
      <div
        v-if="subjectsStore.isLoading"
        class="subject-manager__loading"
        :data-testid="'loading'"
      >
        <div class="subject-manager__spinner"></div>
        <p>Loading subjects...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="subjectsStore.error"
        class="subject-manager__error"
        :data-testid="'error'"
      >
        <p>{{ subjectsStore.error }}</p>
        <button
          type="button"
          class="subject-manager__retry-button"
          @click="loadSubjects"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredSubjects.length === 0"
        class="subject-manager__empty"
        :data-testid="'empty-state'"
      >
        <p>No subjects found</p>
        <button
          type="button"
          class="subject-manager__create-button"
          @click="showCreateForm = true"
        >
          Add First Subject
        </button>
      </div>

      <!-- Subjects Grid -->
      <div
        v-else
        class="subject-manager__grid"
        :data-testid="'subjects-grid'"
      >
        <div
          v-for="subject in filteredSubjects"
          :key="subject.id"
          class="subject-manager__card"
          :class="{ 'subject-manager__card--selected': subjectsStore.selectedIds.includes(subject.id) }"
          :data-testid="'subject-card'"
        >
          <!-- Card Header -->
          <div class="subject-manager__card-header">
            <input
              type="checkbox"
              :checked="subjectsStore.selectedIds.includes(subject.id)"
              class="subject-manager__checkbox"
              :data-testid="`subject-checkbox-${subject.id}`"
              @change="subjectsStore.toggleSelection(subject.id)"
            >
            
            <div class="subject-manager__card-info">
              <h3 class="subject-manager__card-title">{{ subject.name }}</h3>
              <div class="subject-manager__card-code-color">
                <span class="subject-manager__card-code">{{ subject.code }}</span>
                <div 
                  class="subject-manager__color-indicator" 
                  :style="{ backgroundColor: subject.color }"
                  :title="`Color: ${subject.color}`"
                ></div>
              </div>
            </div>
            
            <div class="subject-manager__card-actions">
              <button
                type="button"
                class="subject-manager__action-button"
                :data-testid="`edit-subject-${subject.id}`"
                @click="editSubject(subject)"
              >
                Edit
              </button>
              <button
                type="button"
                class="subject-manager__action-button subject-manager__action-button--danger"
                :data-testid="`delete-subject-${subject.id}`"
                @click="deleteSubject(subject.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div
      v-if="showCreateForm || editingSubject"
      class="subject-manager__modal"
      @click.self="closeForm"
    >
      <div class="subject-manager__form-container">
        <EntityForm
          entity-type="Subject"
          :form-fields="subjectFormFields"
          :initial-data="editingSubject || {}"
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
      class="subject-manager__modal"
    >
      <div class="subject-manager__confirmation-container">
        <h3 class="subject-manager__confirmation-title">Confirm Delete</h3>
        <p class="subject-manager__confirmation-message">
          Are you sure you want to delete "{{ deletingSubject?.name }}" ({{ deletingSubject?.code }})? This action cannot be undone.
        </p>
        <div class="subject-manager__confirmation-actions">
          <button
            type="button"
            class="subject-manager__button subject-manager__button--secondary"
            @click="showDeleteConfirmation = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="subject-manager__button subject-manager__button--danger"
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
import { useSubjectsStore } from '../../stores/subjects'
import EntityForm from './EntityForm.vue'
import type { Subject } from '../../stores' // Use legacy Subject type for compatibility

// Stores
const subjectsStore = useSubjectsStore()

// State
const showCreateForm = ref(false)
const editingSubject = ref<Subject | null>(null)
const showDeleteConfirmation = ref(false)
const deletingSubject = ref<Subject | null>(null)
const isSubmitting = ref(false)

// Computed
const filteredSubjects = computed(() => subjectsStore.filteredSubjects || [])

const subjectFormFields = computed(() => [
  {
    name: 'name',
    label: 'Subject Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter subject name'
  },
  {
    name: 'code',
    label: 'Subject Code',
    type: 'text' as const,
    required: true,
    placeholder: 'e.g., MATH, ENG, SCI'
  },
  {
    name: 'color',
    label: 'Color',
    type: 'text' as const,
    required: true,
    placeholder: '#FF6B6B'
  }
])

// Methods
const loadSubjects = async () => {
  try {
    await subjectsStore.loadSubjects()
  } catch (error) {
    console.error('Failed to load subjects:', error)
  }
}

const editSubject = (subject: Subject) => {
  editingSubject.value = { ...subject }
  showCreateForm.value = false
}

const deleteSubject = (subjectId: string) => {
  const subject = subjectsStore.getSubjectById(subjectId)
  if (subject) {
    deletingSubject.value = subject
    showDeleteConfirmation.value = true
  }
}

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  
  try {
    if (editingSubject.value) {
      await subjectsStore.updateSubject({ ...editingSubject.value, ...formData })
    } else {
      await subjectsStore.createSubject(formData)
    }
    closeForm()
  } catch (error: any) {
    console.error('Failed to save subject:', error)
    // Handle error (could emit to parent or show notification)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async () => {
  if (!deletingSubject.value) return
  
  isSubmitting.value = true
  
  try {
    await subjectsStore.deleteSubject(deletingSubject.value.id)
    showDeleteConfirmation.value = false
    deletingSubject.value = null
  } catch (error: any) {
    console.error('Failed to delete subject:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleBulkDelete = async () => {
  if (subjectsStore.selectedIds.length === 0) return
  
  const confirmed = confirm(`Delete ${subjectsStore.selectedIds.length} selected subjects? This action cannot be undone.`)
  if (!confirmed) return
  
  try {
    await subjectsStore.bulkDelete(subjectsStore.selectedIds)
    subjectsStore.clearSelection()
  } catch (error: any) {
    console.error('Failed to delete subjects:', error)
  }
}

const closeForm = () => {
  showCreateForm.value = false
  editingSubject.value = null
}

// Lifecycle
onMounted(async () => {
  await loadSubjects()
})
</script>

<style scoped>
.subject-manager {
  @apply space-y-6;
}

.subject-manager__header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4;
}

.subject-manager__title-section {
  @apply flex items-center gap-3;
}

.subject-manager__title {
  @apply text-2xl font-bold text-gray-900;
}

.subject-manager__count {
  @apply text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded;
}

.subject-manager__actions {
  @apply flex flex-col sm:flex-row items-stretch sm:items-center gap-3;
}

.subject-manager__search {
  @apply relative;
}

.subject-manager__search-input {
  @apply w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.subject-manager__bulk-actions {
  @apply flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg;
}

.subject-manager__selected-count {
  @apply text-sm text-blue-700 font-medium;
}

.subject-manager__bulk-button {
  @apply px-3 py-1 text-sm font-medium rounded transition-colors;
}

.subject-manager__bulk-button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.subject-manager__create-button {
  @apply px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.subject-manager__content {
  @apply min-h-64;
}

.subject-manager__loading,
.subject-manager__error,
.subject-manager__empty {
  @apply flex flex-col items-center justify-center py-12 text-gray-500;
}

.subject-manager__spinner {
  @apply w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.subject-manager__retry-button {
  @apply mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.subject-manager__grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.subject-manager__card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.subject-manager__card--selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.subject-manager__card-header {
  @apply flex items-start gap-3;
}

.subject-manager__checkbox {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
}

.subject-manager__card-info {
  @apply flex-1;
}

.subject-manager__card-title {
  @apply font-semibold text-gray-900 mb-2;
}

.subject-manager__card-code-color {
  @apply flex items-center gap-2;
}

.subject-manager__card-code {
  @apply text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded;
}

.subject-manager__color-indicator {
  @apply w-4 h-4 rounded border border-gray-300;
}

.subject-manager__card-actions {
  @apply flex gap-2;
}

.subject-manager__action-button {
  @apply px-2 py-1 text-xs font-medium rounded transition-colors;
}

.subject-manager__action-button {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.subject-manager__action-button--danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200;
}

.subject-manager__modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4;
}

.subject-manager__form-container {
  @apply w-full max-w-2xl max-h-[90vh] overflow-y-auto;
}

.subject-manager__confirmation-container {
  @apply bg-white rounded-lg p-6 max-w-md w-full;
}

.subject-manager__confirmation-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.subject-manager__confirmation-message {
  @apply text-gray-700 mb-6;
}

.subject-manager__confirmation-actions {
  @apply flex gap-3;
}

.subject-manager__button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.subject-manager__button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.subject-manager__button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>