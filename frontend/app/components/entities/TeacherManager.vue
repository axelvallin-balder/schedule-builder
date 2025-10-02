<template>
  <div
    class="teacher-manager"
    :data-testid="'teacher-manager'"
    :role="'region'"
    :aria-label="'Teacher Management'"
  >
    <!-- Header with Actions -->
    <div class="teacher-manager__header">
      <div class="teacher-manager__title-section">
        <h2 class="teacher-manager__title">Teachers</h2>
        <span class="teacher-manager__count">{{ filteredTeachers.length }} total</span>
      </div>
      
      <div class="teacher-manager__actions">
        <!-- Search -->
        <div class="teacher-manager__search">
          <input
            v-model="teachersStore.searchQuery"
            type="text"
            placeholder="Search teachers..."
            class="teacher-manager__search-input"
            :data-testid="'search-input'"
          >
        </div>
        
        <!-- Bulk Actions -->
        <div v-if="teachersStore.selectedIds.length > 0" class="teacher-manager__bulk-actions">
          <span class="teacher-manager__selected-count">
            {{ teachersStore.selectedIds.length }} selected
          </span>
          <button
            type="button"
            class="teacher-manager__bulk-button teacher-manager__bulk-button--danger"
            :data-testid="'bulk-delete-button'"
            @click="handleBulkDelete"
          >
            Delete Selected
          </button>
        </div>
        
        <!-- Create Button -->
        <button
          type="button"
          class="teacher-manager__create-button"
          :data-testid="'create-teacher-button'"
          @click="showCreateForm = true"
        >
          Add Teacher
        </button>
      </div>
    </div>

    <!-- Teachers List -->
    <div class="teacher-manager__content">
      <!-- Loading State -->
      <div
        v-if="teachersStore.isLoading"
        class="teacher-manager__loading"
        :data-testid="'loading'"
      >
        <div class="teacher-manager__spinner"></div>
        <p>Loading teachers...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="teachersStore.error"
        class="teacher-manager__error"
        :data-testid="'error'"
      >
        <p>{{ teachersStore.error }}</p>
        <button
          type="button"
          class="teacher-manager__retry-button"
          @click="loadTeachers"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredTeachers.length === 0"
        class="teacher-manager__empty"
        :data-testid="'empty-state'"
      >
        <p>No teachers found</p>
        <button
          type="button"
          class="teacher-manager__create-button"
          @click="showCreateForm = true"
        >
          Add First Teacher
        </button>
      </div>

      <!-- Teachers Grid -->
      <div
        v-else
        class="teacher-manager__grid"
        :data-testid="'teachers-grid'"
      >
        <div
          v-for="teacher in filteredTeachers"
          :key="teacher.id"
          class="teacher-manager__card"
          :class="{ 'teacher-manager__card--selected': teachersStore.selectedIds.includes(teacher.id) }"
          :data-testid="'teacher-card'"
        >
          <!-- Card Header -->
          <div class="teacher-manager__card-header">
            <input
              type="checkbox"
              :checked="teachersStore.selectedIds.includes(teacher.id)"
              class="teacher-manager__checkbox"
              :data-testid="`teacher-checkbox-${teacher.id}`"
              @change="teachersStore.toggleSelection(teacher.id)"
            >
            
            <div class="teacher-manager__card-info">
              <h3 class="teacher-manager__card-title">{{ teacher.name }}</h3>
              <p class="teacher-manager__card-email">{{ teacher.email }}</p>
            </div>
            
            <div class="teacher-manager__card-actions">
              <button
                type="button"
                class="teacher-manager__action-button"
                :data-testid="`edit-teacher-${teacher.id}`"
                @click="editTeacher(teacher)"
              >
                Edit
              </button>
              <button
                type="button"
                class="teacher-manager__action-button teacher-manager__action-button--danger"
                :data-testid="`delete-teacher-${teacher.id}`"
                @click="deleteTeacher(teacher.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Card Content -->
          <div class="teacher-manager__card-content">
            <!-- Subjects -->
            <div class="teacher-manager__card-field">
              <span class="teacher-manager__card-label">Subjects:</span>
              <div class="teacher-manager__card-subjects">
                <span
                  v-for="subjectId in teacher.subjectIds"
                  :key="subjectId"
                  class="teacher-manager__subject-tag"
                >
                  {{ getSubjectName(subjectId) }}
                </span>
                <span v-if="teacher.subjectIds.length === 0" class="teacher-manager__card-empty">
                  No subjects assigned
                </span>
              </div>
            </div>

            <!-- Availability -->
            <div class="teacher-manager__card-field">
              <span class="teacher-manager__card-label">Availability:</span>
              <div class="teacher-manager__card-availability">
                <span
                  v-for="availability in teacher.availability"
                  :key="`${availability.dayOfWeek}-${availability.startTime}`"
                  class="teacher-manager__availability-item"
                >
                  {{ getDayName(availability.dayOfWeek) }}: {{ availability.startTime }}-{{ availability.endTime }}
                </span>
                <span v-if="teacher.availability.length === 0" class="teacher-manager__card-empty">
                  No availability set
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div
      v-if="showCreateForm || editingTeacher"
      class="teacher-manager__modal"
      @click.self="closeForm"
    >
      <div class="teacher-manager__form-container">
        <EntityForm
          entity-type="Teacher"
          :form-fields="teacherFormFields"
          :initial-data="editingTeacher || {}"
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
      class="teacher-manager__modal"
    >
      <div class="teacher-manager__confirmation-container">
        <h3 class="teacher-manager__confirmation-title">Confirm Delete</h3>
        <p class="teacher-manager__confirmation-message">
          Are you sure you want to delete "{{ deletingTeacher?.name }}"? This action cannot be undone.
        </p>
        <div class="teacher-manager__confirmation-actions">
          <button
            type="button"
            class="teacher-manager__button teacher-manager__button--secondary"
            @click="showDeleteConfirmation = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="teacher-manager__button teacher-manager__button--danger"
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
import { useTeachersStore } from '../../stores/teachers'
import { useSubjectsStore } from '../../stores/subjects'
import EntityForm from './EntityForm.vue'
import type { Teacher } from '../../stores' // Use legacy Teacher type for compatibility

