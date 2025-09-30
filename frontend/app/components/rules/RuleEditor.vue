<template>
  <div
    class="rule-editor"
    :data-testid="'rule-editor'"
    :role="'region'"
    :aria-label="'Rule Editor'"
  >
    <!-- Header -->
    <div class="rule-editor__header">
      <h2 class="rule-editor__title">Schedule Rules</h2>
      <button
        type="button"
        class="rule-editor__add-button"
        :data-testid="'add-rule-button'"
        @click="showRuleForm = true"
      >
        Add Rule
      </button>
    </div>
    
    <!-- Rules List -->
    <div
      class="rule-editor__list"
      :data-testid="'rule-list'"
      :tabindex="0"
      @keydown="handleListKeyDown"
    >
      <div
        v-for="(rule, index) in rules"
        :key="rule.id"
        class="rule-editor__item"
        :class="{
          'rule-editor__item--disabled': !rule.enabled,
          'rule-editor__item--constraint': rule.type === 'constraint',
          'rule-editor__item--preference': rule.type === 'preference'
        }"
        :data-testid="'rule-item'"
      >
        <!-- Rule Header -->
        <div class="rule-editor__item-header">
          <div class="rule-editor__item-info">
            <h3 class="rule-editor__item-name">{{ rule.name }}</h3>
            <span
              class="rule-editor__item-type"
              :class="{
                'rule-editor__item-type--constraint': rule.type === 'constraint',
                'rule-editor__item-type--preference': rule.type === 'preference'
              }"
            >
              {{ rule.type }}
            </span>
            <div
              class="rule-editor__priority"
              :data-testid="'priority-indicator'"
            >
              Priority: {{ rule.priority }}
            </div>
          </div>
          
          <div class="rule-editor__item-actions">
            <!-- Toggle button -->
            <button
              type="button"
              class="rule-editor__toggle"
              :class="{
                'rule-editor__toggle--enabled': rule.enabled,
                'rule-editor__toggle--disabled': !rule.enabled
              }"
              :data-testid="'rule-toggle'"
              :aria-label="`${rule.enabled ? 'Disable' : 'Enable'} rule ${rule.name}`"
              @click="toggleRule(rule.id)"
            >
              {{ rule.enabled ? 'Enabled' : 'Disabled' }}
            </button>
            
            <!-- Edit button -->
            <button
              type="button"
              class="rule-editor__edit-button"
              :data-testid="'edit-rule-button'"
              @click="editRule(rule)"
            >
              Edit
            </button>
            
            <!-- Delete button -->
            <button
              type="button"
              class="rule-editor__delete-button"
              :data-testid="'delete-rule-button'"
              @click="deleteRule(rule.id)"
            >
              Delete
            </button>
          </div>
        </div>
        
        <!-- Rule Description -->
        <p class="rule-editor__item-description">{{ rule.description }}</p>
        
        <!-- Rule Conditions -->
        <div class="rule-editor__conditions">
          <div
            v-for="(condition, conditionIndex) in rule.conditions"
            :key="conditionIndex"
            class="rule-editor__condition"
            :data-testid="'rule-condition'"
          >
            <span class="rule-editor__condition-field">{{ condition.field }}</span>
            <span class="rule-editor__condition-operator">{{ condition.operator }}</span>
            <span class="rule-editor__condition-value">{{ condition.value }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Rule Form Modal -->
    <div
      v-if="showRuleForm"
      class="rule-editor__modal"
      @click.self="closeRuleForm"
    >
      <div
        class="rule-editor__form-container"
        :data-testid="'rule-form'"
      >
        <h3 class="rule-editor__form-title">
          {{ editingRule ? 'Edit Rule' : 'Create New Rule' }}
        </h3>
        
        <!-- Form Fields -->
        <form @submit.prevent="saveRule">
          <!-- Rule Name -->
          <div class="rule-editor__form-field">
            <label for="rule-name" class="rule-editor__form-label">Rule Name</label>
            <input
              id="rule-name"
              v-model="formData.name"
              type="text"
              class="rule-editor__form-input"
              :class="{ 'rule-editor__form-input--error': validationErrors.name }"
              :data-testid="'rule-name'"
              required
            >
            <div
              v-if="validationErrors.name"
              class="rule-editor__form-error"
              :data-testid="'validation-error'"
            >
              {{ validationErrors.name }}
            </div>
          </div>
          
          <!-- Rule Type -->
          <div class="rule-editor__form-field">
            <label for="rule-type" class="rule-editor__form-label">Rule Type</label>
            <select
              id="rule-type"
              v-model="formData.type"
              class="rule-editor__form-select"
              :data-testid="'rule-type'"
              required
            >
              <option value="">Select type...</option>
              <option value="constraint">Constraint</option>
              <option value="preference">Preference</option>
            </select>
          </div>
          
          <!-- Rule Description -->
          <div class="rule-editor__form-field">
            <label for="rule-description" class="rule-editor__form-label">Description</label>
            <textarea
              id="rule-description"
              v-model="formData.description"
              class="rule-editor__form-textarea"
              :data-testid="'rule-description'"
              rows="3"
              required
            />
          </div>
          
          <!-- Priority -->
          <div class="rule-editor__form-field">
            <label for="rule-priority" class="rule-editor__form-label">Priority (1-10)</label>
            <input
              id="rule-priority"
              v-model.number="formData.priority"
              type="number"
              min="1"
              max="10"
              class="rule-editor__form-input"
              :data-testid="'rule-priority'"
              required
            >
          </div>
          
          <!-- Conditions -->
          <div class="rule-editor__form-field">
            <label class="rule-editor__form-label">Conditions</label>
            <div
              v-for="(condition, index) in formData.conditions"
              :key="index"
              class="rule-editor__condition-form"
            >
              <select
                v-model="condition.field"
                class="rule-editor__form-select"
                :data-testid="'condition-field'"
                required
              >
                <option value="">Select field...</option>
                <option value="lessonsPerDay">Lessons per day</option>
                <option value="teacherAvailable">Teacher available</option>
                <option value="subject">Subject</option>
                <option value="timeSlot">Time slot</option>
              </select>
              
              <select
                v-model="condition.operator"
                class="rule-editor__form-select"
                :data-testid="'condition-operator'"
                required
              >
                <option value="">Select operator...</option>
                <option value="equals">equals</option>
                <option value="not_equals">not equals</option>
                <option value="contains">contains</option>
                <option value="not_contains">not contains</option>
                <option value="greater_than">greater than</option>
                <option value="less_than">less than</option>
              </select>
              
              <input
                v-model="condition.value"
                type="text"
                class="rule-editor__form-input"
                :data-testid="'condition-value'"
                placeholder="Value"
                required
              >
              
              <button
                type="button"
                class="rule-editor__remove-condition"
                @click="removeCondition(index)"
              >
                Remove
              </button>
            </div>
            
            <button
              type="button"
              class="rule-editor__add-condition"
              :data-testid="'add-condition-button'"
              @click="addCondition"
            >
              Add Condition
            </button>
            
            <div
              v-if="validationErrors.conditions"
              class="rule-editor__form-error"
              :data-testid="'condition-error'"
            >
              {{ validationErrors.conditions }}
            </div>
          </div>
          
          <!-- Form Actions -->
          <div class="rule-editor__form-actions">
            <button
              type="button"
              class="rule-editor__form-button rule-editor__form-button--secondary"
              :data-testid="'preview-rule-button'"
              @click="previewRule"
            >
              Preview
            </button>
            
            <button
              type="button"
              class="rule-editor__form-button rule-editor__form-button--secondary"
              :data-testid="'check-conflicts-button'"
              @click="checkConflicts"
            >
              Check Conflicts
            </button>
            
            <button
              type="button"
              class="rule-editor__form-button rule-editor__form-button--secondary"
              @click="closeRuleForm"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              class="rule-editor__form-button rule-editor__form-button--primary"
              :data-testid="'save-rule-button'"
              :disabled="!isFormValid"
            >
              {{ editingRule ? 'Update' : 'Create' }} Rule
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Rule Preview -->
    <div
      v-if="showPreview"
      class="rule-editor__preview"
      :data-testid="'rule-preview'"
    >
      <h4>Rule Preview</h4>
      <p>{{ previewText }}</p>
    </div>
    
    <!-- Conflicts Display -->
    <div
      v-if="conflicts.length > 0"
      class="rule-editor__conflicts"
    >
      <h4>Rule Conflicts</h4>
      <div
        v-for="conflict in conflicts"
        :key="conflict.id"
        class="rule-editor__conflict"
        :data-testid="'rule-conflict'"
      >
        Conflicts with: {{ conflict.name }}
      </div>
    </div>
    
    <!-- Confirmation Dialog -->
    <div
      v-if="showConfirmation"
      class="rule-editor__confirmation"
      :data-testid="'confirmation-dialog'"
    >
      <div class="rule-editor__confirmation-content">
        <h4>Confirm Deletion</h4>
        <p>Are you sure you want to delete this rule? This action cannot be undone.</p>
        <div class="rule-editor__confirmation-actions">
          <button
            type="button"
            class="rule-editor__form-button rule-editor__form-button--secondary"
            @click="cancelDelete"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rule-editor__form-button rule-editor__form-button--danger"
            :data-testid="'confirm-delete'"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'

// Types
interface Rule {
  id: string
  name: string
  type: 'constraint' | 'preference'
  description: string
  priority: number
  conditions: RuleCondition[]
  enabled: boolean
}

interface RuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
  value: string | number | boolean
}

