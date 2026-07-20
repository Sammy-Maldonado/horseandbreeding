<template>
  <div class="relative flex flex-1 flex-col overflow-hidden px-2 py-4">
    <div class="relative flex flex-1 flex-col items-center justify-center pb-4">
      <div class="text-center pb-10 flex">
        <img
          class="flex-1 rounded-lg h-10 w-auto mr-2"
          src="/logo.jpg"
          alt="horse and breeder"
        />
        <h1 class="flex-1 w-full text-2xl font-bold tracking-tight text-black">
          HORSE
        </h1>
        <strong class="flex-1 mt-3 mx-2 text-xs text-black">and</strong>
        <h1 class="flex-1 w-full text-2xl font-bold tracking-tight text-black">
          BREEDER
        </h1>
      </div>
      <form action="/login" class="w-full max-w-xs" @submit.prevent="logIn">
        <!-- Display success or error message with conditional class -->
        <div
          v-if="isError >= 0"
          :class="
            isError
              ? 'p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300'
              : 'p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400'
          "
          role="alert"
        >
          <span class="font-medium">{{
            isError ? "Invalid credentials." : "Login successful!"
          }}</span>
          {{ message }}
        </div>
        <div class="mb-6">
          <label
            for="email"
            class="block text-sm font-semibold leading-6 text-gray-900"
            >Email address</label
          >
          <input
            v-model="email"
            type="email"
            id="email"
            class="mt-2 appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
            required
          />
        </div>
        <div class="mb-6">
          <label
            for="password"
            class="block text-sm font-semibold leading-6 text-gray-900"
            >Password</label
          >
          <input
            v-model="password"
            type="password"
            id="password"
            class="mt-2 appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
          />
        </div>
        <button
          type="submit"
          class="inline-flex justify-center rounded-lg text-sm font-semibold py-2 px-4 bg-sky-700 ring-sky-600/20 text-white hover:bg-slate-700 w-full"
        >
          <span>Sign in to account</span>
        </button>
        <p class="mt-8 text-center">
          <!-- /password/reset -->
          <a href="#" class="text-sm hover:underline">Forgot password?</a>
        </p>
      </form>
    </div>
    <footer class="relative shrink-0">
      <div
        class="space-y-4 text-sm text-gray-900 sm:flex sm:items-center sm:justify-center sm:space-x-4 sm:space-y-0"
      >
        <p class="text-center sm:text-left">Don't have an account?</p>
        <NuxtLink
          class="inline-flex justify-center rounded-lg text-sm font-semibold py-2.5 px-4 text-slate-900 ring-1 ring-slate-900/10 hover:ring-slate-900/20"
          href="/register"
        >
          <span> Log up <span aria-hidden="true"> → </span> </span>
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
  
  <script setup>
import { ref } from "vue";
import { setTokens } from "@/composables/tokenManager"; // Adjust the path if needed

const email = ref("inf@gmail.com");
const password = ref("");
const isError = ref(-1); // To track if it's an error message
const message = ref(""); // To store success/error messages
const logIn = async () => {
  try {
    const { data, error } = await useFetch("/api/login", {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
      },
      headers: {
        "Content-Type": "application/json",
        "api-key": import.meta.env.VITE_API_KEY,
      },
    });

    if (error.value) {
      // Handle error and show friendly message
      message.value =
        "Login failed. Please check your credentials and try again.";
      isError.value = 1; // Set error state
      return;
    }
    const authData = data.value;

    if (authData && authData.statusCode === 200) {
      // Save tokens in localStorage or vuex/pinia state if needed

      setTokens(authData.accessToken, authData.refreshToken);
      // Show success message
      message.value = " Please close the modal to continue.";
      isError.value = 0; // Set error state
      // Navigate to /demo after a short delay
      setTimeout(() => {}, 1500); // Delay for 1.5 seconds for user to see the message
    } else {
      message.value = "Please try again or contact support for help.";
      isError.value = 1; // Set error state
    }
  } catch (err) {
    console.error("Error logging in:", err);
    isError.value = 1; // Set error state
    message.value = "An unexpected error occurred. Please try again later.";
  }
};
</script>
    
    