// Stores
const teachersStore = useTeachersStore()
const subjectsStore = useSubjectsStore()

// State
const showCreateForm = ref(false)
const editingTeacher = ref<Teacher | null>(null)
const showDeleteConfirmation = ref(false)
const deletingTeacher = ref<Teacher | null>(null)
const isSubmitting = ref(false)

// Computed
const filteredTeachers = computed(() => teachersStore.filteredTeachers || [])

const teacherFormFields = computed(() => [
  {
    name: 'name',
    label: 'Teacher Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter teacher name'
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email' as const,
    required: true,
    placeholder: 'Enter email address'
  },
  {
    name: 'subjectIds',
    label: 'Subjects',
    type: 'multi-select' as const,
    required: true,
    options: (subjectsStore.subjects || []).map(s => ({
      value: s.id,
      label: s.name
    }))
  }
])

// Methods
const loadTeachers = async () => {
  try {
    await teachersStore.loadTeachers()
  } catch (error) {
    console.error('Failed to load teachers:', error)
  }
}

const loadSubjects = async () => {
  try {
    await subjectsStore.loadSubjects()
  } catch (error) {
    console.error('Failed to load subjects:', error)
  }
}

const getSubjectName = (subjectId: string): string => {
  const subject = subjectsStore.getSubjectById(subjectId)
  return subject?.name || 'Unknown Subject'
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dayOfWeek] || 'Unknown'
}

const editTeacher = (teacher: Teacher) => {
  editingTeacher.value = { ...teacher }
  showCreateForm.value = false
}