// Props
const props = defineProps<{
  rules: Rule[]
}>()

// Emits
const emit = defineEmits<{
  'rule-created': [rule: Omit<Rule, 'id'>]
  'rule-updated': [rule: Rule]
  'rule-deleted': [ruleId: string]
  'rule-toggled': [ruleId: string, enabled: boolean]
  navigate: [direction: string]
}>()

// Reactive state
const showRuleForm = ref(false)
const editingRule = ref<Rule | null>(null)
const showPreview = ref(false)
const showConfirmation = ref(false)
const deletingRuleId = ref<string | null>(null)
const conflicts = ref<Rule[]>([])
const previewText = ref('')

const formData = reactive({
  name: '',
  type: '' as 'constraint' | 'preference' | '',
  description: '',
  priority: 5,
  conditions: [] as RuleCondition[]
})

const validationErrors = reactive({
  name: '',
  conditions: ''
})

// Computed properties
const isFormValid = computed(() => {
  return formData.name.trim() !== '' &&
         formData.type !== '' &&
         formData.description.trim() !== '' &&
         formData.conditions.length > 0 &&
         formData.conditions.every(c => c.field && c.operator && c.value !== '')
})

// Methods
const resetForm = () => {
  formData.name = ''
  formData.type = ''
  formData.description = ''
  formData.priority = 5
  formData.conditions = []
  validationErrors.name = ''
  validationErrors.conditions = ''
}

