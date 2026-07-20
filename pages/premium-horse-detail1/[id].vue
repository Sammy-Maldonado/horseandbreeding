<!-- components/Grid.vue -->
<template>
  <div>
    <app-menu />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <div
        class="grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4"
        v-if="_familyHorse"
      >
        <!-- First column -->
        <div class="sm:col-span-1 md:col-span-1 lg:col-span-1">
          <contact-detail-horse :breederDetail="_familyHorse?.breeders" />
          <!-- component store horse -->
          <div class="pt-8">
            <list-storehorse-frames :storehorse="_storehorse" />
          </div>
        </div>

        <!-- Second column -->
        <div class="sm:col-span-1 md:col-span-1 lg:col-span-2 bg-while">
          <div class="px-4">
            <panoramic-farm-photo
              :data="_familyHorse?.breeders"
              :visible="false"
            />
          </div>

          <div
            class="py-4 shadow-sm ring-1 ring-white sm:mx-0 sm:rounded-lg sm:px-4 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-4 xl:pb-10 xl:pt-8"
          >
            <!-- horse detail -->
            <h2 class="text-base font-semibold leading-6 text-gray-900">
              {{ _familyHorse?.name }}
            </h2>
            <p class="mt-2 text-sm text-gray-500 pb-4">
              {{ decodedNotes(_familyHorse?.remarks) }}
            </p>

            <!-- end horse detail -->
            <h2 class="text-base font-semibold leading-6 text-gray-900">
              Pedigree
            </h2>
            <div class="grid grid-rows-4 grid-flow-col border">
              <div
                class="row-span-4 border flex items-center justify-center p-2"
              >
                <div class="horse-name">
                  <!-- This content will be centered horizontally -->
                  <a class="font-bold">{{
                    convertUpCase(_familyHorse?.name)
                  }}</a>
                  <p class="text-gray-400 text-xs">
                    {{ _familyHorse?.regnr }}
                    {{ _familyHorse?.birthyear }}
                    {{ _familyHorse?.color }}
                  </p>
                </div>
              </div>
              <div
                class="row-span-2 col-span-2 border p-2 flex items-center justify-center"
              >
                <div class="sire">
                  <a v-if="_familyHorse?.sire" class="font-bold">
                    {{ convertUpCase(_familyHorse?.sire?.name) }}
                    <p class="text-gray-400 text-xs">
                      {{ _familyHorse?.sire?.regnr }}
                      {{ _familyHorse?.sire?.birthyear }}
                      {{ _familyHorse?.sire?.color }}
                    </p>
                  </a>
                  <p v-else class="text-gray-400 text-xs">N/A</p>
                </div>
              </div>
              <div
                class="row-span-2 col-span-2 border p-2 flex items-center justify-center"
              >
                <div class="dam">
                  <a v-if="_familyHorse?.dam" class="font-bold">
                    {{ convertUpCase(_familyHorse.dam.name) }}
                    <p class="text-gray-400 text-xs">
                      {{ _familyHorse?.dam?.regnr }}
                      {{ _familyHorse?.dam?.birthyear }}
                      {{ _familyHorse?.dam?.color }}
                    </p>
                  </a>
                  <p v-else class="text-gray-400 text-xs">N/A</p>
                </div>
              </div>
              <div
                class="row-span-1 col-span-2 border p-2 flex items-center justify-center"
              >
                <div class="sire-sire">
                  <a v-if="_familyHorse?.sire?.sire" class="font-bold">
                    {{ convertUpCase(_familyHorse?.sire?.sire?.name) }}
                    <p class="text-gray-400 text-xs">
                      {{ _familyHorse?.sire?.sire?.regnr }}
                      {{ _familyHorse?.sire?.sire?.birthyear }}
                      {{ _familyHorse?.sire?.sire?.color }}
                    </p>
                  </a>
                  <p v-else class="text-gray-400 text-xs">N/A</p>
                </div>
              </div>
              <div
                class="row-span-1 col-span-2 border p-2 flex items-center justify-center"
              >
                <div class="sire-dam">
                  <a v-if="_familyHorse?.sire?.dam" class="font-bold">
                    {{ convertUpCase(_familyHorse?.sire?.dam?.name) }}
                    <p class="text-gray-400 text-xs">
                      {{ _familyHorse?.sire?.dam?.regnr }}
                      {{ _familyHorse?.sire?.dam?.birthyear }}
                      {{ _familyHorse?.sire?.dam?.color }}
                    </p>
                  </a>
                  <p v-else class="text-gray-400 text-xs">N/A</p>
                </div>
              </div>
              <div
                class="row-span-1 col-span-2 border p-2 flex items-center justify-center"
              >
                <div class="dam-sire">
                  <a v-if="_familyHorse?.dam?.sire" class="font-bold">
                    {{ convertUpCase(_familyHorse?.dam?.sire?.name) }}
                    <p class="text-gray-400 text-xs">
                      {{ _familyHorse?.dam?.sire?.regnr }}
                      {{ _familyHorse?.dam?.sire?.birthyear }}
                      {{ _familyHorse?.dam?.sire?.color }}
                    </p>
                  </a>
                  <p v-else class="text-gray-400 text-xs">N/A</p>
                </div>
              </div>
              <div
                class="row-span-1 col-span-2 border p-2 flex items-center justify-center"
              >
                <div class="dam-dam">
                  <a v-if="_familyHorse?.dam?.dam" class="font-bold">
                    {{ convertUpCase(_familyHorse?.dam?.dam?.name) }}
                    <p class="text-gray-400 text-xs">
                      {{ _familyHorse?.dam?.dam?.regnr }}
                      {{ _familyHorse?.dam?.dam?.birthyear }}
                      {{ _familyHorse?.dam?.dam?.color }}
                    </p>
                  </a>
                  <p v-else class="text-gray-400 text-xs">N/A</p>
                </div>
              </div>
            </div>
            <div v-for="(data, index) in _competitionHistory" :key="index">
              <recursive-competition-history :horses="data" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
  
