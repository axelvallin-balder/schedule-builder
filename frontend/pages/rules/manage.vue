<template>
  <div class="manage-rules-page">
    <RuleManagementWorkflow />
  </div>
</template>

<script setup>
// Import the workflow component
import RuleManagementWorkflow from '~/components/workflows/RuleManagementWorkflow.vue'

// Page metadata
useHead({
  title: 'Schedule Builder - Manage Rules',
  meta: [
    { name: 'description', content: 'Create and manage scheduling rules, constraints, and preferences for optimal schedule generation.' }
  ]
})
</script>

<style scoped>
.manage-rules-page {
  min-height: 100vh;
}
</style>