const validateForm = () => {
  validationErrors.name = ''
  validationErrors.conditions = ''
  
  if (!formData.name.trim()) {
    validationErrors.name = 'Rule name is required'
  }
  
  if (formData.conditions.length === 0) {
    validationErrors.conditions = 'At least one condition is required'
  }
  
  // Check for invalid operators
  const invalidCondition = formData.conditions.find(c => 
    !['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than'].includes(c.operator)
  )
  
  if (invalidCondition) {
    validationErrors.conditions = 'Invalid operator selected'
  }
  
  return Object.values(validationErrors).every(error => error === '')
}

const addCondition = () => {
  formData.conditions.push({
    field: '',
    operator: 'equals',
    value: ''
  })
}

const removeCondition = (index: number) => {
  formData.conditions.splice(index, 1)
}

const editRule = (rule: Rule) => {
  editingRule.value = rule
  formData.name = rule.name
  formData.type = rule.type
  formData.description = rule.description
  formData.priority = rule.priority
  formData.conditions = [...rule.conditions]
  showRuleForm.value = true
}

const saveRule = () => {
  if (!validateForm()) return
  
  const ruleData = {
    name: formData.name.trim(),
    type: formData.type as 'constraint' | 'preference',
    description: formData.description.trim(),
    priority: formData.priority,
    conditions: [...formData.conditions],
    enabled: true
  }
  
  if (editingRule.value) {
    emit('rule-updated', { ...ruleData, id: editingRule.value.id })
  } else {
    emit('rule-created', ruleData)
  }
  
  closeRuleForm()
}

const closeRuleForm = () => {
  showRuleForm.value = false
  editingRule.value = null
  resetForm()
  showPreview.value = false
  conflicts.value = []
}

const toggleRule = (ruleId: string) => {
  const rule = props.rules.find(r => r.id === ruleId)
  if (rule) {
    emit('rule-toggled', ruleId, !rule.enabled)
  }
}

const deleteRule = (ruleId: string) => {
  deletingRuleId.value = ruleId
  showConfirmation.value = true
}

const confirmDelete = () => {
  if (deletingRuleId.value) {
    emit('rule-deleted', deletingRuleId.value)
  }
  cancelDelete()
}

const cancelDelete = () => {
  deletingRuleId.value = null
  showConfirmation.value = false
}

const previewRule = () => {
  previewText.value = `Rule "${formData.name}" will ${formData.type === 'constraint' ? 'prevent' : 'prefer'} schedules where ${formData.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' and ')}`
  showPreview.value = true
}

