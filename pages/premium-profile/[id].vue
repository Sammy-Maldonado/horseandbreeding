<template>
  <div>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <panoramic-farm-photo :data="_storehorses[0]" :visible="true" />
      <div
        v-if="_storehorses.length > 0"
        class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 pt-8 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
      >
        <!-- contact summary -->
        <ContactDetailHorse :breederDetail="_storehorses[0]" />
        <!-- breeder detail -->
        <BreederProfile :storehorses="_storehorses" />
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
