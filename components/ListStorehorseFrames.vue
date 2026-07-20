<template>
  <div class="rounded-lg bg-sky-900 shadow-sm ring-1 ring-gray-900/5 p-6">
    <dl class="flex flex-wrap">
      <div class="flex-auto">
        <dt
          class="text-sm font-semibold leading-6 text-white border-b pb-2 flex items-center justify-between"
        >
          <p>Stock</p>
          <select
            v-model="typeHorse"
            id="typeHorse"
            name="typeHorse"
            class="rounded-md border-0 py-1 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option v-for="val in typeHorses" :key="val" :value="val">
              {{ val }}
            </option>
          </select>
        </dt>
        <div
          v-for="horse in storehorse"
          :key="horse.horse_id"
          class="mt-4 flex w-full flex-none gap-x-4 px-6"
        >
          <dt class="flex-none">
            <span class="sr-only">Phone</span>
            <img src="/img/hbull.gif" alt="" />
          </dt>
          <dd class="text-sm leading-6 text-white">
            <a
              :href="'../PremiumHorseDetail/' + encryptDataUrl(horse.horse_id)"
            >
              {{ convertUpCase(horse.name) }}
            </a>
          </dd>
        </div>
      </div>
    </dl>
  </div>
</template>
<script setup>
import { convertUpCase, encryptData } from "/assets/js/functions";
// Define a reactive variable for selected typeHorse
const typeHorse = ref("Broodmare");

// Define the list of typeHorses
const typeHorses = [
  "Broodmare",
  "Stallion",
  "Young Horse",
  "Sport horse",
  "Foal",
];

const props = defineProps({
  storehorse: { type: Object, default: null },
});
const encryptDataUrl = (id) => {
  return encryptData(id, import.meta.env.VITE_ENCRYPT_KEY);
};
</script>