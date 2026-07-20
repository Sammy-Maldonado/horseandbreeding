<template>
  <div>
    <app-menu />

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <div
        class="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4"
        v-if="_storehorses.length > 0"
      >
        <!-- First column -->
        <div class="sm:col-span-1 md:col-span-1 lg:col-span-1">
          <ContactDetailHorse :breederDetail="_storehorses[0]" />
        </div>

        <!-- Second column -->
        <div class="sm:col-span-1 md:col-span-1 lg:col-span-2 px-4">
          <panoramic-farm-photo :data="_storehorses[0]" :visible="false" />
          <breeder-profile-1 :storehorses="_storehorses" />
        </div>
      </div>
    </div>
  </div>
</template>
  
  <script setup>
import BreederProfile from "@/components/BreederProfile.vue"; // Adjust the path based on your project structure
import ContactDetailHorse from "@/components/ContactDetailHorse.vue";
import { decryptNumber } from "/assets/js/functions";
const route = useRoute();
const id = decryptNumber(route.params.id, import.meta.env.VITE_ENCRYPT_KEY);
// Send data to breeder profile

const { data: _storehorses } = await useFetch("/api/storehorses", {
  method: "POST",
  body: JSON.stringify({ breederId: id }),
  headers: {
    "Content-Type": "application/json",
    "api-key": import.meta.env.VITE_API_KEY,
  },
  transform: (storehorses) => JSON.parse(storehorses.body),
});
</script>
  