<script setup>
import {
  convertUpCase,
  decodedNotes,
  decryptNumber,
} from "/assets/js/functions";
import { ExternalLinkIcon, PlusIcon } from "@heroicons/vue/solid";
import { useRoute } from "vue-router";

const route = useRoute();
const id = decryptNumber(route.params.id, import.meta.env.VITE_ENCRYPT_KEY);
const _familyHorse = ref(null);
const breederid = ref(0);
// Fetch data from the first API
useFetch("/api/familyHorseStore", {
  method: "POST",
  body: JSON.stringify({ id: id, level: 2 }),
  headers: {
    "Content-Type": "application/json",
    "api-key": import.meta.env.VITE_API_KEY,
  },
  transform: (familyHorse) => JSON.parse(familyHorse.body),
}).then((data) => {
  _familyHorse.value = data; // Update _familyHorse with the fetched data
  breederid.value = _familyHorse.value.data[0]?.breeders?.id;
  _familyHorse.value = _familyHorse.value.data[0];
});

// Fetch data from the second API
const { data: _storehorse, execute: fetchSecondApi } = useFetch(
  "/api/storehorseNames",
  {
    method: "POST",
    body: JSON.stringify({ limit: 10, skip: 0, breederid: breederid }),
    headers: {
      "Content-Type": "application/json",
      "api-key": import.meta.env.VITE_API_KEY,
    },
    transform: (storeHhorse) => JSON.parse(storeHhorse.body),
  }
);
watch(_familyHorse, (val) => {
  if (val) {
    fetchSecondApi(); // Execute the second API call with the parameter
  }
});

const _competitionHistory = ref([]);

async function getCompetitionHistory() {
  try {
    _competitionHistory.value = [];
    const { data: fetchedData, error: fetchError } = await useFetch(
      "/api/horse",
      {
        method: "POST",
        body: JSON.stringify({ id: id.toString(), level: 4 }),
        headers: {
          "Content-Type": "application/json",
          "api-key": import.meta.env.VITE_API_KEY,
        },
        transform: (competitionHistory) => JSON.parse(competitionHistory.body),
      }
    );
    if (fetchError.value) {
      error.value = fetchError.value;
    } else {
      _competitionHistory.value = fetchedData.value;
    }
  } catch (err) {
    console.log("Error horse competition history", err);
    // error.value = err;
  } finally {
    // pending.value = false;
  }
}
getCompetitionHistory();
</script>