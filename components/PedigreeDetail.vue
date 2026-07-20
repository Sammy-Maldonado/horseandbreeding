<template>
  <div class="px-4 sm:px-6 lg:px-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-extrabold dark:text-white pb-4">
          Pedigree of<small
            class="ms-2 font-semibold text-gray-500 dark:text-gray-400"
          >
            {{ convertUpCaseSireOrDam(horseName) }}
          </small>
        </h1>
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
    <div class="-mx-4 mt-2 ring-1 ring-gray-300 sm:mx-0 sm:rounded-lg">
      <table class="w-full" v-if="pedigrees.length > 0">
        <tbody>
          {{}}
          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="8">
              <pedigree-card
                :moveTo="'/viewdetails/'"
                :horseDetail="pedigrees[0]"
              />
            </td>

            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="4">
              <pedigree-card
                :horseDetail="pedigrees[0].sire"
                :child="pedigrees[0]"
                :sireOrDam="'Sire'"
              />
            </td>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="2">
              <pedigree-card
                :horseDetail="pedigrees[0].sire?.sire"
                :child="pedigrees[0].sire"
                :sireOrDam="'Sire'"
              />
            </td>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <pedigree-card
                :horseDetail="pedigrees[0].sire?.sire?.sire"
                :child="pedigrees[0].sire?.sire"
                :sireOrDam="'Sire'"
              />
            </td>
          </tr>
          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <pedigree-card
                :horseDetail="pedigrees[0].sire?.sire?.dam"
                :child="pedigrees[0].sire?.sire"
                :sireOrDam="'Dam'"
              />
            </td>
          </tr>

          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="2">
              <!-- {{ convertUpCase(pedigrees[0].sire?.dam?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0].sire?.dam"
                :child="pedigrees[0].sire"
                :sireOrDam="'Dam'"
              />
            </td>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <!-- {{ convertUpCase(pedigrees[0].sire?.dam?.sire?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.sire?.dam?.sire"
                :child="pedigrees[0]?.sire?.dam"
                :sireOrDam="'Sire'"
              />
            </td>
          </tr>

          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <!-- {{ convertUpCase(pedigrees[0].sire?.dam?.dam?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.sire?.dam?.dam"
                :child="pedigrees[0]?.sire?.dam"
                :sireOrDam="'Dam'"
              />
            </td>
          </tr>

          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="4">
              <!-- {{ convertUpCase(pedigrees[0].dam?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.dam"
                :child="pedigrees[0]"
                :sireOrDam="'Dam'"
              />
            </td>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="2">
              <!-- {{ convertUpCase(pedigrees[0].dam?.sire?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.dam?.sire"
                :child="pedigrees[0]?.dam"
                :sireOrDam="'Sire'"
              />
            </td>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <!-- {{ convertUpCase(pedigrees[0].dam?.sire?.sire?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.dam?.sire?.sire"
                :child="pedigrees[0]?.dam?.sire"
                :sireOrDam="'Sire'"
              />
            </td>
          </tr>

          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <!-- {{ convertUpCase(pedigrees[0].dam?.sire?.dam?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.dam?.sire?.dam"
                :child="pedigrees[0]?.dam?.sire"
                :sireOrDam="'Dam'"
              />
            </td>
          </tr>

          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="2">
              <!-- {{ convertUpCase(pedigrees[0].dam?.dam?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0]?.dam?.dam"
                :child="pedigrees[0]?.dam"
                :sireOrDam="'Dam'"
              />
            </td>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <!-- {{ convertUpCase(pedigrees[0].dam?.dam?.sire?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0].dam?.dam?.sire"
                :child="pedigrees[0].dam?.dam"
                :sireOrDam="'Sire'"
              />
            </td>
          </tr>

          <tr>
            <td class="border border-slate-300 text-xs pl-4 py-2" rowspan="1">
              <!-- {{ convertUpCase(pedigrees[0].dam?.dam?.dam?.name) }} -->
              <pedigree-card
                :horseDetail="pedigrees[0].dam?.dam?.dam"
                :child="pedigrees[0].dam?.dam"
                :sireOrDam="'Dam'"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
  
  <script setup>
import { convertUpCaseSireOrDam } from "assets/js/functions";

// Define props
const props = defineProps({
  pedigrees: { type: Object, default: null },
  horseName: { type: String, default: null },
});
// viewdetails
</script>