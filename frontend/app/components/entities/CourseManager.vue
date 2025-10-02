<template>
  <div
    class="course-manager"
    :data-testid="'course-manager'"
    :role="'region'"
    :aria-label="'Course Management'"
  >
    <!-- Header with Actions -->
    <div class="course-manager__header">
      <div class="course-manager__title-section">
        <h2 class="course-manager__title">Courses</h2>
        <span class="course-manager__count">{{ filteredCourses.length }} total</span>
      </div>
      
      <div class="course-manager__actions">
        <!-- Search -->
        <div class="course-manager__search">
          <input
            v-model="coursesStore.searchQuery"
            type="text"
            placeholder="Search courses..."
            class="course-manager__search-input"
            :data-testid="'search-input'"
          >
        </div>
        
        <!-- Bulk Actions -->
        <div v-if="coursesStore.selectedIds.length > 0" class="course-manager__bulk-actions">
          <span class="course-manager__selected-count">
            {{ coursesStore.selectedIds.length }} selected
          </span>
          <button
            type="button"
            class="course-manager__bulk-button course-manager__bulk-button--danger"
            :data-testid="'bulk-delete-button'"
            @click="handleBulkDelete"
          >
            Delete Selected
          </button>
        </div>
        
        <!-- Create Button -->
        <button
          type="button"
          class="course-manager__create-button"
          :data-testid="'create-course-button'"
          @click="showCreateForm = true"
        >
          Add Course
        </button>
      </div>
    </div>

    <!-- Courses List -->
    <div class="course-manager__content">
      <!-- Loading State -->
      <div
        v-if="coursesStore.isLoading"
        class="course-manager__loading"
        :data-testid="'loading'"
      >
        <div class="course-manager__spinner"></div>
        <p>Loading courses...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="coursesStore.error"
        class="course-manager__error"
        :data-testid="'error'"
      >
        <p>{{ coursesStore.error }}</p>
        <button
          type="button"
          class="course-manager__retry-button"
          @click="loadCourses"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredCourses.length === 0"
        class="course-manager__empty"
        :data-testid="'empty-state'"
      >
        <p>No courses found</p>
        <button
          type="button"
          class="course-manager__create-button"
          @click="showCreateForm = true"
        >
          Add First Course
        </button>
      </div>

      <!-- Courses Grid -->
      <div
        v-else
        class="course-manager__grid"
        :data-testid="'courses-grid'"
      >
        <div
          v-for="course in filteredCourses"
          :key="course.id"
          class="course-manager__card"
          :class="{ 'course-manager__card--selected': coursesStore.selectedIds.includes(course.id) }"
          :data-testid="'course-card'"
        >
          <!-- Card Header -->
          <div class="course-manager__card-header">
            <input
              type="checkbox"
              :checked="coursesStore.selectedIds.includes(course.id)"
              class="course-manager__checkbox"
              :data-testid="`course-checkbox-${course.id}`"
              @change="coursesStore.toggleSelection(course.id)"
            >
            
            <div class="course-manager__card-info">
              <h3 class="course-manager__card-title">{{ course.name }}</h3>
              <p class="course-manager__card-subject">{{ getSubjectName(course.subjectId) }}</p>
            </div>
            
            <div class="course-manager__card-actions">
              <button
                type="button"
                class="course-manager__action-button"
                :data-testid="`edit-course-${course.id}`"
                @click="editCourse(course)"
              >
                Edit
              </button>
              <button
                type="button"
                class="course-manager__action-button course-manager__action-button--danger"
                :data-testid="`delete-course-${course.id}`"
                @click="deleteCourse(course.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Card Content -->
          <div class="course-manager__card-content">
            <!-- Lessons per Week -->
            <div class="course-manager__card-field">
              <span class="course-manager__card-label">Lessons per Week:</span>
              <span class="course-manager__card-value">{{ course.lessonsPerWeek }}</span>
            </div>

            <!-- Duration -->
            <div class="course-manager__card-field">
              <span class="course-manager__card-label">Duration:</span>
              <span class="course-manager__card-value">{{ course.duration }} minutes</span>
            </div>

            <!-- Groups -->
            <div class="course-manager__card-field">
              <span class="course-manager__card-label">Groups:</span>
              <div class="course-manager__card-groups">
                <span
                  v-for="groupId in course.groupIds"
                  :key="groupId"
                  class="course-manager__group-tag"
                >
                  {{ getGroupName(groupId) }}
                </span>
                <span v-if="course.groupIds.length === 0" class="course-manager__card-empty">
                  No groups assigned
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div
      v-if="showCreateForm || editingCourse"
      class="course-manager__modal"
      @click.self="closeForm"
    >
      <div class="course-manager__form-container">
        <EntityForm
          entity-type="Course"
          :form-fields="courseFormFields"
          :initial-data="editingCourse || {}"
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
      class="course-manager__modal"
    >
      <div class="course-manager__confirmation-container">
        <h3 class="course-manager__confirmation-title">Confirm Delete</h3>
        <p class="course-manager__confirmation-message">
          Are you sure you want to delete "{{ deletingCourse?.name }}"? This action cannot be undone.
        </p>
        <div class="course-manager__confirmation-actions">
          <button
            type="button"
            class="course-manager__button course-manager__button--secondary"
            @click="showDeleteConfirmation = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="course-manager__button course-manager__button--danger"
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
import { useCoursesStore } from '../../stores/courses'
import { useSubjectsStore } from '../../stores/subjects'
import { useGroupsStore } from '../../stores/groups'
import EntityForm from './EntityForm.vue'
import type { Course } from '../../stores' // Use legacy Course type for compatibility

