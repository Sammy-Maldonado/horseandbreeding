<template>
  <div>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <horse-details-menu :horseId="horseId" :horseName="route.params.name" />

      <progeny-list :horseName="route.params.name" :data="data" />
    </div>
  </div>
</template>
  <script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  fetchDataMethodPost,
  parseRouteId,
  convertUpCaseSireOrDam,
} from "../../../assets/js/functions";
const route = useRoute();
const horseId = parseRouteId(route.params.horseId);
const data = ref([]);

const fetchProgeny = async () => {
  const url = "/api/progeny";
  const body = { id: horseId };
  const response = await fetchDataMethodPost(url, body, "POST");
  if (response.status == 200) {
    data.value = JSON.parse(response.body);
  }
};

onMounted(() => {
  fetchProgeny();
});
</script>