<template>
  <div>
    <app-navbar />
    <div class="bg-white">
      <div
        class="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-8 lg:max-w-7xl lg:px-8"
      >
        <h2 class="text-xl font-bold text-gray-900">Search</h2>
        <slider-box>
          <card-horse-sale
            v-for="horse in horsesSells"
            :key="horse.id"
            :horse="horse"
          />
        </slider-box>
        <div class="pt-16">
          <horse-sales-pages :total="pages" :page="offSet" />
        </div>
        <div
          class="block space-y-4 md:flex md:space-y-0 md:space-x-4 rtl:space-x-reverse"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
const route = useRoute();
const offSet = ref(route.params.seite || 0);
const horsesSells = ref([]);

const fetchHorsesSells = async () => {
  try {
    const response = await fetch("/api/horse-sells", {
      method: "POST",
      body: JSON.stringify({ offSet: (offSet.value - 1) * 20 }),
      headers: {
        "Content-Type": "application/json",
        "api-key": import.meta.env.VITE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.message}`);
    }

    const data = await response.json();
    horsesSells.value = [...horsesSells.value, ...JSON.parse(data.body)];
    // Update your state or component with the fetched data
  } catch (error) {
    console.error("Error fetching horses sale data:", error);
  }
};

const { data: pages } = await useFetch("/api/horse-sells-count", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api-key": import.meta.env.VITE_API_KEY,
  },
  transform: (data) => JSON.parse(data.pages),
});
// call Api on component mount
onMounted(() => {
  fetchHorsesSells();
});
</script>