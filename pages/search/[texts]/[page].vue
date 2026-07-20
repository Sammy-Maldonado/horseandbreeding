<template>
  <div>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border cc">
      <search-list
        :data="data"
        :searchTexts="searchText"
        :total="pagination.total"
      />
      <horse-search-pagination
        :total="pagination?.pages"
        :page="currentPage"
        :texts="searchText"
      />
    </div>
  </div>
</template>
    <script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { fetchDataMethodPost } from "../../../assets/js/functions";
const route = useRoute();

const searchText = ref(route.params.texts || ""); // Search query from URL
const currentPage = ref(route.params.page || 0); // Current page from URL
const data = ref([]);

const fetchSearch = async () => {
  const url = "/api/search";
  const key = import.meta.env.VITE_API_KEY;
  const body = {
    search: searchText.value,
    page: (currentPage.value - 1) * 50,
  };
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    data.value = JSON.parse(response.body);
  }
};

const { data: pagination } = await useFetch("/api/search-pages", {
  method: "POST",
  body: {
    search: searchText.value,
  },
  headers: {
    "Content-Type": "application/json",
    "api-key": import.meta.env.VITE_API_KEY,
  },
  transform: (data) => JSON.parse(data.data),
});

onMounted(() => {
  fetchSearch();
});
</script>