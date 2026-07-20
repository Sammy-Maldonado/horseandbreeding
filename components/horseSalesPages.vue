
<template>
  <nav
    class="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0"
  >
    <div class="-mt-px flex w-0 flex-1">
      <a
        :href="'/horses-for-sale/' + Math.max(page - 1, 1)"
        class="inline-flex items-center border-t-2 border-transparent pr-1 pr-3 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
      >
        <ArrowLeftIcon class="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
        Previous
      </a>
    </div>
    <div class="hidden md:-mt-px md:flex">
      <div class="inline-flex" v-for="index in indices" :key="index">
        <span
          v-if="index === true"
          class="inline-flex items-center border-t-2 border-transparent px-2 md:px-4 pt-4 text-sm font-medium text-gray-500"
        >
          ...
        </span>
        <a
          v-else
          :href="'/horses-for-sale/' + index"
          :class="[
            ' items-center border-t-2 px-3 md:px-4 pt-4 text-sm font-medium hover:border-gray-300 hover:text-gray-700 ',
            page == index
              ? 'border-indigo-500 text-gray-700'
              : 'border-transparent text-gray-500',
          ]"
          aria-current="page"
        >
          {{ index }}
        </a>
      </div>
    </div>

    <div class="-mt-px flex w-0 flex-1 justify-end">
      <a
        :href="'/horses-for-sale/' + Math.min(page + 1, total)"
        class="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
      >
        Next
        <ArrowRightIcon class="ml-3 h-5 w-5 text-gray-400" aria-hidden="true" />
      </a>
    </div>
  </nav>
</template>
  
<script setup>
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/vue/solid";

const props = defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 0 },
});

const start = props.total > 6 ? 2 : props.total;
const end = props.total > 6 ? props.total - 1 : props.total + 1;

// Define ranges to combine (1 to 3 and 6 to 9)
const ranges = [
  { start: 1, end: start },
  { start: end, end: props.total },
];

// Computed property to combine all ranges into a single array
const indices = computed(() => {
  return ranges.reduce((acc, range, index) => {
    for (let i = range.start; i <= range.end; i++) {
      acc.push(i);
    }
    if (!acc.includes(props.page) && start < props.page && props.page < end) {
      acc.push(true);
      acc.push(props.page);
      acc.push(true);
    } else if (index == 0 && end < props.total) {
      acc.push(true);
      acc.push(Math.round(props.total / 2));
      acc.push(true);
    }
    return acc;
  }, []);
});
</script>