<template>
  <div class="generate-schedule-page">
    <ScheduleGenerationWorkflow />
  </div>
</template>

<script setup>
// Import the workflow component
import ScheduleGenerationWorkflow from '~/components/workflows/ScheduleGenerationWorkflow.vue'

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
}
</style>