// Stores
const coursesStore = useCoursesStore()
const subjectsStore = useSubjectsStore()
const groupsStore = useGroupsStore()

// State
const showCreateForm = ref(false)
const editingCourse = ref<Course | null>(null)
const showDeleteConfirmation = ref(false)
const deletingCourse = ref<Course | null>(null)
const isSubmitting = ref(false)

// Computed
const filteredCourses = computed(() => coursesStore.filteredCourses || [])

const courseFormFields = computed(() => [
  {
    name: 'name',
    label: 'Course Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter course name'
  },
  {
    name: 'subjectId',
    label: 'Subject',
    type: 'select' as const,
    required: true,
    placeholder: 'Select subject',
    options: (subjectsStore.subjects || []).map(s => ({
      value: s.id,
      label: s.name
    }))
  },
  {
    name: 'lessonsPerWeek',
    label: 'Lessons per Week',
    type: 'number' as const,
    required: true,
    placeholder: 'Number of lessons',
    min: 1,
    max: 10
  },
  {
    name: 'duration',
    label: 'Duration (minutes)',
    type: 'number' as const,
    required: true,
    placeholder: 'Lesson duration',
    min: 15,
    max: 180,
    step: 15
  },
  {
    name: 'groupIds',
    label: 'Groups',
    type: 'multi-select' as const,
    required: true,
    options: groupsStore.groups.map(g => ({
      value: g.id,
      label: g.name
    }))
  }
])

// Methods
const loadCourses = async () => {
  try {
    await coursesStore.loadCourses()
  } catch (error) {
    console.error('Failed to load courses:', error)
  }
}

const loadSubjects = async () => {
  try {
    await subjectsStore.loadSubjects()
  } catch (error) {
    console.error('Failed to load subjects:', error)
  }
}

const loadGroups = async () => {
  try {
    await groupsStore.loadGroups()
  } catch (error) {
    console.error('Failed to load groups:', error)
  }
}

const getSubjectName = (subjectId: string): string => {
  const subject = subjectsStore.getSubjectById(subjectId)
  return subject?.name || 'Unknown Subject'
}

const getGroupName = (groupId: string): string => {
  const group = groupsStore.getGroupById(groupId)
  return group?.name || 'Unknown Group'
}

const editCourse = (course: Course) => {
  editingCourse.value = { ...course }
  showCreateForm.value = false
}

