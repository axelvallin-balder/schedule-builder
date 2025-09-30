<template>
  <div class="rule-management-workflow" data-testid="rule-management-workflow">
    <!-- Workflow Header -->
    <div class="workflow-header">
      <h2 class="workflow-title">Rule Management Workflow</h2>
      <div class="workflow-tabs" data-testid="workflow-tabs">
        <button 
          v-for="tab in workflowTabs" 
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
          :data-testid="`tab-${tab.id}`"
        >
          {{ tab.title }}
        </button>
      </div>
    </div>

    <!-- Rule Creation Tab -->
    <div v-if="activeTab === 'create'" class="workflow-content" data-testid="create-tab">
      <div class="rule-creation">
        <h3>Create New Rule</h3>
        
        <form @submit.prevent="createRule" class="rule-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h4>Basic Information</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="rule-name">Rule Name *</label>
                <input
                  id="rule-name"
                  v-model="newRule.name"
                  type="text"
                  required
                  data-testid="rule-name"
                  placeholder="Enter descriptive rule name"
                />
              </div>
              
              <div class="form-group">
                <label for="rule-type">Rule Type *</label>
                <select
                  id="rule-type"
                  v-model="newRule.type"
                  required
                  data-testid="rule-type"
                  @change="onRuleTypeChange"
                >
                  <option value="">Select rule type</option>
                  <option value="teacher-availability">Teacher Availability</option>
                  <option value="room-capacity">Room Capacity</option>
                  <option value="time-constraint">Time Constraint</option>
                  <option value="conflict-resolution">Conflict Resolution</option>
                  <option value="preference">Preference</option>
                  <option value="custom">Custom Logic</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="rule-description">Description</label>
              <textarea
                id="rule-description"
                v-model="newRule.description"
                data-testid="rule-description"
                placeholder="Describe what this rule does and when it applies"
                rows="3"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="rule-priority">Priority Level</label>
                <select
                  id="rule-priority"
                  v-model="newRule.priority"
                  data-testid="rule-priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="newRule.active"
                    data-testid="rule-active"
                  />
                  <span>Active by default</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Rule Conditions -->
          <div class="form-section">
            <h4>Rule Conditions</h4>
            <div class="conditions-builder" data-testid="conditions-builder">
              <div 
                v-for="(condition, index) in newRule.conditions" 
                :key="index"
                class="condition-item"
              >
                <div class="condition-row">
                  <select 
                    v-model="condition.field"
                    class="condition-field"
                    data-testid="condition-field"
                  >
                    <option value="">Select field</option>
                    <option v-for="field in availableFields" :key="field.value" :value="field.value">
                      {{ field.label }}
                    </option>
                  </select>
                  
                  <select 
                    v-model="condition.operator"
                    class="condition-operator"
                    data-testid="condition-operator"
                  >
                    <option value="">Select operator</option>
                    <option v-for="op in getOperatorsForField(condition.field)" :key="op.value" :value="op.value">
                      {{ op.label }}
                    </option>
                  </select>
                  
                  <input
                    v-model="condition.value"
                    type="text"
                    class="condition-value"
                    data-testid="condition-value"
                    placeholder="Enter value"
                  />
                  
                  <button 
                    type="button" 
                    class="btn-icon remove-condition"
                    @click="removeCondition(index)"
                    data-testid="remove-condition"
                  >
                    ×
                  </button>
                </div>
                
                <div v-if="index < newRule.conditions.length - 1" class="condition-connector">
                  <select v-model="condition.connector" data-testid="condition-connector">
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              </div>
              
              <button 
                type="button" 
                class="btn-secondary add-condition"
                @click="addCondition"
                data-testid="add-condition"
              >
                Add Condition
              </button>
            </div>
          </div>

          <!-- Rule Actions -->
          <div class="form-section">
            <h4>Rule Actions</h4>
            <div class="actions-builder" data-testid="actions-builder">
              <div 
                v-for="(action, index) in newRule.actions" 
                :key="index"
                class="action-item"
              >
                <div class="action-row">
                  <select 
                    v-model="action.type"
                    class="action-type"
                    data-testid="action-type"
                  >
                    <option value="">Select action</option>
                    <option value="block">Block</option>
                    <option value="prefer">Prefer</option>
                    <option value="avoid">Avoid</option>
                    <option value="require">Require</option>
                    <option value="notify">Notify</option>
                    <option value="score">Adjust Score</option>
                  </select>
                  
                  <input
                    v-model="action.target"
                    type="text"
                    class="action-target"
                    data-testid="action-target"
                    placeholder="Target (e.g., teacher, room, time)"
                  />
                  
                  <input
                    v-if="action.type === 'score'"
                    v-model.number="action.value"
                    type="number"
                    class="action-value"
                    data-testid="action-value"
                    placeholder="Score adjustment"
                  />
                  
                  <button 
                    type="button" 
                    class="btn-icon remove-action"
                    @click="removeAction(index)"
                    data-testid="remove-action"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <button 
                type="button" 
                class="btn-secondary add-action"
                @click="addAction"
                data-testid="add-action"
              >
                Add Action
              </button>
            </div>
          </div>

          <!-- Custom Logic (for custom rule type) -->
          <div v-if="newRule.type === 'custom'" class="form-section">
            <h4>Custom Logic</h4>
            <div class="code-editor" data-testid="custom-logic">
              <label for="custom-code">JavaScript Code</label>
              <textarea
                id="custom-code"
                v-model="newRule.customCode"
                class="code-textarea"
                data-testid="custom-code"
                placeholder="function validateRule(lesson, schedule, context) {
  // Return true if rule passes, false if violated
  // Access lesson properties: lesson.teacher, lesson.room, lesson.time
  // Access schedule data: schedule.lessons, schedule.constraints
  return true;
}"
                rows="10"
              ></textarea>
              <p class="code-help">
                Write a function that returns true/false. Available parameters: lesson, schedule, context.
              </p>
            </div>
          </div>

          <!-- Rule Testing -->
          <div class="form-section">
            <h4>Test Rule</h4>
            <div class="rule-testing" data-testid="rule-testing">
              <p>Test your rule against existing schedule data to verify it works correctly.</p>
              
              <div class="test-controls">
                <button 
                  type="button" 
                  class="btn-secondary"
                  @click="testRule"
                  :disabled="!canTestRule"
                  data-testid="test-rule"
                >
                  Run Test
                </button>
                
                <select v-model="testScheduleId" data-testid="test-schedule">
                  <option value="">Select test schedule</option>
                  <option v-for="schedule in availableSchedules" :key="schedule.id" :value="schedule.id">
                    {{ schedule.name }}
                  </option>
                </select>
              </div>
              
              <div v-if="testResults" class="test-results" data-testid="test-results">
                <h5>Test Results</h5>
                <div class="result-summary">
                  <span class="result-stat">
                    Passed: {{ testResults.passed }}
                  </span>
                  <span class="result-stat">
                    Failed: {{ testResults.failed }}
                  </span>
                  <span class="result-stat">
                    Total Lessons: {{ testResults.total }}
                  </span>
                </div>
                
                <div v-if="testResults.violations.length > 0" class="violations-list">
                  <h6>Rule Violations</h6>
                  <div 
                    v-for="(violation, index) in testResults.violations.slice(0, 5)" 
                    :key="index"
                    class="violation-item"
                  >
                    {{ violation.description }}
                  </div>
                  <p v-if="testResults.violations.length > 5" class="more-violations">
                    ... and {{ testResults.violations.length - 5 }} more violations
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="resetForm" data-testid="reset-form">
              Reset
            </button>
            <button type="submit" class="btn-primary" :disabled="!canCreateRule" data-testid="create-rule">
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Rule Library Tab -->
    <div v-if="activeTab === 'library'" class="workflow-content" data-testid="library-tab">
      <div class="rule-library">
        <div class="library-header">
          <h3>Rule Library</h3>
          <div class="library-controls">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search rules..."
              class="search-input"
              data-testid="search-rules"
            />
            <select v-model="filterType" class="filter-select" data-testid="filter-type">
              <option value="">All types</option>
              <option value="teacher-availability">Teacher Availability</option>
              <option value="room-capacity">Room Capacity</option>
              <option value="time-constraint">Time Constraint</option>
              <option value="conflict-resolution">Conflict Resolution</option>
              <option value="preference">Preference</option>
              <option value="custom">Custom</option>
            </select>
            <select v-model="filterStatus" class="filter-select" data-testid="filter-status">
              <option value="">All rules</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>
        </div>

        <div class="rules-grid" data-testid="rules-grid">
          <div 
            v-for="rule in filteredRules" 
            :key="rule.id"
            class="rule-card"
            :class="{ active: rule.active, inactive: !rule.active }"
            :data-testid="`rule-card-${rule.id}`"
          >
            <div class="rule-header">
              <h4>{{ rule.name }}</h4>
              <div class="rule-badges">
                <span :class="['badge', `priority-${rule.priority}`]">
                  {{ rule.priority }}
                </span>
                <span :class="['badge', `type-${rule.type}`]">
                  {{ rule.type }}
                </span>
              </div>
            </div>
            
            <p class="rule-description">{{ rule.description }}</p>
            
            <div class="rule-stats">
              <span class="stat">{{ rule.conditions?.length || 0 }} conditions</span>
              <span class="stat">{{ rule.actions?.length || 0 }} actions</span>
              <span class="stat">Used {{ rule.usageCount || 0 }} times</span>
            </div>
            
            <div class="rule-actions">
              <button 
                class="btn-icon" 
                @click="editRule(rule)"
                data-testid="edit-rule"
                title="Edit rule"
              >
                ✏️
              </button>
              <button 
                class="btn-icon" 
                @click="duplicateRule(rule)"
                data-testid="duplicate-rule"
                title="Duplicate rule"
              >
                📋
              </button>
              <button 
                class="btn-icon" 
                @click="toggleRuleStatus(rule)"
                :data-testid="`toggle-rule-${rule.id}`"
                :title="rule.active ? 'Deactivate rule' : 'Activate rule'"
              >
                {{ rule.active ? '⏸️' : '▶️' }}
              </button>
              <button 
                class="btn-icon delete" 
                @click="deleteRule(rule)"
                data-testid="delete-rule"
                title="Delete rule"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredRules.length === 0" class="empty-state" data-testid="empty-rules">
          <p v-if="searchQuery || filterType || filterStatus">
            No rules match your current filters.
          </p>
          <p v-else>
            No rules created yet. Use the "Create" tab to add your first rule.
          </p>
        </div>
      </div>
    </div>

    <!-- Rule Templates Tab -->
    <div v-if="activeTab === 'templates'" class="workflow-content" data-testid="templates-tab">
      <div class="rule-templates">
        <h3>Rule Templates</h3>
        <p>Start with pre-built rule templates for common scheduling scenarios.</p>
        
        <div class="templates-grid" data-testid="templates-grid">
          <div 
            v-for="template in ruleTemplates" 
            :key="template.id"
            class="template-card"
            :data-testid="`template-${template.id}`"
          >
            <div class="template-header">
              <h4>{{ template.name }}</h4>
              <span :class="['badge', `category-${template.category}`]">
                {{ template.category }}
              </span>
            </div>
            
            <p class="template-description">{{ template.description }}</p>
            
            <div class="template-preview">
              <h5>Rule Logic:</h5>
              <p class="logic-preview">{{ template.logicPreview }}</p>
            </div>
            
            <div class="template-actions">
              <button 
                class="btn-primary" 
                @click="useTemplate(template)"
                data-testid="use-template"
              >
                Use Template
              </button>
              <button 
                class="btn-secondary" 
                @click="previewTemplate(template)"
                data-testid="preview-template"
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rule Analytics Tab -->
    <div v-if="activeTab === 'analytics'" class="workflow-content" data-testid="analytics-tab">
      <div class="rule-analytics">
        <h3>Rule Analytics</h3>
        
        <div class="analytics-summary" data-testid="analytics-summary">
          <div class="summary-card">
            <h4>Total Rules</h4>
            <div class="summary-value">{{ rules.length }}</div>
          </div>
          
          <div class="summary-card">
            <h4>Active Rules</h4>
            <div class="summary-value">{{ activeRulesCount }}</div>
          </div>
          
          <div class="summary-card">
            <h4>Most Used Type</h4>
            <div class="summary-value">{{ mostUsedType }}</div>
          </div>
          
          <div class="summary-card">
            <h4>Avg. Conditions</h4>
            <div class="summary-value">{{ averageConditions }}</div>
          </div>
        </div>

        <div class="analytics-charts">
          <div class="chart-container">
            <h4>Rules by Type</h4>
            <div class="chart-placeholder" data-testid="type-chart">
              <!-- Chart would be rendered here -->
              <div v-for="type in ruleTypeStats" :key="type.name" class="chart-bar">
                <div class="bar-label">{{ type.name }}</div>
                <div class="bar" :style="{ width: `${(type.count / rules.length) * 100}%` }"></div>
                <div class="bar-value">{{ type.count }}</div>
              </div>
            </div>
          </div>
          
          <div class="chart-container">
            <h4>Rule Usage Over Time</h4>
            <div class="chart-placeholder" data-testid="usage-chart">
              <!-- Usage trend chart would be rendered here -->
              <p class="chart-note">Usage tracking data will appear here after rules are applied to schedules.</p>
            </div>
          </div>
        </div>

        <div class="performance-analysis" data-testid="performance-analysis">
          <h4>Rule Performance Analysis</h4>
          <div class="performance-table">
            <table>
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Violation Rate</th>
                  <th>Avg. Execution Time</th>
                  <th>Impact Score</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="perf in rulePerformance" :key="perf.ruleId">
                  <td>{{ perf.ruleName }}</td>
                  <td>{{ perf.violationRate }}%</td>
                  <td>{{ perf.executionTime }}ms</td>
                  <td>{{ perf.impactScore }}/10</td>
                  <td :class="perf.recommendation.type">{{ perf.recommendation.text }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Preview Modal -->
    <div v-if="showTemplatePreview" class="modal-overlay" @click="closeTemplatePreview">
      <div class="modal-content" @click.stop data-testid="template-preview-modal">
        <div class="modal-header">
          <h3>Template Preview: {{ selectedTemplate?.name }}</h3>
          <button class="btn-icon" @click="closeTemplatePreview">×</button>
        </div>
        
        <div class="modal-body">
          <div class="template-details">
            <p><strong>Category:</strong> {{ selectedTemplate?.category }}</p>
            <p><strong>Description:</strong> {{ selectedTemplate?.description }}</p>
          </div>
          
          <div class="template-conditions">
            <h4>Conditions</h4>
            <div 
              v-for="(condition, index) in selectedTemplate?.conditions" 
              :key="index"
              class="condition-preview"
            >
              {{ condition.field }} {{ condition.operator }} {{ condition.value }}
            </div>
          </div>
          
          <div class="template-actions-preview">
            <h4>Actions</h4>
            <div 
              v-for="(action, index) in selectedTemplate?.actions" 
              :key="index"
              class="action-preview"
            >
              {{ action.type }} {{ action.target }} {{ action.value || '' }}
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeTemplatePreview">Cancel</button>
          <button class="btn-primary" @click="useSelectedTemplate">Use This Template</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRuleStore } from '~/stores/rules'
