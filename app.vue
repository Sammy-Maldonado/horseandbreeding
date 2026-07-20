<template>
  <div>
    <main>
      <!-- You can use the built-in Nuxt components for loading indicators and pages -->
      <NuxtLoadingIndicator />
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
// Import any necessary components, if AppFooter is a local component
import AppFooter from "~/components/AppFooter.vue";
</script>

<style scoped>
/* You can add styles here if necessary */
</style>
