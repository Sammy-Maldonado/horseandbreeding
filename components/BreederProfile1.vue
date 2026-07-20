<template>
  <div
    class="py-8 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-1 xl:pb-10 xl:pt-8"
  >
    <h2
      class="text-base font-semibold leading-6 text-black"
      v-if="storehorses.length > 0"
    >
      {{ storehorses[0].name }}
    </h2>
    <p class="mt-2 text-sm text-black-500 pb-4" v-if="storehorses.length > 0">
      {{ storehorses[0].remarks || "No data remarks" }}
    </p>
    <div class="bg-sky-900 p-8 rounded-lg">
      <dl class="flex items-center justify-between">
        <label for="typeHorse" class="text-white text-center">
          Breading Mares
        </label>
        <select
          id="typeHorse"
          name="typeHorse"
          class="rounded-md border-0 py-1 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
        >
          <option selected="">Broodmare</option>
          <option>Sport Horse</option>
          <option>Stallion</option>
          <option>Young Horse</option>
          <option>Foal</option>
        </select>
      </dl>

      <dl
        class="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-1 md:grid-cols-2 md:gap-y-8 sm:gap-y-4 lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-3"
      >
        <div
          v-for="storehorse in storehorses"
          :key="storehorse.horse_id"
          class="group relative"
        >
          <p class="text-white text-center">
            {{ convertUpCase(storehorse.name) }}
          </p>
          <div
            class="aspect-h-1 aspect-w-1 overflow-hidden rounded-md bg-gray-200 group-hover:opacity-75"
          >
            <img
              @click="getHorseDetailLink(storehorse.horse_id)"
              :src="storehorse.image || '/img/cardtrick_profile.jpg'"
              alt="Horse Image"
              class="object-cover object-center"
            />
          </div>

          <p class="mt-1 text-sm font-medium text-center">
            <span class="text-white">
              {{ convertUpCase(storehorse.sire_name) }} x
              {{ convertUpCase(storehorse.grand_dam_sire_name) }} x
              {{ convertUpCase(storehorse.great_grand_dam_sire_name) }}</span
            >
          </p>
        </div>
      </dl>
    </div>
  </div>
</template>
  
<script setup>
import { useRouter } from "vue-router";
import { convertUpCase, decodedNotes, encryptData } from "/assets/js/functions";

const router = useRouter();
// Your Vue.js component script section using <script setup>
const props = defineProps(["storehorses"]);

const getHorseDetailLink = (id) => {
  // Assuming /horseDetail is the route for horseDetail.vue

  router.push({
    path: `../premium-horse-detail1/${encryptData(
      id,
      import.meta.env.VITE_ENCRYPT_KEY
    )}`,
  });
};
</script>

 