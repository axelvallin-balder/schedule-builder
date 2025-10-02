<template>
  <div
    class="group-manager"
    :data-testid="'group-manager'"
    :role="'region'"
    :aria-label="'Group Management'"
  >
    <!-- Header with Actions -->
    <div class="group-manager__header">
      <div class="group-manager__title-section">
        <h2 class="group-manager__title">Groups</h2>
        <span class="group-manager__count">{{ filteredGroups.length }} total</span>
      </div>
      
      <div class="group-manager__actions">
        <!-- Search -->
        <div class="group-manager__search">
          <input
            v-model="groupsStore.searchQuery"
            type="text"
            placeholder="Search groups..."
            class="group-manager__search-input"
            :data-testid="'search-input'"
          >
        </div>
        
        <!-- Bulk Actions -->
        <div v-if="groupsStore.selectedIds.length > 0" class="group-manager__bulk-actions">
          <span class="group-manager__selected-count">
            {{ groupsStore.selectedIds.length }} selected
          </span>
          <button
            type="button"
            class="group-manager__bulk-button group-manager__bulk-button--danger"
            :data-testid="'bulk-delete-button'"
            @click="handleBulkDelete"
          >
            Delete Selected
          </button>
        </div>
        
        <!-- Create Button -->
        <button
          type="button"
          class="group-manager__create-button"
          :data-testid="'create-group-button'"
          @click="showCreateForm = true"
        >
          Create Group
        </button>
      </div>
    </div>

    <!-- Groups List -->
    <div class="group-manager__content">
      <!-- Loading State -->
      <div
        v-if="groupsStore.isLoading"
        class="group-manager__loading"
        :data-testid="'loading'"
      >
        <div class="group-manager__spinner"></div>
        <p>Loading groups...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="groupsStore.error"
        class="group-manager__error"
        :data-testid="'error'"
      >
        <p>{{ groupsStore.error }}</p>
        <button
          type="button"
          class="group-manager__retry-button"
          @click="loadGroups"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredGroups.length === 0"
        class="group-manager__empty"
        :data-testid="'empty-state'"
      >
        <p>No groups found</p>
        <button
          type="button"
          class="group-manager__create-button"
          @click="showCreateForm = true"
        >
          Create First Group
        </button>
      </div>

      <!-- Groups Grid -->
      <div
        v-else
        class="group-manager__grid"
        :data-testid="'groups-grid'"
      >
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          class="group-manager__card"
          :class="{ 'group-manager__card--selected': groupsStore.selectedIds.includes(group.id) }"
          :data-testid="'group-card'"
        >
          <!-- Card Header -->
          <div class="group-manager__card-header">
            <input
              type="checkbox"
              :checked="groupsStore.selectedIds.includes(group.id)"
              class="group-manager__checkbox"
              :data-testid="`group-checkbox-${group.id}`"
              @change="groupsStore.toggleSelection(group.id)"
            >
            
            <h3 class="group-manager__card-title">{{ group.name }}</h3>
            
            <div class="group-manager__card-actions">
              <button
                type="button"
                class="group-manager__action-button"
                :data-testid="`edit-group-${group.id}`"
                @click="editGroup(group)"
              >
                Edit
              </button>
              <button
                type="button"
                class="group-manager__action-button group-manager__action-button--danger"
                :data-testid="`delete-group-${group.id}`"
                @click="deleteGroup(group.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Card Content -->
          <div class="group-manager__card-content">
            <!-- Year Level -->
            <div class="group-manager__card-field">
              <span class="group-manager__card-label">Year Level:</span>
              <span class="group-manager__card-value">Year {{ group.year }}</span>
            </div>

            <!-- Student Count -->
            <div class="group-manager__card-field">
              <span class="group-manager__card-label">Students:</span>
              <span class="group-manager__card-value">{{ group.studentCount }} students</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div
      v-if="showCreateForm || editingGroup"
      class="group-manager__modal"
      @click.self="closeForm"
    >
      <div class="group-manager__form-container">
        <EntityForm
          entity-type="Group"
          :form-fields="groupFormFields"
          :initial-data="editingGroup || {}"
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
      class="group-manager__modal"
    >
      <div class="group-manager__confirmation-container">
        <h3 class="group-manager__confirmation-title">Confirm Delete</h3>
        <p class="group-manager__confirmation-message">
          Are you sure you want to delete "{{ deletingGroup?.name }}"? This action cannot be undone.
        </p>
        <div class="group-manager__confirmation-actions">
          <button
            type="button"
            class="group-manager__button group-manager__button--secondary"
            @click="showDeleteConfirmation = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="group-manager__button group-manager__button--danger"
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
import { useGroupsStore } from '../../stores/groups'
import EntityForm from './EntityForm.vue'
import type { Group } from '../../stores' // Use legacy Group type for compatibility

// Stores
const groupsStore = useGroupsStore()

// State
const showCreateForm = ref(false)
const editingGroup = ref<Group | null>(null)
const showDeleteConfirmation = ref(false)
const deletingGroup = ref<Group | null>(null)
const isSubmitting = ref(false)

// Computed
const filteredGroups = computed(() => groupsStore.filteredGroups)

