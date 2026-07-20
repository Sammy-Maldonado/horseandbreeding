<!-- ~/components/Modal.vue -->
<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="close"
    >
      <div
        class="bg-white rounded-lg shadow-lg max-w-md w-full p-4 relative"
        @click.stop
      >
        <header class="flex justify-between items-center">
          <slot name="header"> </slot>
          <button
            class="text-gray-500 hover:text-gray-700 focus:outline-none ml-auto px-2"
            @click="close"
          >
            X
          </button>
        </header>

        <section class="mb-4">
          <slot name="body">
            <p class="text-gray-600">Default Body Content</p>
          </slot>
        </section>
        <footer class="flex justify-end">
          <slot name="footer"> </slot>
        </footer>
      </div>
    </div>
  </teleport>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);
const isVisible = ref(props.show);

// Watch for changes to the 'show' prop to update visibility
watch(
  () => props.show,
  (newVal) => {
    isVisible.value = newVal;
  }
);

// Close modal method
const close = () => {
  isVisible.value = false;
  emit("close");
};
</script>