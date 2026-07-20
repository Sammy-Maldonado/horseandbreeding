<template>
  <teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <!-- Modal container for responsiveness -->
      <div
        class="bg-white rounded-lg shadow-lg w-11/12 sm:w-4/5 md:w-4/5 lg:w-3/4 h-screen sm:h-auto sm:max-h-screen relative flex flex-col"
      >
        <!-- Modal Header -->
        <header class="flex justify-between items-center p-4 border-b">
          <slot name="header"></slot>
        </header>

        <!-- Modal Body (scrollable) -->
        <section class="flex-1 overflow-y-auto p-4">
          <slot name="body">
            <p class="text-gray-600">Default Body Content</p>
          </slot>
        </section>

        <!-- Modal Footer -->
        <footer class="p-4 border-t flex justify-between items-center">
          <div class="text-center flex-1">
            <slot name="footer"></slot>
          </div>
          <button
            type="button"
            @click="close"
            class="bg-sky-950 px-3 py-2 text-xs font-medium text-center text-white rounded-lg hover:bg-sky-800 focus:ring-4 focus:outline-none focus:ring-sky-300 dark:bg-sky-600 dark:hover:bg-sky-700 dark:focus:ring-sky-800 ml-auto"
          >
            Close
          </button>
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
  