<template>
  <div class="rules-page">
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Rule Management</h1>
          <NuxtLink to="/rules/manage" 
                   class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
            Create New Rule
          </NuxtLink>
        </div>

        <!-- Rule Categories -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-center mb-3">
              <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 15c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold">Hard Constraints</h3>
            </div>
            <p class="text-gray-600 text-sm mb-3">
              Must be respected - violations prevent schedule generation
            </p>
            <div class="text-2xl font-bold text-red-600">{{ hardConstraints.length }}</div>
            <div class="text-sm text-gray-500">Active rules</div>
          </div>

          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-center mb-3">
              <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold">Soft Constraints</h3>
            </div>
            <p class="text-gray-600 text-sm mb-3">
              Preferences - the system tries to satisfy when possible
            </p>
            <div class="text-2xl font-bold text-yellow-600">{{ softConstraints.length }}</div>
            <div class="text-sm text-gray-500">Active rules</div>
          </div>

          <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-center mb-3">
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 class="text-lg font-semibold">Custom Rules</h3>
            </div>
            <p class="text-gray-600 text-sm mb-3">
              Institution-specific rules and complex conditions
            </p>
            <div class="text-2xl font-bold text-blue-600">{{ customRules.length }}</div>
            <div class="text-sm text-gray-500">Active rules</div>
          </div>
        </div>

        <!-- Rules List -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold mb-4">Active Rules</h2>
          
          <div v-if="allRules.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No Rules Configured</h3>
            <p class="text-gray-500 mb-4">Create your first scheduling rule to get started</p>
            <NuxtLink to="/rules/manage" 
                     class="inline-block bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors">
              Create Rule
            </NuxtLink>
          </div>

          <div v-for="rule in allRules" :key="rule.id" 
               class="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center mb-2">
                  <h3 class="text-lg font-semibold mr-3">{{ rule.name }}</h3>
                  <span class="px-2 py-1 rounded-full text-xs"
                        :class="getRuleTypeClass(rule.type)">
                    {{ rule.type.replace('_', ' ').toUpperCase() }}
                  </span>
                  <span v-if="rule.priority" class="ml-2 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                    Priority: {{ rule.priority }}
                  </span>
                </div>
                <p class="text-gray-600 mb-2">{{ rule.description }}</p>
                <div class="text-sm text-gray-500">
                  <span>Applies to: {{ rule.scope }}</span>
                  <span class="ml-4">Created: {{ formatDate(rule.createdAt) }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2 ml-4">
                <button @click="toggleRule(rule)" 
                        :class="rule.enabled ? 'text-green-500' : 'text-gray-400'"
                        class="p-2 hover:bg-gray-50 rounded">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </button>
                <button @click="editRule(rule)" 
                        class="text-blue-500 hover:text-blue-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                <button @click="deleteRule(rule)" 
                        class="text-red-500 hover:text-red-700 p-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rule Validation -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Rule Validation Status</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ validationStats.valid }}</div>
            <div class="text-sm text-gray-600">Valid Rules</div>
          </div>
          <div class="text-center p-4 bg-yellow-50 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{{ validationStats.warnings }}</div>
            <div class="text-sm text-gray-600">Warnings</div>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <div class="text-2xl font-bold text-red-600">{{ validationStats.errors }}</div>
            <div class="text-sm text-gray-600">Conflicts</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Rules',
  meta: [
    { name: 'description', content: 'Manage scheduling rules, constraints, and preferences for optimal schedule generation.' }
  ]
})

// Reactive data
const rules = ref([
  {
    id: '1',
    name: 'Teacher Working Hours',
    type: 'hard_constraint',
    description: 'Teachers cannot be scheduled outside their working hours',
    scope: 'All Teachers',
    priority: 1,
    enabled: true,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Maximum Daily Lessons',
    type: 'hard_constraint',
    description: 'No more than 8 lessons per day for any teacher',
    scope: 'All Teachers',
    priority: 1,
    enabled: true,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '3',
    name: 'Lunch Break Preference',
    type: 'soft_constraint',
    description: 'Prefer to schedule lunch breaks between 11:30-13:30',
    scope: 'All Users',
    priority: 3,
    enabled: true,
    createdAt: new Date('2024-01-20')
  },
  {
    id: '4',
    name: 'Advanced Math Sequencing',
    type: 'custom_rule',
    description: 'Advanced math courses should be scheduled in morning hours',
    scope: 'Math Courses',
    priority: 2,
    enabled: true,
    createdAt: new Date('2024-02-01')
  }
])

const validationStats = ref({
  valid: 15,
  warnings: 2,
  errors: 0
})

// Computed properties
const hardConstraints = computed(() => 
  rules.value.filter(rule => rule.type === 'hard_constraint' && rule.enabled)
)

const softConstraints = computed(() => 
  rules.value.filter(rule => rule.type === 'soft_constraint' && rule.enabled)
)

const customRules = computed(() => 
  rules.value.filter(rule => rule.type === 'custom_rule' && rule.enabled)
)

const allRules = computed(() => rules.value)

// Methods
const getRuleTypeClass = (type) => {
  switch (type) {
    case 'hard_constraint':
      return 'bg-red-100 text-red-800'
    case 'soft_constraint':
      return 'bg-yellow-100 text-yellow-800'
    case 'custom_rule':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const toggleRule = (rule) => {
  rule.enabled = !rule.enabled
  console.log(`Rule "${rule.name}" ${rule.enabled ? 'enabled' : 'disabled'}`)
}

const editRule = (rule) => {
  console.log('Editing rule:', rule.id)
  // Navigate to edit mode or open modal
}

const deleteRule = (rule) => {
  if (confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
    const index = rules.value.findIndex(r => r.id === rule.id)
    if (index > -1) {
      rules.value.splice(index, 1)
    }
  }
}

// Load rules on mount
onMounted(async () => {
  try {
    // Here you would typically fetch rules from the API
    // const response = await $fetch('/api/rules')
    // rules.value = response
    console.log('Rules loaded')
  } catch (error) {
    console.error('Failed to load rules:', error)
  }
})
</script>

<style scoped>
.rules-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
}
</style>