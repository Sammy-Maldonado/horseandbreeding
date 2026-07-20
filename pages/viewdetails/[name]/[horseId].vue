<template>
  <div>
    <app-navbar />

    <div class="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 class="text-2xl font-extrabold dark:text-white pb-4">
        View
        <small class="ms-2 font-semibold text-gray-500 dark:text-gray-400">
          {{ convertUpCaseSireOrDam(route.params.name) }}
        </small>
      </h1>
      <horse-details-menu :horseId="horseId" :horseName="route.params.name" />
      <div v-if="horseInfo" class="pb-4">
        <!-- Name of the Horse -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="name"
          >
            Name of the Horse:
          </label>
          <input
            :value="convertUpCaseSireOrDam(horseInfo.name)"
            type="text"
            id="name"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Approved -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="approved"
          >
            Approved:
          </label>
          <input
            type="text"
            v-if="horseInfo?.has_approvedby?.length"
            :value="`${
              horseInfo?.has_approvedby[0]?.approvedly?.approvedby || ''
            } (${horseInfo?.has_approvedby[0]?.approvedly?.breed_code || ''})`"
            id="approved"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
          <input
            type="text"
            v-else
            value=""
            id="approved"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Sexe and Birthyear (side by side) -->
        <div class="mb-4 flex space-x-4">
          <!-- Sexe -->
          <div class="flex-1 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="sexe"
            >
              Sexe:
            </label>
            <input
              type="text"
              :value="horseInfo.type_horse?.type"
              id="sexe"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
              disabled
            />
          </div>

          <!-- Birthyear -->
          <div class="flex-1 flex items-center justify-end">
            <label
              class="block w-auto text-sm font-medium text-gray-700"
              for="birthyear"
            >
              Birthyear:
            </label>
            <input
              v-model="horseInfo.birthyear"
              type="number"
              id="birthyear"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
              disabled
            />
          </div>
        </div>

        <!-- Sire -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="sire"
          >
            Sire:
          </label>
          <input
            :value="convertUpCaseSireOrDam(horseInfo?.sire?.name)"
            type="text"
            id="sire"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Dam -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="dam"
          >
            Dam:
          </label>
          <input
            :value="convertUpCaseSireOrDam(horseInfo?.dam?.name)"
            type="text"
            id="dam"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Studbook -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="studbook"
          >
            Studbook:
          </label>
          <input
            v-if="horseInfo?.studbook_has?.length"
            :value="`${horseInfo.studbook_has[0]?.studBook?.name} (${horseInfo.studbook_has[0]?.studBook?.abbr})`"
            type="text"
            id="studbook"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
          <input
            type="text"
            v-else
            value=""
            id="studbook"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Reg Nr -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="regNr"
          >
            Reg Nr:
          </label>
          <input
            v-model="horseInfo.regnr"
            type="text"
            id="regNr"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Color -->

        <!-- Sexe and Birthyear (side by side) -->
        <div class="mb-4 flex space-x-4">
          <!-- Sexe -->
          <div class="flex-1 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="sexe"
            >
              Color:
            </label>
            <input
              type="text"
              :value="`${convertUpCase(getColorDescription(horseInfo.color))}(${
                horseInfo.color
              })`"
              id="color"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
              disabled
            />
          </div>

          <!-- Birthyear -->
          <div class="flex-1 flex items-center justify-end">
            <label
              class="block w-auto text-sm font-medium text-gray-700"
              for="birthyear"
            >
              Height:
            </label>

            <input
              :value="getHeight(horseInfo?.height)"
              type="text"
              id="birthyear"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
              disabled
            />
          </div>
        </div>

        <!-- Alias -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="alias"
          >
            Alias:
          </label>
          <input
            v-model="horseInfo.alias"
            type="text"
            id="alias"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Sport results -->
        <div class="mb-4 flex items-center">
          <div>
            <h2 class="text-sm font-medium text-gray-700">Sport results:</h2>
            <ul
              role="list"
              class="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2"
            >
              <li
                v-for="(has_dis, index) in horseInfo?.has_disciplines"
                :key="index"
                class="col-span-1 flex rounded-md shadow-sm"
              >
                <div
                  class="flex bg-sky-700 w-20 flex-shrink-0 items-center justify-center rounded-l-md text-sm font-medium text-white"
                >
                  {{ has_dis?.disciplines?.value }}
                </div>
                <div
                  class="flex flex-1 items-center justify-between truncate rounded-r-md border-b border-r border-t border-gray-200 bg-white"
                >
                  <div class="flex-1 truncate px-4 py-2 text-sm">
                    <strong class="font-medium">
                      {{ has_dis?.disciplines?.disciplines?.diciplines }}
                    </strong>
                    <p class="text-gray-500 text-sm">
                      Short:
                      <strong class="text-gray-900">{{
                        has_dis?.disciplines?.short
                      }}</strong>
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Sports Results Governing Body -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="competitionAuthority"
          >
            Sports Results Governing Body:
          </label>
          <input
            v-model="horseInfo.competitionAuthority"
            type="text"
            id="competitionAuthority"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Rider/Export: -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="remarks_short"
          >
            Rider/Export::
          </label>
          <input
            v-model="horseInfo.remarks_short"
            type="text"
            id="remarks_short"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            disabled
          />
        </div>

        <!-- Remarks (long): -->
        <div class="mb-4 flex items-center">
          <label
            class="block w-1/4 text-sm font-medium text-gray-700"
            for="remarks"
          >
            Remarks (long):
          </label>
          <div
            id="remarks"
            class="mt-1 block w-3/4 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            v-html="horseInfo.remarks"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
  
  <script setup>
import { SwitchVerticalIcon } from "@heroicons/vue/solid";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  fetchDataMethodPost,
  decryptNumber,
  getColorDescription,
  convertUpCase,
  convertUpCaseSireOrDam,
} from "../../../assets/js/functions";
const route = useRoute();
const horseId = decryptNumber(
  route.params.horseId,
  import.meta.env.VITE_ENCRYPT_KEY
);

const horseInfo = ref([]);

const fetchStoreHorseInfoId = async () => {
  const url = "/api/store-horse-info-id";
  const key = import.meta.env.VITE_API_KEY;
  const body = { id: horseId };
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    horseInfo.value = JSON.parse(response.body);
  }
};

onMounted(() => {
  fetchStoreHorseInfoId();
});

const getHeight = (height) => {
  let heghtVal = parseFloat(height) < 3 ? height : height / 100;
  return heghtVal + " metres ";
};
</script>