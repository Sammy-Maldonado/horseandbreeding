<template>
  <div class="py-8 relative">
    <img
      :src="data?.panoramic || '/img/ballinvalleyfarmpano.jpg'"
      alt=""
      class="absolute inset-0 h-full w-full object-cover object-end rounded-md"
    />
    <div class="relative flex w-full pt-32 pl-8 items-center justify-start">
      <img
        v-if="visible"
        :src="data?.logo || '/logo.jpg'"
        alt="Logo"
        class="h-20 lg:h-24 w-20 lg:w-24 rounded-md"
      />
      <p class="mt-1 text-2xl font-medium text-white pl-4">
        {{ data?.farmname }}
      </p>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  data: { type: Object, default: null },
  visible: { type: Boolean, default: false },
});
</script>