import { useScheduleStore } from '~/stores/schedule'

// Store instances
const ruleStore = useRuleStore()
const scheduleStore = useScheduleStore()

// Tab state
const activeTab = ref('create')
const workflowTabs = [
  { id: 'create', title: 'Create Rule' },
  { id: 'library', title: 'Rule Library' },
  { id: 'templates', title: 'Templates' },
  { id: 'analytics', title: 'Analytics' }
]

// New rule state
const newRule = ref({
  name: '',
  type: '',
  description: '',
  priority: 'medium',
  active: true,
  conditions: [],
  actions: [],
  customCode: ''
})

// Library state
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')

// Testing state
const testScheduleId = ref('')
const testResults = ref(null)

// Template state
const showTemplatePreview = ref(false)
const selectedTemplate = ref(null)

// Available fields for conditions
const availableFields = [
  { value: 'teacher.id', label: 'Teacher' },
  { value: 'room.id', label: 'Room' },
  { value: 'time.dayOfWeek', label: 'Day of Week' },
  { value: 'time.startTime', label: 'Start Time' },
  { value: 'time.endTime', label: 'End Time' },
  { value: 'course.subject', label: 'Subject' },
  { value: 'course.weeklyHours', label: 'Weekly Hours' },
  { value: 'group.size', label: 'Group Size' },
  { value: 'room.capacity', label: 'Room Capacity' }
]

