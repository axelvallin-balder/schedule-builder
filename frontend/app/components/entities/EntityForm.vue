<template>
  <div
    class="entity-form"
    :data-testid="'entity-form'"
    :role="'form'"
    :aria-label="`${editingMode ? 'Edit' : 'Create'} ${entityType}`"
  >
    <!-- Header -->
    <div class="entity-form__header">
      <h2 class="entity-form__title">
        {{ editingMode ? `Edit ${entityType}` : `Create New ${entityType}` }}
      </h2>
      <button
        v-if="showCloseButton"
        type="button"
        class="entity-form__close-button"
        :data-testid="'close-button'"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>

    <!-- Form -->
    <form 
      class="entity-form__form"
      @submit.prevent="handleSubmit"
    >
      <!-- Dynamic Form Fields -->
      <div
        v-for="field in formFields"
        :key="field.name"
        class="entity-form__field"
      >
        <!-- Text Input -->
        <template v-if="field.type === 'text' || field.type === 'email'">
          <label 
            :for="`field-${field.name}`"
            class="entity-form__label"
          >
            {{ field.label }}
            <span v-if="field.required" class="entity-form__required">*</span>
          </label>
          <input
            :id="`field-${field.name}`"
            v-model="formData[field.name]"
            :type="field.type"
            :placeholder="field.placeholder"
            :class="[
              'entity-form__input',
              { 'entity-form__input--error': validationErrors[field.name] }
            ]"
            :data-testid="`field-${field.name}`"
            :required="field.required"
          >
        </template>

        <!-- Number Input -->
        <template v-else-if="field.type === 'number'">
          <label 
            :for="`field-${field.name}`"
            class="entity-form__label"
          >
            {{ field.label }}
            <span v-if="field.required" class="entity-form__required">*</span>
          </label>
          <input
            :id="`field-${field.name}`"
            v-model.number="formData[field.name]"
            type="number"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            :placeholder="field.placeholder"
            :class="[
              'entity-form__input',
              { 'entity-form__input--error': validationErrors[field.name] }
            ]"
            :data-testid="`field-${field.name}`"
            :required="field.required"
          >
        </template>

        <!-- Select Input -->
        <template v-else-if="field.type === 'select'">
          <label 
            :for="`field-${field.name}`"
            class="entity-form__label"
          >
            {{ field.label }}
            <span v-if="field.required" class="entity-form__required">*</span>
          </label>
          <select
            :id="`field-${field.name}`"
            v-model="formData[field.name]"
            :class="[
              'entity-form__select',
              { 'entity-form__select--error': validationErrors[field.name] }
            ]"
            :data-testid="`field-${field.name}`"
            :required="field.required"
          >
            <option value="">{{ field.placeholder || `Select ${field.label.toLowerCase()}...` }}</option>
            <option
              v-for="option in field.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </template>

        <!-- Multi-Select -->
        <template v-else-if="field.type === 'multi-select'">
          <label 
            :for="`field-${field.name}`"
            class="entity-form__label"
          >
            {{ field.label }}
            <span v-if="field.required" class="entity-form__required">*</span>
          </label>
          <div class="entity-form__multi-select">
            <div
              v-for="option in field.options"
              :key="option.value"
              class="entity-form__checkbox-item"
            >
              <input
                :id="`${field.name}-${option.value}`"
                v-model="formData[field.name]"
                type="checkbox"
                :value="option.value"
                class="entity-form__checkbox"
                :data-testid="`${field.name}-${option.value}`"
              >
              <label
                :for="`${field.name}-${option.value}`"
                class="entity-form__checkbox-label"
              >
                {{ option.label }}
              </label>
            </div>
          </div>
        </template>

        <!-- Textarea -->
        <template v-else-if="field.type === 'textarea'">
          <label 
            :for="`field-${field.name}`"
            class="entity-form__label"
          >
            {{ field.label }}
            <span v-if="field.required" class="entity-form__required">*</span>
          </label>
          <textarea
            :id="`field-${field.name}`"
            v-model="formData[field.name]"
            :placeholder="field.placeholder"
            :rows="field.rows || 3"
            :class="[
              'entity-form__textarea',
              { 'entity-form__textarea--error': validationErrors[field.name] }
            ]"
            :data-testid="`field-${field.name}`"
            :required="field.required"
          />
        </template>

        <!-- Validation Error -->
        <div
          v-if="validationErrors[field.name]"
          class="entity-form__error"
          :data-testid="`error-${field.name}`"
        >
          {{ validationErrors[field.name] }}
        </div>
      </div>

      <!-- Form Actions -->
      <div class="entity-form__actions">
        <button
          v-if="showCancelButton"
          type="button"
          class="entity-form__button entity-form__button--secondary"
          :data-testid="'cancel-button'"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        
        <button
          type="submit"
          class="entity-form__button entity-form__button--primary"
          :class="{ 'entity-form__button--loading': isSubmitting }"
          :data-testid="'submit-button'"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Saving...' : (editingMode ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>

    <!-- Global Form Error -->
    <div
      v-if="globalError"
      class="entity-form__global-error"
      :data-testid="'global-error'"
    >
      {{ globalError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

// Props
interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'number' | 'select' | 'multi-select' | 'textarea'
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  rows?: number
  options?: Array<{ value: any; label: string }>
}

interface Props {
  entityType: string
  formFields: FormField[]
  initialData?: Record<string, any>
  showCloseButton?: boolean
  showCancelButton?: boolean
  isSubmitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({}),
  showCloseButton: true,
  showCancelButton: true,
  isSubmitting: false
})

