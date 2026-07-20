<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-extrabold dark:text-white pb-4">
          Search results for<small
            class="ms-2 font-semibold text-gray-500 dark:text-gray-400"
          >
            "{{ convertUpCaseSireOrDam(searchTexts) }}"
          </small>
        </h1>
        <p v-if="data?.length" class="mt-2 text-sm text-gray-700">
          Found
          <strong class="font-semibold text-gray-900">{{ total }} </strong>
          results.
        </p>
        <p v-else class="mt-2 text-sm text-gray-700">
          No results found for "{{ searchTexts }}". Please try a different
          search term.
        </p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
        <!-- <button
            type="button"
            class="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Update credit card
          </button> -->
      </div>
    </div>
    <div class="-mx-4 mt-10 ring-1 ring-gray-300 sm:mx-0 sm:rounded-lg">
      <table class="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
            >
              Name
            </th>

            <th
              scope="col"
              class="hidden px-3 py-3.5 text-right text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Year
            </th>
            <th
              scope="col"
              class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Sire
            </th>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Dam
            </th>
            <th
              scope="col"
              class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Dam Sire
            </th>
            <th
              scope="col"
              class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              StudBook
            </th>
            <th
              scope="col"
              class="hidden px-3 py-3.5 text-right pr-4 text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Reg. No.
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(horse, horseIdx) in data" :key="horseIdx">
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-transparent',
                'relative py-4 pl-4 pr-3 text-sm sm:pl-6',
              ]"
            >
              <div class="font-medium text-gray-900">
                <NuxtLink
                  :class="
                    horse?.has_disciplines?.length > 0
                      ? addUpperCaseFontBold(
                          horse?.has_disciplines[0]?.disciplines?.short
                        ) +
                        ' text-sm hover:border-sky-900 hover:text-sky-500 text-sky-900'
                      : 'text-sm hover:border-sky-900 hover:text-sky-500 text-sky-900'
                  "
                  :to="`/pedigree/${horse.name}/${goTo(horse?.horse_id)}`"
                >
                  {{ convertUpCaseSireOrDam(horse?.name) }}
                </NuxtLink>
              </div>
              <div class="mt-1 flex flex-col text-gray-500 sm:block lg:hidden">
                <span v-if="horse.birthyear != 0">{{ horse.birthyear }} </span>
                <span class="pr-1" v-if="horse.birthyear != 0">,</span>
                <span> {{ horse.sire?.name }}</span>
                <span class="pr-1" v-if="horse.sire?.name">,</span>
                <span>{{ horse?.dam?.sire?.name }}</span>
                <span class="pr-1" v-if="horse?.dam?.sire?.name">,</span>
                <span v-if="horse?.studbook_has?.length > 0">
                  {{ horse?.studbook_has[0]?.studBook?.abbr }}
                </span>
                <span v-if="horse?.regnr != 0">,</span>
                <span class="pr-1"
                  >{{ horse?.regnr != 0 ? horse?.regnr : "" }}
                </span>
              </div>
              <div
                v-if="horseIdx !== 0"
                class="absolute -top-px left-6 right-0 h-px bg-gray-200"
              />
            </td>
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden px-3 text-right py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              {{ horse.birthyear != 0 ? horse.birthyear : "-" }}
            </td>
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden px-3 py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              {{ horse?.sire?.name }}
            </td>
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'relative py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              {{ horse?.dam?.name }}
            </td>
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden px-3 py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              {{ horse?.dam?.sire?.name }}
            </td>

            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden px-3 py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              <span v-if="horse?.studbook_has?.length > 0">
                {{ horse?.studbook_has[0]?.studBook?.abbr }}
              </span>
            </td>

            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden pr-4 text-right py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              {{ horse?.regnr != 0 ? horse?.regnr : "N/A" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import {
  convertUpCaseSireOrDam,
  encryptData,
  shortJumpingInt,
} from "/assets/js/functions";

const props = defineProps({
  data: { type: Object, default: [] },
  searchTexts: { type: String, default: "" },
  total: { type: Number, default: 0 },
});

const isHighJump = (short) => {
  if (shortJumpingInt[short] >= highJump130) return true;
  return false;
};
const highJump130 = 1.3;
const highJump140 = 1.4;
const addUpperCaseFontBold = (short) => {
  try {
    if (shortJumpingInt[short] >= highJump140) return "uppercase font-bold";
    if (shortJumpingInt[short] >= highJump130) return "font-bold";
    return "";
  } catch (error) {
    return "";
  }
};
const goTo = (id) => {
  // Assuming /horseDetailDetail is the route for horseDetailDetail.vue
  if (id) {
    return `${encryptData(id, import.meta.env.VITE_ENCRYPT_KEY)}`;
  }
  return "#";
};
</script>