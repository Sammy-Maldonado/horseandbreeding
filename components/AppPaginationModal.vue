<template>
  <nav class="flex border-gray-200 px-4 sm:px-0">
    <div class="-mt-px flex flex-1">
      <button
        @click="selected(Math.max(page - 1, 1))"
        class="inline-flex items-center hover:text-sky-500 border-transparent pr-1 pr-3 pt-4 text-sm font-medium text-gray-500"
      >
        <ArrowLeftIcon class="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
        Previous
      </button>
    </div>

    <div class="hidden sm:flex md:flex lg:flex">
      <div class="inline-flex" v-for="index in indices" :key="index">
        <span
          v-if="index === true"
          class="inline-flex items-center border-t-2 border-transparent px-2 md:px-4 pt-4 text-sm font-medium text-gray-500"
        >
          ...
        </span>
        <button
          v-else
          @click="selected(index)"
          :class="[
            'items-center border-t-2 px-3 md:px-4 pt-4 text-sm font-medium hover:border-gray-300 hover:text-sky-700',
            page === index
              ? 'border-sky-500 text-gray-700'
              : 'border-transparent text-gray-500',
          ]"
          aria-current="page"
        >
          {{ index }}
        </button>
      </div>
    </div>

    <div class="-mt-px flex flex-1 justify-end">
      <button
        @click="selected(Math.min(page + 1, total))"
        class="inline-flex items-center border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:text-sky-500"
      >
        Next
        <ArrowRightIcon class="ml-3 h-5 w-5 text-gray-400" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>
  
  <script setup>
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/vue/solid";
const props = defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 0 },
});

const emit = defineEmits(["selectedPage"]);

// Emit the selected page number
const selected = (newPage) => {
  emit("selectedPage", newPage);
};

// Compute page indices with ellipsis where appropriate
const indices = computed(() => {
  let result = [];

  if (props.total <= 6) {
    // If total pages <= 6, display all pages
    for (let i = 1; i <= props.total; i++) {
      result.push(i);
    }
  } else {
    // Otherwise, show first two pages, last two pages, and current page range
    result = [1, 2];

    if (props.page > 3 && props.page < props.total - 2) {
      result.push(true); // Ellipsis
      result.push(props.page - 1, props.page, props.page + 1);
      result.push(true); // Ellipsis
    } else if (props.page <= 3) {
      result.push(3, 4, true); // Ellipsis for the gap
    } else if (props.page >= props.total - 2) {
      result.push(true); // Ellipsis for the gap
      result.push(props.total - 3, props.total - 2);
    }

    result.push(props.total - 1, props.total);
  }

  return result;
});
</script>
  