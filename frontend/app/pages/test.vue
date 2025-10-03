<template>
  <div class="test-page bg-green-100 min-h-screen p-8">
    <h1 class="text-4xl font-bold text-green-800">🎉 Test Page Works!</h1>
    <p class="text-lg text-green-700 mt-4">If you can see this, routing is working!</p>
    <p class="text-sm text-green-600 mt-2">Current time: {{ new Date().toLocaleString() }}</p>
    
    <div class="mt-8">
      <NuxtLink to="/schedules" 
               class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
        ← Back to Schedules
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
useHead({
  title: 'Test Page - Schedule Builder'
})
</script>