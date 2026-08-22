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
import { parseRouteId } from "/assets/js/functions";
const route = useRoute();
const id = parseRouteId(route.params.id);
// Send data to breeder profile

const { data: breederHorses } = await useFetch("/api/storehorses", {
  method: "POST",
  body: JSON.stringify({ breederId: id }),
  headers: {
    "Content-Type": "application/json",
  },
  transform: (storehorses) => JSON.parse(storehorses.body),
});

// A real HTTP error leaves the payload null instead of the error-shaped object
// the fake 200 used to carry. An empty list renders exactly the page the app
// already shows for a breeder with no horses (HOR-96).
const _storehorses = computed(() => breederHorses.value ?? []);
</script>
  