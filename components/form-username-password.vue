<template>
  <form class="mt-10 mx-5 w-full" @submit.prevent="fetchUserInfo">
    <!-- Account choice -->
    <fieldset class="mb-6">
      <div class="flex items-center gap-8">
        <label
          for="mode-existing"
          class="flex items-center gap-2 text-sm leading-6 text-gray-900"
        >
          <input
            v-model="user.mode"
            type="radio"
            id="mode-existing"
            name="account-mode"
            value="existing"
            class="h-4 w-4 border-gray-300 text-sky-700 focus:ring-sky-500"
          />
          I already have an account
        </label>
        <label
          for="mode-new"
          class="flex items-center gap-2 text-sm leading-6 text-gray-900"
        >
          <input
            v-model="user.mode"
            type="radio"
            id="mode-new"
            name="account-mode"
            value="new"
            class="h-4 w-4 border-gray-300 text-sky-700 focus:ring-sky-500"
          />
          I'm new here
        </label>
      </div>
    </fieldset>
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
        class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-xs sm:text-sm focus:outline-hidden placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
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
        class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-xs sm:text-sm focus:outline-hidden placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
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

// The fields start empty on purpose: defaults here ship in the public client
// bundle, and this component used to carry a working-looking credential pair
// as its initial state (HOR-98).
const user = reactive({
  email: "",
  password: "",
  mode: "existing",
});
const fetchUserInfo = () => {
  emit("getUserNamePassword", user);
};
</script>
