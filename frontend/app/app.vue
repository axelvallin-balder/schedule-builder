<template>
  <div id="app">
    <!-- Global Navigation -->
    <nav class="bg-white shadow-lg border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <!-- Logo/Brand -->
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/" class="text-xl font-bold text-gray-800">
                Schedule Builder
              </NuxtLink>
            </div>
            
            <!-- Main Navigation -->
            <div class="hidden md:ml-6 md:flex md:space-x-8">
              <NuxtLink to="/" 
                       class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Home
              </NuxtLink>
              <NuxtLink to="/schedules" 
                       class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Schedules
              </NuxtLink>
              <NuxtLink to="/rules" 
                       class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Rules
              </NuxtLink>
              <NuxtLink to="/collaboration" 
                       class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                Collaboration
              </NuxtLink>
            </div>
          </div>
          
          <!-- User Menu -->
          <div class="flex items-center space-x-4">
            <button class="text-gray-500 hover:text-gray-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 17h5l-5 5-5-5h5v-6h0v6z"/>
              </svg>
            </button>
            <div class="relative">
              <button class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span class="sr-only">Open user menu</span>
                <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span class="text-gray-700 font-medium">U</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="min-h-screen">
      <NuxtPage />
    </main>

    <!-- Global Components -->
    <NuxtRouteAnnouncer />
  </div>
</template>

<script setup>
// Global styles and configuration can go here
useHead({
  title: 'Schedule Builder',
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'description', content: 'Advanced academic schedule builder with real-time collaboration and optimization.' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})
</script>

<style>
/* Global styles */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Active link styling */
.router-link-active {
  @apply border-indigo-500 text-gray-900;
}
</style>
