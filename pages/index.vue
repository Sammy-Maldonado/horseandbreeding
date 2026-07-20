<template>
  <div>
    <app-navbar />
    <div class="bg-white">
      <div
        class="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8"
      >
        <h2 class="text-2xl font-bold tracking-tight text-gray-900">
          Horse and breeder
        </h2>

        <div
          class="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8"
        >
          <div
            v-for="product in products"
            :key="product?.id"
            class="group relative"
          >
            <div
              class="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 lg:h-80"
            >
              <img
                :src="product?.imageSrc"
                :alt="product?.imageAlt"
                class="h-full w-full object-cover object-center lg:h-full lg:w-full"
              />
            </div>
            <div class="mt-4 flex justify-between">
              <div>
                <h3 class="text-sm text-gray-700">
                  <a :href="product?.href">
                    <span aria-hidden="true" class="absolute inset-0" />
                    {{ product?.name }}
                  </a>
                </h3>
                <p class="mt-1 text-sm text-gray-500">{{ product?.color }}</p>
              </div>
              <p class="text-sm font-medium text-gray-900">
                {{ product?.level }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { encryptData } from "/assets/js/functions";
const products = [
  {
    id: 1,
    name: "Marcus ODonnell",
    href:
      "./premium-profile/" + encryptData(14, import.meta.env.VITE_ENCRYPT_KEY),
    imageSrc: "/img/horse.jpg",
    imageAlt: "Front of Breeder 14 in black.",
    level: "Ballinvalley House, Woodenbridge, Co Wicklow",
    color: "Breeder 14",
  },
  {
    id: 2,
    name: "Breeder Connolly Stud Farm",
    href:
      "./premium-profile/" + encryptData(29, import.meta.env.VITE_ENCRYPT_KEY),
    imageSrc: "/img/horse.jpg",
    imageAlt: "Front of Breeder Connolly Stud Farm in black.",
    level: "Connolly Stud Farm",
    color: "Breeder 29",
  },
  {
    id: 3,
    name: "Marcus ODonnell",
    href:
      "./premium-profile1/" + encryptData(14, import.meta.env.VITE_ENCRYPT_KEY),
    imageSrc: "/img/horse.jpg",
    imageAlt: "Front of Breeder 14 in black.",
    level: "Ballinvalley House, Woodenbridge, Co Wicklow",
    color: "Breeder 14",
  },
  {
    id: 4,
    name: "Breeder Connolly Stud Farm",
    href:
      "./premium-profile/" + encryptData(29, import.meta.env.VITE_ENCRYPT_KEY),
    imageSrc: "/img/horse.jpg",
    imageAlt: "Front of Breeder 29 in black.",
    level: "Connolly Stud Farm",
    color: "Breeder 29",
  },
  // More products...
];
</script>