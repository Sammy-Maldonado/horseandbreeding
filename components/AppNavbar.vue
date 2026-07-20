<template>
  <Disclosure
    as="nav"
    class="bg-gradient-to-t from-sky-600 to-sky-900"
    v-slot="{ open }"
  >
    <div class="mx-auto max-w-7xl sm:px-4 lg:px-8">
      <div
        class="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 lg:grid-cols-6 xl:grid-cols-11 gap-1 lg:px-0"
      >
        <div
          class="col-span-1 sm:col-span-1 lg:col-span-1 p-4 flex items-center justify-center"
        >
          <div class="text-center">
            <img class="h-16 w-auto" src="/logo.jpg" alt="horse and breeder" />
          </div>
        </div>

        <div
          class="col-span-1 sm:col-span-1 lg:col-span-5 p-4 sm:flex items-center justify-center lg:justify-end"
        >
          <div class="sm:flex text-center">
            <h1
              class="w-full text-4xl font-bold tracking-tight text-white lg:text-6xl"
            >
              HORSE
            </h1>
            <p class="m-4 text-xl text-white">and</p>
            <h1
              class="w-full text-4xl font-bold tracking-tight text-white lg:text-6xl"
            >
              BREEDER
            </h1>
          </div>
        </div>

        <!-- Third column (double the size of the first) -->
        <div class="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 pt-4">
          <input
            id="username"
            name="username"
            class="w-full block rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
            placeholder="Username"
            type="text"
          />
        </div>
        <div class="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 pt-4">
          <input
            id="passwod"
            name="passwod"
            class="w-full block rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
            placeholder="**********"
            type="passwod"
          />
        </div>
        <div class="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-1 pt-4">
          <div class="text-right">
            <button
              @click="goToLogin('/login')"
              class="w-full rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Login
            </button>
          </div>

          <div class="mt-2 text-right pb-2">
            <button
              type="button"
              @click="goToLogin('/register')"
              class="w-full rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Join now
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- end -->
    <div
      class="rounded-md mx-auto max-w-7xl px-2 sm:px-4 lg:px-8 bg-gradient-to-t from-sky-700 to-sky-800"
    >
      <div class="relative flex h-16 items-center justify-between">
        <div class="flex items-center lg:px-0">
          <div class="flex-shrink-0 hidden p-2 lg:block">
            <div class="flex space-x-4">
              <NuxtLink
                v-for="(item, index) in nav"
                :key="index"
                :to="item.to"
                :name="item.label"
                :class="'rounded-md text-sm font-medium text-gray-300 hover:bg-sky-700 hover:text-white'"
              >
                {{ item.label }}
              </NuxtLink>
            </div>
          </div>
        </div>
        <div class="flex flex-1 justify-center lg:ml-6 lg:justify-end">
          <div class="w-full max-w-lg lg:max-w-xs">
            <label for="search" class="sr-only">Search</label>
            <div class="relative">
              <div
                class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
              >
                <svg
                  class="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <input
                id="search"
                name="search"
                @keydown.enter="goToPage(1)"
                v-model="searchText"
                class="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
                placeholder="Search"
                type="text"
              />
            </div>
          </div>
          <button
            type="button"
            @click="goToPage(1)"
            class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Search
          </button>
        </div>
        <div class="flex lg:hidden">
          <!-- Mobile menu button -->
          <client-only>
            <DisclosureButton
              class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-sky-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span class="absolute -inset-0.5" />
              <span class="sr-only">Open main menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-6 h-6"
                v-if="!open"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
                />
              </svg>
            </DisclosureButton>
          </client-only>
        </div>
      </div>
    </div>

    <DisclosurePanel class="lg:hidden">
      <div class="space-y-1 px-2 pb-3 pt-2">
        <!-- Current: "bg-sky-950 text-white", Default: "text-gray-300 hover:bg-sky-700 hover:text-white" -->
        <DisclosureButton
          v-for="item in nav"
          :key="item.to"
          as="a"
          :href="item.to"
          :id="item.label"
          class="block rounded-md bg-sky-950 px-3 py-2 text-base font-medium text-white"
        >
          {{ item.label }}
        </DisclosureButton>
      </div>
    </DisclosurePanel>
  </Disclosure>
</template>

<script setup>
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/vue";
import { ref } from "vue";
import { encryptData } from "/assets/js/functions";

import { useRouter } from "vue-router";

const router = useRouter();

// Function to navigate to the login page
const goToLogin = (url) => {
  router.push(url);
};
const searchText = ref("Card trick");
const goToPage = (page) => {
  router.push(`/search/${searchText.value}/${page}`);
};
const nav = ref([
  { label: "Home", name: "Home", to: "/" },
  {
    label: "Premium profile 0",
    name: "premium",
    to: "/premium-profile/" + encryptData(14, import.meta.env.VITE_ENCRYPT_KEY),
  },
  {
    label: "Premium profile 1",
    name: "premium1",
    to:
      "/premium-profile1/" + encryptData(14, import.meta.env.VITE_ENCRYPT_KEY),
  },
  { label: "Buy", name: "buy", to: "/horses-for-sale/1" },
  { label: "Sell", name: "horse-book", to: "/sell" },
  { label: "Report", name: "Report", to: "/report" },
  { label: "Add horse", name: "add-horse", to: "/add" },
  {
    label: "Try Premium",
    name: "Try Premium",
    to: "/premium/premium-info",
  },
]);
</script>