// Rule templates
const ruleTemplates = [
  {
    id: 'teacher-availability',
    name: 'Teacher Availability',
    category: 'availability',
    description: 'Prevent scheduling lessons when teacher is not available',
    logicPreview: 'IF teacher.availability[day][time] = false THEN block lesson',
    conditions: [
      { field: 'teacher.availability', operator: 'equals', value: 'false' }
    ],
    actions: [
      { type: 'block', target: 'lesson' }
    ]
  },
  {
    id: 'room-capacity',
    name: 'Room Capacity Check',
    category: 'capacity',
    description: 'Ensure group size does not exceed room capacity',
    logicPreview: 'IF group.size > room.capacity THEN block lesson',
    conditions: [
      { field: 'group.size', operator: 'greater', value: 'room.capacity' }
    ],
    actions: [
      { type: 'block', target: 'lesson' }
    ]
  },
  {
    id: 'lunch-break',
    name: 'Lunch Break Protection',
    category: 'timing',
    description: 'Protect lunch break time from scheduling',
    logicPreview: 'IF time between 12:00-13:00 THEN prefer avoid',
    conditions: [
      { field: 'time.startTime', operator: 'between', value: '12:00,13:00' }
    ],
    actions: [
      { type: 'avoid', target: 'timeslot', value: -10 }
    ]
  }
]

