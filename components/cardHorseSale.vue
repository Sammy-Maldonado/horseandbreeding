<template>
  <div>
    <div class="relative">
      <div class="relative h-72 w-full overflow-hidden rounded-lg">
        <img
          :src="
            horse?.photos?.[0]?.photo_id
              ? '/uploadImages/' + horse.photos[0].photo_id
              : '/img/cardtrick.jpg'
          "
          :alt="horse?.imageAlt || ''"
          class="h-full w-full object-cover object-center"
        />
      </div>
      <div class="relative mt-4">
        <h4 class="text-lg font-bold text-gray-900">
          {{ horse?.ad_title }}
        </h4>
        <p class="mt-1 text-sm text-gray-500">
          <span> {{ horse?.horse_type }}</span>
          <span v-if="horse?.age" class="text-md"> : </span>
          <span> {{ horse?.age }} </span>
        </p>
        <p class="mt-1 text-sm text-gray-500">
          {{ horse?.currency + formatPrice(horse?.sell_price) }}
        </p>
      </div>
      <NuxtLink
        :to="
          '/horses-for-sale/detail-of-horse-sales/' +
          encryptDataUrl(horse.horse_id)
        "
      >
        <div
          class="absolute inset-x-0 top-0 flex h-72 items-end justify-end overflow-hidden rounded-lg p-4"
        >
          <div
            aria-hidden="true"
            class="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black opacity-50"
          ></div>
          <p class="relative text-4xl font-semibold text-white">
            {{ horse?.currency + formatPrice(horse?.sell_price) }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { formatPrice, encryptData } from "../assets/js/functions";
const props = defineProps(["horse"]);

const encryptDataUrl = (id) => {
  return encryptData(id, import.meta.env.VITE_ENCRYPT_KEY);
};
</script>