const groupFormFields = computed(() => [
  {
    name: 'name',
    label: 'Group Name',
    type: 'text' as const,
    required: true,
    placeholder: 'Enter group name'
  },
  {
    name: 'year',
    label: 'Year Level',
    type: 'number' as const,
    required: true,
    placeholder: 'Year level (1-12)',
    min: 1,
    max: 12
  },
  {
    name: 'studentCount',
    label: 'Student Count',
    type: 'number' as const,
    required: true,
    placeholder: 'Number of students',
    min: 1,
    max: 100
  }
])

// Methods
const loadGroups = async () => {
  try {
    await groupsStore.loadGroups()
  } catch (error) {
    console.error('Failed to load groups:', error)
  }
}

const editGroup = (group: Group) => {
  editingGroup.value = { ...group }
  showCreateForm.value = false
}

const deleteGroup = (groupId: string) => {
  const group = groupsStore.getGroupById(groupId)
  if (group) {
    deletingGroup.value = group
    showDeleteConfirmation.value = true
  }
}

const handleSubmit = async (formData: any) => {
  isSubmitting.value = true
  
  try {
    if (editingGroup.value) {
      await groupsStore.updateGroup({ ...editingGroup.value, ...formData })
    } else {
      await groupsStore.createGroup(formData)
    }
    closeForm()
  } catch (error: any) {
    console.error('Failed to save group:', error)
    // Handle error (could emit to parent or show notification)
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async () => {
  if (!deletingGroup.value) return
  
  isSubmitting.value = true
  
  try {
    await groupsStore.deleteGroup(deletingGroup.value.id)
    showDeleteConfirmation.value = false
    deletingGroup.value = null
  } catch (error: any) {
    console.error('Failed to delete group:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleBulkDelete = async () => {
  if (groupsStore.selectedIds.length === 0) return
  
  const confirmed = confirm(`Delete ${groupsStore.selectedIds.length} selected groups? This action cannot be undone.`)
  if (!confirmed) return
  
  try {
    await groupsStore.bulkDelete(groupsStore.selectedIds)
    groupsStore.clearSelection()
  } catch (error: any) {
    console.error('Failed to delete groups:', error)
  }
}

const closeForm = () => {
  showCreateForm.value = false
  editingGroup.value = null
}

// Lifecycle
onMounted(async () => {
  await loadGroups()
})
</script>

<style scoped>
.group-manager {
  @apply space-y-6;
}

.group-manager__header {
  @apply flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4;
}

.group-manager__title-section {
  @apply flex items-center gap-3;
}

.group-manager__title {
  @apply text-2xl font-bold text-gray-900;
}

.group-manager__count {
  @apply text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded;
}

.group-manager__actions {
  @apply flex flex-col sm:flex-row items-stretch sm:items-center gap-3;
}

.group-manager__search {
  @apply relative;
}

.group-manager__search-input {
  @apply w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.group-manager__bulk-actions {
  @apply flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg;
}

.group-manager__selected-count {
  @apply text-sm text-blue-700 font-medium;
}

.group-manager__bulk-button {
  @apply px-3 py-1 text-sm font-medium rounded transition-colors;
}

.group-manager__bulk-button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.group-manager__create-button {
  @apply px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.group-manager__content {
  @apply min-h-64;
}

.group-manager__loading,
.group-manager__error,
.group-manager__empty {
  @apply flex flex-col items-center justify-center py-12 text-gray-500;
}

.group-manager__spinner {
  @apply w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.group-manager__retry-button {
  @apply mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors;
}

.group-manager__grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.group-manager__card {
  @apply bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.group-manager__card--selected {
  @apply ring-2 ring-blue-500 border-blue-500;
}

.group-manager__card-header {
  @apply flex items-start gap-3 mb-4;
}

.group-manager__checkbox {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
}

.group-manager__card-title {
  @apply flex-1 font-semibold text-gray-900;
}

.group-manager__card-actions {
  @apply flex gap-2;
}

.group-manager__action-button {
  @apply px-2 py-1 text-xs font-medium rounded transition-colors;
}

.group-manager__action-button {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.group-manager__action-button--danger {
  @apply bg-red-100 text-red-700 hover:bg-red-200;
}

.group-manager__card-content {
  @apply space-y-3;
}

.group-manager__card-field {
  @apply flex flex-col gap-1;
}

.group-manager__card-label {
  @apply text-xs font-medium text-gray-500 uppercase tracking-wide;
}

.group-manager__card-value {
  @apply text-sm text-gray-900;
}

.group-manager__card-empty {
  @apply text-sm text-gray-400 italic;
}

.group-manager__modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4;
}

.group-manager__form-container {
  @apply w-full max-w-2xl max-h-[90vh] overflow-y-auto;
}

.group-manager__confirmation-container {
  @apply bg-white rounded-lg p-6 max-w-md w-full;
}

.group-manager__confirmation-title {
  @apply text-lg font-semibold text-gray-900 mb-4;
}

.group-manager__confirmation-message {
  @apply text-gray-700 mb-6;
}

.group-manager__confirmation-actions {
  @apply flex gap-3;
}

.group-manager__button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.group-manager__button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.group-manager__button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}
</style>