// Computed properties
const rules = computed(() => ruleStore.rules)
const availableSchedules = computed(() => scheduleStore.schedules)

const filteredRules = computed(() => {
  let filtered = rules.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(rule => 
      rule.name.toLowerCase().includes(query) ||
      rule.description?.toLowerCase().includes(query)
    )
  }

  if (filterType.value) {
    filtered = filtered.filter(rule => rule.type === filterType.value)
  }

  if (filterStatus.value === 'active') {
    filtered = filtered.filter(rule => rule.active)
  } else if (filterStatus.value === 'inactive') {
    filtered = filtered.filter(rule => !rule.active)
  }

  return filtered
})

const activeRulesCount = computed(() => 
  rules.value.filter(rule => rule.active).length
)

const mostUsedType = computed(() => {
  const typeCounts = {}
  rules.value.forEach(rule => {
    typeCounts[rule.type] = (typeCounts[rule.type] || 0) + 1
  })
  
  return Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
})

const averageConditions = computed(() => {
  if (rules.value.length === 0) return 0
  const total = rules.value.reduce((sum, rule) => sum + (rule.conditions?.length || 0), 0)
  return (total / rules.value.length).toFixed(1)
})

const ruleTypeStats = computed(() => {
  const stats = {}
  rules.value.forEach(rule => {
    stats[rule.type] = (stats[rule.type] || 0) + 1
  })
  
  return Object.entries(stats).map(([name, count]) => ({ name, count }))
})

