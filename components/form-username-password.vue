<template>
  <form class="mt-10 mx-5 w-full" @submit.prevent="fetchUserInfo">
    <!-- Email Field -->
    <div class="flex items-center mb-6">
      <label for="email" class="text-sm leading-6 text-gray-900 mr-4 w-32">
        Email address*
      </label>
      <input
        v-model="user.email"
        type="email"
        id="email"
        pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
        placeholder="e.g. ana@gmail.com"
        class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
        required
      />
    </div>

    <!-- Password Field -->
    <div class="flex items-center mb-6">
      <label for="password" class="text-sm leading-6 text-gray-900 mr-4 w-32">
        Password*
      </label>
      <input
        v-model="user.password"
        type="password"
        id="password"
        required
        placeholder="********"
        pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
        title="Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters"
        class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
      />
    </div>
    <!-- Submit Button -->
    <div class="text-right">
      <button
        type="submit"
        class="inline-flex justify-center rounded-lg text-sm py-2 px-4 bg-sky-700 ring-sky-600/20 text-white hover:bg-slate-700"
      >
        <span>Next</span>
      </button>
    </div>
  </form>
</template>
    
<script setup>
import { reactive } from "vue";

const emit = defineEmits(["getUserNamePassword"]);

const user = reactive({
  email: "inf01@gmail.com",
  password: "userPassword123",
});
const fetchUserInfo = () => {
  emit("getUserNamePassword", user);
};
</script>
      
      