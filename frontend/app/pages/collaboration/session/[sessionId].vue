<template>
  <div class="collaboration-session-page">
    <CollaborationWorkflow :session-id="sessionId" />
  </div>
</template>

<script setup>
// Import the workflow component
import CollaborationWorkflow from '~/components/workflows/CollaborationWorkflow.vue'

// Get the session ID from the route parameters
const route = useRoute()
const sessionId = route.params.sessionId

// Page metadata
useHead({
  title: `Schedule Builder - Collaboration Session ${sessionId}`,
  meta: [
    { name: 'description', content: 'Real-time collaborative schedule editing with team members.' }
  ]
})
</script>

<style scoped>
.collaboration-session-page {
  min-height: 100vh;
}
</style>