const deleteCourse = (courseId: string) => {
  const course = coursesStore.getCourseById(courseId)
  if (course) {
    deletingCourse.value = course
    showDeleteConfirmation.value = true
  }
}

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  
  try {
    if (editingCourse.value) {
      await coursesStore.updateCourse({ ...editingCourse.value, ...formData })
    } else {
      await coursesStore.createCourse(formData)
    }
    closeForm()
  } catch (error: any) {
    console.error('Failed to save course:', error)
    // Handle error (could emit to parent or show notification)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async () => {
  if (!deletingCourse.value) return
  
  isSubmitting.value = true
  
  try {
    await coursesStore.deleteCourse(deletingCourse.value.id)
    showDeleteConfirmation.value = false
    deletingCourse.value = null
  } catch (error: any) {
    console.error('Failed to delete course:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleBulkDelete = async () => {
  if (coursesStore.selectedIds.length === 0) return
  
  const confirmed = confirm(`Delete ${coursesStore.selectedIds.length} selected courses? This action cannot be undone.`)
  if (!confirmed) return
  
  try {
    await coursesStore.bulkDelete(coursesStore.selectedIds)
    coursesStore.clearSelection()
  } catch (error: any) {
    console.error('Failed to delete courses:', error)
  }
}

const closeForm = () => {
  showCreateForm.value = false
  editingCourse.value = null
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadCourses(),
    loadSubjects(),
    loadGroups()
  ])
})
</script>

<style scoped>
.course-manager {
  @apply space-y-6;
}

.course-manager__header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4;
}

.course-manager__title-section {
  @apply flex items-center gap-3;
}

.course-manager__title {
  @apply text-2xl font-bold text-gray-900;
}

.course-manager__count {
  @apply text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded;
}

.course-manager__actions {
  @apply flex flex-col sm:flex-row items-stretch sm:items-center gap-3;
}

.course-manager__search {
  @apply relative;
}

.course-manager__search-input {
  @apply w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.course-manager__bulk-actions {
  @apply flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg;
}

.course-manager__selected-count {
  @apply text-sm text-blue-700 font-medium;
}

.course-manager__bulk-button {
  @apply px-3 py-1 text-sm font-medium rounded transition-colors;
}

.course-manager__bulk-button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.course-manager__create-button {
  @apply px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.course-manager__content {
  @apply min-h-64;
}

.course-manager__loading,
.course-manager__error,
.course-manager__empty {
  @apply flex flex-col items-center justify-center py-12 text-gray-500;
}

.course-manager__spinner {
  @apply w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.course-manager__retry-button {
  @apply mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.course-manager__grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.course-manager__card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.course-manager__card--selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.course-manager__card-header {
  @apply flex items-start gap-3 mb-4;
}

.course-manager__checkbox {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
}

.course-manager__card-info {
  @apply flex-1;
}

.course-manager__card-title {
  @apply font-semibold text-gray-900;
}

.course-manager__card-subject {
  @apply text-sm text-gray-600;
}

.course-manager__card-actions {
  @apply flex gap-2;
}

.course-manager__action-button {
  @apply px-2 py-1 text-xs font-medium rounded transition-colors;
}

.course-manager__action-button {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.course-manager__action-button--danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200;
}

.course-manager__card-content {
  @apply space-y-3;
}

.course-manager__card-field {
  @apply flex flex-col gap-1;
}

.course-manager__card-label {
  @apply text-xs font-medium text-gray-500 uppercase tracking-wide;
}

.course-manager__card-value {
  @apply text-sm text-gray-900;
}

.course-manager__card-groups {
  @apply flex flex-wrap gap-1;
}

.course-manager__group-tag {
  @apply px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded;
}

.course-manager__card-empty {
  @apply text-sm text-gray-400 italic;
}

.course-manager__modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4;
}

.course-manager__form-container {
  @apply w-full max-w-2xl max-h-[90vh] overflow-y-auto;
}

.course-manager__confirmation-container {
  @apply bg-white rounded-lg p-6 max-w-md w-full;
}

.course-manager__confirmation-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.course-manager__confirmation-message {
  @apply text-gray-700 mb-6;
}

.course-manager__confirmation-actions {
  @apply flex gap-3;
}

.course-manager__button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.course-manager__button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.course-manager__button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>