const checkConflicts = () => {
  // Simple conflict detection - in real implementation this would be more sophisticated
  conflicts.value = props.rules.filter(rule => 
    rule.type === formData.type && 
    rule.priority === formData.priority &&
    rule.name !== formData.name
  )
}

const handleListKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      emit('navigate', 'down')
      break
    case 'ArrowUp':
      emit('navigate', 'up')
      break
  }
}
</script>

<style scoped>
.rule-editor {
  @apply max-w-4xl mx-auto p-6;
}

.rule-editor__header {
  @apply flex justify-between items-center mb-6;
}

.rule-editor__title {
  @apply text-2xl font-bold text-gray-900;
}

.rule-editor__add-button {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors;
}

.rule-editor__list {
  @apply space-y-4;
}

.rule-editor__item {
  @apply bg-white border border-gray-200 rounded-lg p-4 shadow-sm;
}

.rule-editor__item--disabled {
  @apply opacity-60 bg-gray-50;
}

.rule-editor__item--constraint {
  @apply border-l-4 border-l-red-500;
}

.rule-editor__item--preference {
  @apply border-l-4 border-l-green-500;
}

.rule-editor__item-header {
  @apply flex justify-between items-start mb-3;
}

.rule-editor__item-info {
  @apply flex-1;
}

.rule-editor__item-name {
  @apply text-lg font-semibold text-gray-900 mb-1;
}

.rule-editor__item-type {
  @apply inline-block px-2 py-1 text-xs font-medium rounded-full;
}

.rule-editor__item-type--constraint {
  @apply bg-red-100 text-red-800;
}

.rule-editor__item-type--preference {
  @apply bg-green-100 text-green-800;
}

.rule-editor__priority {
  @apply text-sm text-gray-600 mt-1;
}

.rule-editor__item-actions {
  @apply flex gap-2;
}

.rule-editor__toggle {
  @apply px-3 py-1 text-sm rounded-lg transition-colors;
}

.rule-editor__toggle--enabled {
  @apply bg-green-100 text-green-800;
}

.rule-editor__toggle--disabled {
  @apply bg-gray-100 text-gray-600;
}

.rule-editor__edit-button,
.rule-editor__delete-button {
  @apply px-3 py-1 text-sm rounded-lg transition-colors;
}

.rule-editor__edit-button {
  @apply bg-blue-100 text-blue-800 hover:bg-blue-200;
}

.rule-editor__delete-button {
  @apply bg-red-100 text-red-800 hover:bg-red-200;
}

.rule-editor__item-description {
  @apply text-gray-700 mb-3;
}

.rule-editor__conditions {
  @apply space-y-2;
}

.rule-editor__condition {
  @apply flex gap-2 text-sm bg-gray-50 p-2 rounded;
}

.rule-editor__condition-field {
  @apply font-medium text-gray-900;
}

.rule-editor__condition-operator {
  @apply text-blue-600;
}

.rule-editor__condition-value {
  @apply text-gray-700;
}

.rule-editor__modal {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.rule-editor__form-container {
  @apply bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto;
}

.rule-editor__form-title {
  @apply text-xl font-bold text-gray-900 mb-4;
}

.rule-editor__form-field {
  @apply mb-4;
}

.rule-editor__form-label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.rule-editor__form-input,
.rule-editor__form-select,
.rule-editor__form-textarea {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.rule-editor__form-input--error {
  @apply border-red-500 focus:ring-red-500 focus:border-red-500;
}

.rule-editor__form-error {
  @apply text-sm text-red-600 mt-1;
}

.rule-editor__condition-form {
  @apply flex gap-2 mb-2;
}

.rule-editor__add-condition,
.rule-editor__remove-condition {
  @apply px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors;
}

.rule-editor__form-actions {
  @apply flex gap-2 pt-4 border-t;
}

.rule-editor__form-button {
  @apply px-4 py-2 text-sm font-medium rounded-lg transition-colors;
}

.rule-editor__form-button--primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed;
}

.rule-editor__form-button--secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.rule-editor__form-button--danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.rule-editor__preview,
.rule-editor__conflicts {
  @apply mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg;
}

.rule-editor__conflict {
  @apply text-sm text-red-700 mb-1;
}

.rule-editor__confirmation {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.rule-editor__confirmation-content {
  @apply bg-white rounded-lg p-6 max-w-md w-full;
}

.rule-editor__confirmation-actions {
  @apply flex gap-2 mt-4;
}
</style>