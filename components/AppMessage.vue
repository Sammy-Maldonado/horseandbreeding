<template>
  <div class="w-full">
    <!-- Error message if passwords don't match -->
    <div
      v-if="message"
      :class="
        isError
          ? 'p-4 my-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300'
          : 'p-4 my-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400'
      "
      role="alert"
    >
      <span class="font-medium">{{
        isError ? "Invalid. " : "Successful. "
      }}</span>
      <span v-html="message"></span>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  message: {
    type: String,
    default: null,
  },
  isError: {
    type: Boolean,
    default: false,
  },
});
</script>