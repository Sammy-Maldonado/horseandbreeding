<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-extrabold dark:text-white pb-4">
          Find
          <small class="ms-2 font-semibold text-gray-500 dark:text-gray-400">
            {{
              horseType == STALLION
                ? "Stallion"
                : horseType == MARE
                ? "Mare"
                : horseType == NEWHORSE
                ? "horse"
                : horseType
            }}
          </small>
        </h1>
        <p v-if="!data?.length" class="mt-2 text-sm text-gray-700">
          We could not find any
          {{
            horseType == STALLION
              ? "Stallion"
              : horseType == MARE
              ? "Mare"
              : horseType == NEWHORSE
              ? "horse"
              : horseType
          }}.
        </p>
      </div>
      <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none"></div>
    </div>
    <div
      v-if="data?.length"
      class="-mx-4 mt-2 ring-1 ring-gray-300 sm:mx-0 sm:rounded-lg"
    >
      <table class="min-w-full divide-y divide-gray-300">
        <thead>
          <tr>
            <th
              scope="col"
              class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Select
            </th>
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
              Birth Year
            </th>
            <th
              scope="col"
              class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Sire
            </th>
            <th
              scope="col"
              class="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Dam
            </th>

            <th
              scope="col"
              class="hidden px-3 py-3.5 text-right text-sm font-semibold text-gray-900 lg:table-cell"
            >
              Reg Nr.
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(horse, horseIdx) in data" :key="horseIdx">
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                ' text-right px-3 py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              <div class="relative flex items-start">
                <div class="flex h-6 items-center">
                  <input
                    name="plan"
                    type="radio"
                    @click="
                      selectHorse({
                        name: horse?.name,
                        horse_id: horse?.horse_id,
                      })
                    "
                    class="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
              </div>
            </td>

            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-transparent',
                'relative py-4 pl-4 pr-3 text-sm sm:pl-6',
              ]"
            >
              <div class="font-medium text-gray-900">
                {{ convertUpCaseSireOrDam(horse?.name) }}
              </div>

              <div class="mt-1 flex flex-col text-gray-500 sm:block lg:hidden">
                <span class="pr-2" v-if="horse.birthyear != 0"
                  >{{ horse.birthyear }}
                </span>

                <span class="pr-2" v-if="horse.sire?.name">
                  {{ convertUpCaseSireOrDam(horse.sire?.name) }}</span
                >
                <span class="pr-2" v-if="horse.dam?.name">
                  {{ convertUpCaseSireOrDam(horse.dam?.name) }}</span
                >
                <span v-if="horse?.regnr"> {{ horse?.regnr }}</span>
              </div>
              <div
                v-if="horseIdx !== 0"
                class="absolute -top-px left-6 right-0 h-px bg-gray-200"
              />
            </td>

            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden text-right px-3 py-3.5 text-xs text-gray-500 lg:table-cell',
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
              {{ convertUpCaseSireOrDam(horse?.sire?.name) }}
            </td>
            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden px-3 py-3.5 text-xs text-gray-500 lg:table-cell',
              ]"
            >
              {{ convertUpCaseSireOrDam(horse?.dam?.name) }}
            </td>

            <td
              :class="[
                horseIdx === 0 ? '' : 'border-t border-gray-200',
                'hidden px-3 py-3.5 text-xs text-right text-gray-500 lg:table-cell',
              ]"
            >
              <span v-if="horse?.regnr > 0">
                {{ horse?.regnr }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
    
<script setup>
import { convertUpCaseSireOrDam } from "/assets/js/functions";
const STALLION = 0;
const MARE = 2;
const NEWHORSE = -1;

const props = defineProps({
  data: { type: Object, default: [] },
  horseType: { type: Number, default: NEWHORSE },
});

const emit = defineEmits(["select"]);

// submit method
const selectHorse = (horse) => {
  emit("select", horse);
};
</script>