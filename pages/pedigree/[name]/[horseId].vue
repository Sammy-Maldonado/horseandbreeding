<template>
  <div>
    <app-navbar />
    <div
      class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border overflow-x-auto"
    >
      <horse-details-menu :horseId="horseId" :horseName="route.params.name" />

      <pedigree-detail :horseName="route.params.name" :pedigrees="pedigrees" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  fetchDataMethodPost,
  decryptNumber,
} from "../../../assets/js/functions";
const route = useRoute();
const horseId = decryptNumber(
  route.params.horseId,
  import.meta.env.VITE_ENCRYPT_KEY
);
const pedigrees = ref([]);

const fetchPedigree = async () => {
  const url = "/api/pedigree-detail";
  const key = import.meta.env.VITE_API_KEY;
  const body = { id: horseId, level: 3 };
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    pedigrees.value = JSON.parse(response.body);
  }
};

onMounted(() => {
  fetchPedigree();
});
</script>