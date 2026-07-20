<template>
  <!-- Alias -->

  <div class="mb-4 flex items-center">
    <label
      for="street-address"
      class="text-sm leading-6 text-gray-900 mr-4 w-32 capitalize"
    >
      {{ name }}<span v-if="required">*</span></label
    >
    <select
      v-model="selectedOption"
      :required="required"
      @change="emitSelection"
      :id="name"
      :name="name"
      class="block w-full rounded-md border-0 p-2 pb-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
    >
      {{
        selectedOption
      }}
      <option value="" :selected="selectedOption === ''" disabled>
        Select a {{ name }}
      </option>
      <option :value="null" v-if="!required">Not {{ name }}</option>
      <slot></slot>
    </select>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from "vue";
// Define the props the component will accept
const props = defineProps({
  name: { type: String, default: "" },
  required: { type: Boolean, default: true },
  val: {
    type: String,
    default: "",
  },
});
// Reactive variable for the selected option
const selectedOption = ref("");
// Define the emit event
const emit = defineEmits(["update:selected"]);
// Emit the selected option value
const emitSelection = () => {
  emit("update:selected", selectedOption.value);
};
// Watch for changes in props.val and update selectedOption
watch(
  () => props.val,
  (newVal) => {
    selectedOption.value = newVal; // Update when props.val changes
  }
);
</script>