// Emits
interface Emits {
  submit: [data: Record<string, any>]
  cancel: []
  close: []
}

const emit = defineEmits<Emits>()

// State
const formData = ref<Record<string, any>>({})
const validationErrors = ref<Record<string, string>>({})
const globalError = ref<string>('')

// Computed
const editingMode = computed(() => {
  return props.initialData && Object.keys(props.initialData).length > 0
})

// Methods
const initializeFormData = () => {
  const data: Record<string, any> = {}
  
  props.formFields.forEach(field => {
    if (field.type === 'multi-select') {
      data[field.name] = props.initialData?.[field.name] || []
    } else {
      data[field.name] = props.initialData?.[field.name] || ''
    }
  })
  
  formData.value = data
}

const validateForm = (): boolean => {
  const errors: Record<string, string> = {}
  
  props.formFields.forEach(field => {
    if (field.required) {
      const value = formData.value[field.name]
      
      if (field.type === 'multi-select') {
        if (!value || !Array.isArray(value) || value.length === 0) {
          errors[field.name] = `${field.label} is required`
        }
      } else {
        if (!value || value.toString().trim() === '') {
          errors[field.name] = `${field.label} is required`
        }
      }
    }
    
    // Number validation
    if (field.type === 'number' && formData.value[field.name] !== '') {
      const numValue = Number(formData.value[field.name])
      if (isNaN(numValue)) {
        errors[field.name] = `${field.label} must be a valid number`
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors[field.name] = `${field.label} must be at least ${field.min}`
        }
        if (field.max !== undefined && numValue > field.max) {
          errors[field.name] = `${field.label} must be at most ${field.max}`
        }
      }
    }
  })
  
  validationErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleSubmit = () => {
  globalError.value = ''
  
  if (validateForm()) {
    emit('submit', { ...formData.value })
  }
}

const clearErrors = () => {
  validationErrors.value = {}
  globalError.value = ''
}

// Watchers
watch(() => props.initialData, () => {
  initializeFormData()
  clearErrors()
}, { deep: true, immediate: true })

// Lifecycle
onMounted(() => {
  initializeFormData()
})

// Expose methods for parent components
defineExpose({
  setGlobalError: (error: string) => {
    globalError.value = error
  },
  clearErrors,
  resetForm: initializeFormData
})
</script>

<style scoped>
.entity-form {
  @apply bg-white rounded-lg shadow-md;
}

.entity-form__header {
  @apply flex justify-between items-center p-6 border-b border-gray-200;
}

.entity-form__title {
  @apply text-xl font-semibold text-gray-900;
}

.entity-form__close-button {
  @apply w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors;
}

.entity-form__form {
  @apply p-6;
}

.entity-form__field {
  @apply mb-4;
}

.entity-form__label {
  @apply block text-sm font-medium text-gray-700 mb-2;
}

.entity-form__required {
  @apply text-red-500;
}

.entity-form__input,
.entity-form__select,
.entity-form__textarea {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors;
}

.entity-form__input--error,
.entity-form__select--error,
.entity-form__textarea--error {
  @apply border-red-500 focus:ring-red-500 focus:border-red-500;
}

.entity-form__multi-select {
  @apply space-y-2;
}

.entity-form__checkbox-item {
  @apply flex items-center;
}

.entity-form__checkbox {
  @apply h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded;
}

.entity-form__checkbox-label {
  @apply ml-2 text-sm text-gray-700;
}

.entity-form__error {
  @apply text-sm text-red-600 mt-1;
}

.entity-form__actions {
  @apply flex gap-3 pt-4 border-t border-gray-200;
}

.entity-form__button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.entity-form__button--primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed;
}

.entity-form__button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500;
}

.entity-form__button--loading {
  @apply opacity-75 cursor-not-allowed;
}

.entity-form__global-error {
  @apply p-4 mx-6 mb-6 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700;
}
</style>