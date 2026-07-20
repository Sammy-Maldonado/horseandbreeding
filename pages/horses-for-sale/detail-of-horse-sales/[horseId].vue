
<template>
  <div>
    <app-navbar />
    <div class="bg-white">
      <main class="mx-auto max-w-7xl sm:px-6 sm:pt-16 lg:px-8">
        <div class="mx-auto max-w-2xl lg:max-w-none">
          <!-- Product -->
          <div class="lg:grid lg:grid-cols-3 lg:items-start lg:gap-x-8">
            <!-- Image gallery -->
            <div class="md:col-span-2 sm:col-span-1 col-span-2">
              <app-gallery :photos="horseDetail?.photos" :position="position" />

              <ul role="list" class="space-y-3 pt-2 lg:col-span-2 col-span-3">
                <li
                  class="overflow-hidden rounded-md bg-gray-50 px-6 py-4 shadow"
                >
                  <!-- Your content -->
                  <p class="text-xl font-semibold leading-6 text-black">
                    {{ horseDetail?.ad_title }}
                  </p>
                  <div class="flex flex-col">
                    <!-- Use flex-col for vertical layout -->
                    <p class="flex text-sm font-medium text-gray-500">
                      <PlusCircleIcon class="my-1 h-4 w-4" aria-hidden="true" />
                      <span class="flex items-center px-1 pr-3">
                        <!-- Add flex for alignment -->

                        {{ 100 }} views
                      </span>
                      <ClockIcon class="my-1 h-4 w-4" aria-hidden="true" />
                      <span class="flex items-center px-1 pr-3">
                        <!-- Add flex for alignment -->
                        {{ timeAgo(horseDetail?.created_at) }}
                      </span>
                      <LocationMarkerIcon
                        class="my-1 h-4 w-4"
                        aria-hidden="true"
                      />
                      <span class="flex items-center px-1">
                        <!-- Add flex for alignment -->

                        {{ horseDetail?.seller?.location }}
                      </span>
                    </p>
                  </div>
                  <div class="grid grid-cols-2">
                    <div
                      class="sm:flex sm:px-6 sm:py-5 lg:col-span-1 md:col-span-1 sm:col-span-2 col-span-2"
                    >
                      <dt
                        class="text-sm font-medium text-gray-500 sm:w-10 sm:flex-shrink-0 lg:w-20"
                      >
                        <p
                          class="lg:text-4xl text-xl font-semibold leading-6 text-black"
                        >
                          {{
                            horseDetail?.currency +
                            formatPrice(horseDetail?.sell_price)
                          }}
                        </p>
                      </dt>
                    </div>
                    <div
                      class="sm:flex sm:px-6 sm:py-5 lg:col-span-1 md:col-span-1 sm:col-span-2 col-span-2"
                    >
                      <dt
                        class="text-sm font-medium text-gray-500 sm:w-20 sm:flex-shrink-0 lg:w-30"
                      >
                        <button
                          type="button"
                          class="inline-flex items-center gap-x-1.5 rounded-md bg-sky-900 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          Share
                          <SaveAsIcon
                            class="-mr-0.5 h-5 w-5"
                            aria-hidden="true"
                          />
                        </button>
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900 sm:ml-6 sm:mt-0">
                        <button
                          type="button"
                          class="inline-flex items-center gap-x-1.5 rounded-md bg-sky-900 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          Save
                          <ShareIcon
                            class="-mr-0.5 h-5 w-5"
                            aria-hidden="true"
                          />
                        </button>
                      </dd>
                    </div>
                  </div>
                </li>
                <li
                  class="overflow-hidden rounded-md bg-gray-50 px-6 py-4 shadow"
                >
                  <!-- Your content -->
                  <h3 class="text-sm font-semibold leading-6 text-black">
                    Information
                  </h3>
                  <div class="grid grid-cols-2">
                    <div
                      class="sm:flex sm:px-6 sm:py-5 lg:col-span-1 md:col-span-1 sm:col-span-2 col-span-2"
                    >
                      <dt
                        class="text-sm font-medium text-gray-500 sm:w-10 sm:flex-shrink-0 lg:w-20"
                      >
                        Age
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900 sm:ml-6 sm:mt-0">
                        {{ horseDetail?.age }}
                      </dd>
                    </div>
                    <div
                      class="sm:flex sm:px-6 sm:py-5 lg:col-span-1 md:col-span-1 sm:col-span-2 col-span-2"
                    >
                      <dt
                        class="text-sm font-medium text-gray-500 sm:w-10 sm:flex-shrink-0 lg:w-20"
                      >
                        Gender
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900 sm:ml-6 sm:mt-0">
                        {{ horseDetail?.horse_type }}
                      </dd>
                    </div>
                    <div
                      class="sm:flex sm:px-6 sm:py-5 lg:col-span-1 md:col-span-1 sm:col-span-2 col-span-2"
                    >
                      <dt
                        class="text-sm font-medium text-gray-500 sm:w-20 sm:flex-shrink-0 lg:w-30"
                      >
                        Height
                      </dt>
                      <dd class="mt-1 text-sm text-gray-900 sm:ml-6 sm:mt-0">
                        {{ horseDetail?.height }}
                      </dd>
                    </div>
                  </div>
                </li>

                <li
                  class="overflow-hidden rounded-md bg-gray-50 px-6 py-4 shadow"
                >
                  <div class="mt-6">
                    <h3 class="text-sm font-semibold leading-6 text-black pb-4">
                      Description
                    </h3>
                    <div
                      class="space-y-6 text-base text-gray-700"
                      v-html="horseDetail?.comments"
                    />
                  </div>
                </li>
              </ul>
            </div>

            <!-- Product info -->
            <div class="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
              <SellerDetail
                :adTitle="horseDetail?.name"
                :area="horseDetail?.seller?.full_name"
                :seller="horseDetail?.seller"
              ></SellerDetail>
            </div>
            <section
              aria-labelledby="related-heading"
              class="mt-10 px-4 py-16 sm:px-0 md:col-span-2 sm:col-span-1 col-span-2"
            >
              <h2 id="related-heading" class="text-xl font-bold text-gray-900">
                You might be interested in
              </h2>
              <slider-box :classLgCols="'lg:grid-cols-3'">
                <card-horse-sale
                  v-for="horse in horsesSells"
                  :key="horse.id"
                  :horse="horse"
                />
              </slider-box>
            </section>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
  
  <script setup>
