<template>
  <div
    class="flex flex-wrap items-center gap-6 px-4 sm:flex-nowrap sm:px-6 lg:px-8 pb-4"
  >
    <h1 class="text-base font-semibold leading-7 text-gray-900">Show</h1>
    <div
      class="order-last flex w-full gap-x-8 text-sm font-semibold leading-6 sm:order-none sm:w-auto sm:border-l sm:border-gray-200 sm:pl-6 sm:leading-7"
    >
      <NuxtLink
        v-for="item in navigation"
        :key="item.name"
        :to="item.href"
        class="rounded-md px-3 py-2 text-sm text-sky-900 font-semibold hover:text-white hover:bg-sky-500"
        >{{ item.name }}</NuxtLink
      >
    </div>
  </div>
</template>
  
  <script setup>
import { ref } from "vue";
import { MenuIcon, LockClosedIcon } from "@heroicons/vue/solid";
import {
  convertUpCaseSireOrDam,
  getAbsoluteUrl,
  encryptData,
  shortJumpingInt,
  getColorDescription,
} from "/assets/js/functions";
import { stringifyQuery } from "vue-router";
const props = defineProps({
  horseId: { type: String },
  horseName: { type: String },
});

const goTo = (id) => {
  // Assuming /horseDetailDetail is the route for horseDetailDetail.vue
  if (id) {
    return `${encryptData(id, import.meta.env.VITE_ENCRYPT_KEY)}`;
  }
  return "#";
};
const navigation = [
  {
    name: "Pedigree",
    href: `/pedigree/${props.horseName}/${goTo(props.horseId)}`,
  },
  {
    name: "Progeny",
    href: `/progeny/${props.horseName}/${goTo(props.horseId)}`,
  },
  {
    name: "Mareline",
    href: `/mareline/${props.horseName}/${goTo(props.horseId)}`,
  },
  { name: "Add Progeny", href: "/add/" },
];
</script>