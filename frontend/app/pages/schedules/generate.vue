<template>
  <div class="generate-schedule-page">
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h1 class="text-3xl font-bold mb-6">Generate New Schedule</h1>
        <p class="text-gray-600 mb-4">Schedule generation workflow is being loaded...</p>
        
        <!-- Temporary content while we fix the workflow component -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 class="text-lg font-semibold text-blue-800 mb-2">🎯 Navigation Test Success!</h2>
          <p class="text-blue-700">✅ Navigation to /schedules/generate is working!</p>
          <p class="text-blue-700">⏰ Last updated: {{ new Date().toLocaleTimeString() }}</p>
          <p class="text-blue-700">The workflow component is temporarily disabled due to TypeScript compilation errors.</p>
        </div>

        <div class="flex space-x-4">
          <NuxtLink to="/schedules" 
                   class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
            ← Back to Schedules
          </NuxtLink>
          <button disabled
                  class="bg-blue-300 text-white px-6 py-2 rounded-lg cursor-not-allowed">
            Start Generation (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Temporarily disabled the workflow component import to test navigation
// import ScheduleGenerationWorkflow from '~/components/workflows/ScheduleGenerationWorkflow.vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Generate Schedule',
  meta: [
    { name: 'description', content: 'Generate optimized academic schedules with advanced algorithms and constraint handling.' }
  ]
})
</script>

<style scoped>
.generate-schedule-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
</style>