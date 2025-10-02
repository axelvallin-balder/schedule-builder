<template>
  <div class="rules-page">
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Schedule Management</h1>
          <button
            v-if="activeTab === 'rules'"
            @click="navigateToRuleManage"
            class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Create New Rule
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="-mb-px flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
              :data-testid="`tab-${tab.id}`"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Rules Tab -->
          <div v-if="activeTab === 'rules'" class="rules-content">
            <h2 class="text-xl font-semibold mb-4">Rules Management</h2>
            <p class="text-gray-600">Configure scheduling rules and constraints.</p>
          </div>

          <!-- Entity Management Tabs -->
          <div v-else-if="activeTab === 'groups'">
            <GroupManager />
          </div>

          <div v-else-if="activeTab === 'teachers'">
            <TeacherManager />
          </div>

          <div v-else-if="activeTab === 'subjects'">
            <SubjectManager />
          </div>

          <div v-else-if="activeTab === 'courses'">
            <CourseManager />
          </div>

          <div v-else-if="activeTab === 'classes'">
            <ClassManager />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GroupManager from '../components/entities/GroupManager.vue'
import TeacherManager from '../components/entities/TeacherManager.vue'
import SubjectManager from '../components/entities/SubjectManager.vue'
import CourseManager from '../components/entities/CourseManager.vue'
import ClassManager from '../components/entities/ClassManager.vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Management',
  meta: [
    { name: 'description', content: 'Manage scheduling rules, entities, constraints, and preferences for optimal schedule generation.' }
  ]
})

// Navigation state
const activeTab = ref('rules')

const tabs = [
  { id: 'rules', name: 'Rules' },
  { id: 'groups', name: 'Groups' },
  { id: 'teachers', name: 'Teachers' },
  { id: 'subjects', name: 'Subjects' },
  { id: 'courses', name: 'Courses' },
  { id: 'classes', name: 'Classes' }
]

// Methods
const navigateToRuleManage = () => {
  console.log('Navigate to rule management')
}
</script>

<style scoped>
.rules-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
}
</style>