import { ref } from "vue";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/vue";
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import {
  ShareIcon,
  SaveIcon,
  SaveAsIcon,
  ClockIcon,
  LocationMarkerIcon,
  PlusCircleIcon,
} from "@heroicons/vue/solid";
import { useRoute } from "vue-router";
import { decryptNumber, formatPrice, timeAgo } from "/assets/js/functions";
import SellerDetail from "../../../components/SellerDetail.vue";
const position = ref(0);
const route = useRoute();
const horsesSells = ref([]);

const id = decryptNumber(
  route.params.horseId,
  import.meta.env.VITE_ENCRYPT_KEY
);

const { data: horseDetail } = await useFetch("/api/storeHorseById", {
  method: "POST",
  body: {
    id: id,
    level: 3,
  },

  headers: {
    "Content-Type": "application/json",
    "api-key": import.meta.env.VITE_API_KEY,
  },
  transform: (data) => JSON.parse(data.body)[0],
});
// const formattedText = computed(() => savedText.value.replace(/\n/g, '<br>'));

const isModalOpen = ref(false);
const selectedPhotoIndex = ref(null);
const openModal = (index) => {
  position.value = index;
  selectedPhotoIndex.value = index;
  isModalOpen.value = true;
};
const closeModal = () => {
  isModalOpen.value = false;
};

const fetchHorsesSells = async () => {
  try {
    const response = await fetch("/api/horses-suggested-for-sale/", {
      method: "POST",
      body: JSON.stringify({
        horse_type: horseDetail?.value?.horse_type,
        age: horseDetail?.value?.age,
      }),
      headers: {
        "Content-Type": "application/json",
        "api-key": import.meta.env.VITE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.message}`);
    }
    const data = await response.json();
    horsesSells.value = [...horsesSells.value, ...JSON.parse(data.body)];
    // Update your state or component with the fetched data
  } catch (error) {
    console.error("Error fetching horses sale data:", error);
  }
};

fetchHorsesSells();
</script>