const rulePerformance = computed(() => {
  // Mock performance data - in real app this would come from analytics
  return rules.value.map(rule => ({
    ruleId: rule.id,
    ruleName: rule.name,
    violationRate: Math.floor(Math.random() * 20),
    executionTime: Math.floor(Math.random() * 10) + 1,
    impactScore: Math.floor(Math.random() * 10) + 1,
    recommendation: {
      type: 'optimize',
      text: 'Consider optimizing conditions'
    }
  }))
})

const canCreateRule = computed(() => {
  return newRule.value.name && 
         newRule.value.type && 
         newRule.value.conditions.length > 0 && 
         newRule.value.actions.length > 0
})

const canTestRule = computed(() => {
  return canCreateRule.value && testScheduleId.value
})

// Methods
const getOperatorsForField = (field) => {
  const baseOperators = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' }
  ]
  
  if (field?.includes('time') || field?.includes('size') || field?.includes('capacity')) {
    baseOperators.push(
      { value: 'greater', label: 'greater than' },
      { value: 'less', label: 'less than' },
      { value: 'between', label: 'between' }
    )
  }
  
  if (field?.includes('name') || field?.includes('subject')) {
    baseOperators.push(
      { value: 'contains', label: 'contains' },
      { value: 'starts_with', label: 'starts with' }
    )
  }
  
  return baseOperators
}

const onRuleTypeChange = () => {
  // Reset conditions and actions when type changes
  newRule.value.conditions = []
  newRule.value.actions = []
  
  // Add default condition based on type
  if (newRule.value.type) {
    addCondition()
    addAction()
  }
}

const addCondition = () => {
  newRule.value.conditions.push({
    field: '',
    operator: '',
    value: '',
    connector: 'AND'
  })
}

const removeCondition = (index) => {
  newRule.value.conditions.splice(index, 1)
}

const addAction = () => {
  newRule.value.actions.push({
    type: '',
    target: '',
    value: null
  })
}

const removeAction = (index) => {
  newRule.value.actions.splice(index, 1)
}

const testRule = async () => {
  try {
    testResults.value = await ruleStore.testRule(newRule.value, testScheduleId.value)
  } catch (error) {
    console.error('Rule test failed:', error)
  }
}

const createRule = async () => {
  try {
    await ruleStore.createRule(newRule.value)
    resetForm()
    activeTab.value = 'library'
  } catch (error) {
    console.error('Failed to create rule:', error)
  }
}

