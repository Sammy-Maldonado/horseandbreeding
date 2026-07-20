<template>
  <div
    :class="[
      classLgCols ? classLgCols : 'lg:grid-cols-4',
      'mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 xl:gap-x-8',
    ]"
  >
    <slot></slot>
  </div>
</template>

<script setup>
const props = defineProps({
  classLgCols: { type: String, default: "" },
});
</script>
