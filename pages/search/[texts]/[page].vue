<template>
  <div>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border cc">
      <search-list
        :data="data"
        :searchTexts="searchText"
        :total="pagination?.total"
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

// A URL segment is always a string, so the page number stops being a URL here
// and becomes a number once, at this boundary. Every consumer downstream then
// does real arithmetic: `page - 1` already worked by accident, because `-`
// coerces, but `page + 1` concatenated instead of adding and sent Next to the
// wrong page. `type: Number` on the prop cannot fix that either — a prop type
// is a runtime check, not a conversion (HOR-119).
const currentPage = ref(Number(route.params.page || 0)); // Current page from URL
const data = ref([]);

const fetchSearch = async () => {
  const url = "/api/search";
  const body = {
    search: searchText.value,
    page: (currentPage.value - 1) * 50,
  };
  const response = await fetchDataMethodPost(url, body, "POST");
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
  },
  transform: (data) => JSON.parse(data.data),
});

onMounted(() => {
  fetchSearch();
});
</script>