const deleteTeacher = (teacherId: string) => {
  const teacher = teachersStore.getTeacherById(teacherId)
  if (teacher) {
    deletingTeacher.value = teacher
    showDeleteConfirmation.value = true
  }
}

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  
  try {
    if (editingTeacher.value) {
      await teachersStore.updateTeacher({ ...editingTeacher.value, ...formData })
    } else {
      await teachersStore.createTeacher(formData)
    }
    closeForm()
  } catch (error: any) {
    console.error('Failed to save teacher:', error)
    // Handle error (could emit to parent or show notification)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async () => {
  if (!deletingTeacher.value) return
  
  isSubmitting.value = true
  
  try {
    await teachersStore.deleteTeacher(deletingTeacher.value.id)
    showDeleteConfirmation.value = false
    deletingTeacher.value = null
  } catch (error: any) {
    console.error('Failed to delete teacher:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleBulkDelete = async () => {
  if (teachersStore.selectedIds.length === 0) return
  
  const confirmed = confirm(`Delete ${teachersStore.selectedIds.length} selected teachers? This action cannot be undone.`)
  if (!confirmed) return
  
  try {
    await teachersStore.bulkDelete(teachersStore.selectedIds)
    teachersStore.clearSelection()
  } catch (error: any) {
    console.error('Failed to delete teachers:', error)
  }
}

const closeForm = () => {
  showCreateForm.value = false
  editingTeacher.value = null
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadTeachers(),
    loadSubjects()
  ])
})
</script>

<style scoped>
.teacher-manager {
  @apply space-y-6;
}

.teacher-manager__header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4;
}

.teacher-manager__title-section {
  @apply flex items-center gap-3;
}

.teacher-manager__title {
  @apply text-2xl font-bold text-gray-900;
}

.teacher-manager__count {
  @apply text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded;
}

.teacher-manager__actions {
  @apply flex flex-col sm:flex-row items-stretch sm:items-center gap-3;
}

.teacher-manager__search {
  @apply relative;
}

.teacher-manager__search-input {
  @apply w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.teacher-manager__bulk-actions {
  @apply flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg;
}

.teacher-manager__selected-count {
  @apply text-sm text-blue-700 font-medium;
}

.teacher-manager__bulk-button {
  @apply px-3 py-1 text-sm font-medium rounded transition-colors;
}

.teacher-manager__bulk-button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.teacher-manager__create-button {
  @apply px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.teacher-manager__content {
  @apply min-h-64;
}

.teacher-manager__loading,
.teacher-manager__error,
.teacher-manager__empty {
  @apply flex flex-col items-center justify-center py-12 text-gray-500;
}

.teacher-manager__spinner {
  @apply w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.teacher-manager__retry-button {
  @apply mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.teacher-manager__grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.teacher-manager__card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.teacher-manager__card--selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.teacher-manager__card-header {
  @apply flex items-start gap-3 mb-4;
}

.teacher-manager__checkbox {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
}

.teacher-manager__card-info {
  @apply flex-1;
}

.teacher-manager__card-title {
  @apply font-semibold text-gray-900;
}

.teacher-manager__card-email {
  @apply text-sm text-gray-600;
}

.teacher-manager__card-actions {
  @apply flex gap-2;
}

.teacher-manager__action-button {
  @apply px-2 py-1 text-xs font-medium rounded transition-colors;
}

.teacher-manager__action-button {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.teacher-manager__action-button--danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200;
}

.teacher-manager__card-content {
  @apply space-y-3;
}

.teacher-manager__card-field {
  @apply flex flex-col gap-1;
}

.teacher-manager__card-label {
  @apply text-xs font-medium text-gray-500 uppercase tracking-wide;
}

.teacher-manager__card-subjects,
.teacher-manager__card-availability {
  @apply flex flex-wrap gap-1;
}

.teacher-manager__subject-tag {
  @apply px-2 py-1 bg-green-100 text-green-800 text-xs rounded;
}

.teacher-manager__availability-item {
  @apply px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded;
}

.teacher-manager__card-empty {
  @apply text-sm text-gray-400 italic;
}

.teacher-manager__modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4;
}

.teacher-manager__form-container {
  @apply w-full max-w-2xl max-h-[90vh] overflow-y-auto;
}

.teacher-manager__confirmation-container {
  @apply bg-white rounded-lg p-6 max-w-md w-full;
}

.teacher-manager__confirmation-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.teacher-manager__confirmation-message {
  @apply text-gray-700 mb-6;
}

.teacher-manager__confirmation-actions {
  @apply flex gap-3;
}

.teacher-manager__button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.teacher-manager__button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.teacher-manager__button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>