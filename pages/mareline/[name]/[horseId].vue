<template>
  <div>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <h1 class="text-2xl font-extrabold dark:text-white pb-4">
        Mareline of<small
          class="ms-2 font-semibold text-gray-500 dark:text-gray-400"
          >{{ convertUpCaseSireOrDam(route.params.name) }}</small
        >
      </h1>

      <ul class="tree rounded-lg border py-4">
        <mareline-tree :data="mareline" :horseId="id"></mareline-tree>
      </ul>
    </div>
  </div>
</template>
  
  <script setup>
import { ref } from "vue";
import {
  fetchDataMethodPost,
  decryptNumber,
  convertUpCaseSireOrDam,
} from "../../../assets/js/functions";

const route = useRoute();
const id = decryptNumber(
  route.params.horseId,
  import.meta.env.VITE_ENCRYPT_KEY
);
// const id = route.params.id;
const mareline = ref([]);
const fetchMareline = async () => {
  const url = "/api/mareline";
  const key = import.meta.env.VITE_API_KEY;
  const body = { id: id };
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    mareline.value = JSON.parse(response.body);
  }
};

onMounted(fetchMareline);
</script>
  