const resetForm = () => {
  newRule.value = {
    name: '',
    type: '',
    description: '',
    priority: 'medium',
    active: true,
    conditions: [],
    actions: [],
    customCode: ''
  }
  testResults.value = null
}

const editRule = (rule) => {
  newRule.value = { ...rule }
  activeTab.value = 'create'
}

const duplicateRule = (rule) => {
  newRule.value = {
    ...rule,
    name: `${rule.name} (Copy)`,
    id: undefined
  }
  activeTab.value = 'create'
}

const toggleRuleStatus = async (rule) => {
  try {
    await ruleStore.updateRule(rule.id, { active: !rule.active })
  } catch (error) {
    console.error('Failed to toggle rule status:', error)
  }
}

const deleteRule = async (rule) => {
  if (confirm(`Are you sure you want to delete "${rule.name}"?`)) {
    try {
      await ruleStore.deleteRule(rule.id)
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }
}

const useTemplate = (template) => {
  newRule.value = {
    name: template.name,
    type: template.category,
    description: template.description,
    priority: 'medium',
    active: true,
    conditions: [...template.conditions],
    actions: [...template.actions],
    customCode: ''
  }
  activeTab.value = 'create'
}

const previewTemplate = (template) => {
  selectedTemplate.value = template
  showTemplatePreview.value = true
}

const closeTemplatePreview = () => {
  showTemplatePreview.value = false
  selectedTemplate.value = null
}

const useSelectedTemplate = () => {
  useTemplate(selectedTemplate.value)
  closeTemplatePreview()
}

// Initialize data on mount
onMounted(async () => {
  await Promise.all([
    ruleStore.fetchRules(),
    scheduleStore.fetchSchedules()
  ])
})
</script>

<style scoped>
.rule-management-workflow {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.workflow-header {
  margin-bottom: 2rem;
}

.workflow-title {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.workflow-tabs {
  display: flex;
  border-bottom: 2px solid #e5e7eb;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  font-size: 1rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-button.active {
  border-bottom-color: #3b82f6;
  color: #3b82f6;
  font-weight: 500;
}

.workflow-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h4 {
  margin-bottom: 1rem;
  color: #374151;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.conditions-builder, .actions-builder {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 1rem;
}

.condition-item, .action-item {
  margin-bottom: 1rem;
}

.condition-row, .action-row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr auto;
  gap: 0.5rem;
  align-items: center;
}

.condition-connector {
  text-align: center;
  margin: 0.5rem 0;
}

.btn-icon {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #f3f4f6;
}

.btn-icon.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

.add-condition, .add-action {
  width: 100%;
  margin-top: 1rem;
}

.code-editor {
  margin-top: 1rem;
}

.code-textarea {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  min-height: 200px;
}

.code-help {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.rule-testing {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 6px;
}

.test-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.test-results {
  margin-top: 1rem;
}

.result-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.result-stat {
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 4px;
  font-weight: 500;
}

.violations-list {
  background: #fef2f2;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #ef4444;
}

.violation-item {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.library-controls {
  display: flex;
  gap: 1rem;
}

.search-input, .filter-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.rule-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  background: white;
}

.rule-card.inactive {
  opacity: 0.6;
  background: #f9fafb;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.rule-badges {
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
}

.priority-low { background: #e5e7eb; color: #374151; }
.priority-medium { background: #fef3c7; color: #92400e; }
.priority-high { background: #fed7d7; color: #c53030; }
.priority-critical { background: #fecaca; color: #991b1b; }

.rule-description {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.rule-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.rule-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.template-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  background: white;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.template-description {
  color: #6b7280;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.template-preview {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.logic-preview {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: #374151;
}

.template-actions {
  display: flex;
  gap: 0.5rem;
}

.analytics-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.summary-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3b82f6;
}

.analytics-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bar-label {
  min-width: 100px;
  font-size: 0.875rem;
}

.bar {
  height: 20px;
  background: #3b82f6;
  border-radius: 4px;
  min-width: 2px;
}

.bar-value {
  min-width: 30px;
  font-size: 0.875rem;
  font-weight: 500;
}

.performance-table table {
  width: 100%;
  border-collapse: collapse;
}

.performance-table th,
.performance-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.performance-table th {
  background: #f9fafb;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.condition-preview, .action-preview {
  padding: 0.5rem;
  background: #f3f4f6;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .library-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .library-controls {
    flex-direction: column;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .condition-row, .action-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .analytics-charts {
    grid-template-columns: 1fr;
  }
}
</style>