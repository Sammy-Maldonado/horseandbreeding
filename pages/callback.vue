<template>
  <div class="callback">
    <h1>OAuth Callback</h1>
    <div v-if="errorMessage">
      <p>Error: {{ errorMessage }}</p>
    </div>
    <div v-else>
      <p>Processing your authentication...</p>
    </div>
  </div>
</template>
  
  <script setup>
import { useRoute, useRouter } from "vue-router";
import { onMounted, ref } from "vue";
import axios from "axios";

// Route and router
const route = useRoute();
const router = useRouter();

// Reactive variables
const errorMessage = ref(null);

// OAuth Callback Logic
onMounted(async () => {
  const code = route.query.code; // Get the 'code' parameter from the URL

  if (!code) {
    errorMessage.value = "Authorization code not found";
    return;
  }

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post("/api/auth/exchange-token", { code });

    // Extract the token from the response
    const { access_token } = response.data;

    // Store the access token (e.g., in localStorage or Vuex store)
    localStorage.setItem("access_token", access_token);

    // Redirect to the home page or another protected route
    router.push({ path: "/" });
  } catch (error) {
    console.error("Error during token exchange:", error);
    errorMessage.value = "Failed to exchange authorization code for token";
  }
});
</script>
  
  <style scoped>
.callback {
  text-align: center;
  padding: 50px;
}
</style>
  