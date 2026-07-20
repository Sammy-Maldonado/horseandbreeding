<template>
  <!-- Recursively render children if they exist -->
  <div>
    <ul
      :class="horses?.genealogy ? 'relative rounded' : 'relative rounded pl-4'"
      v-for="(child, key) in horses"
      :key="key"
    >
      <li
        v-if="key == 'genealogy'"
        class="text-white rounded bg-sky-900 shadow-sm ring-1 ring-gray-900/5 text-xs p-2"
      >
        <div>{{ relationshipLevel[level] }}</div>
        {{ child?.birthyear }}
        <NuxtLink
          class="hover:border-sky-700 hover:text-sky-500"
          :to="goHorseDetailLink(child?.horse_id)"
        >
          {{ convertUpCase(child?.name) }}
        </NuxtLink>
        ({{ child?.predicates ? child.predicates : "" }}, {{ child?.color }},
        mare by {{ convertUpCase(child?.sire?.name) }})
        <div class="pl-4">
          dam of {{ child?.lineage_dam?.length }}
          horses
          {{ child?.remarks }}
          <div class="pl-8 pr-2" v-html="child?.remarks"></div>
        </div>
      </li>
      <li
        v-else-if="child?.name"
        :class="
          !sw
            ? 'bg-sky-100 text-xs rounded-sm ring-1'
            : 'bg-sky-200 text-xs rounded-sm ring-1'
        "
      >
        {{ child.birthyear }}
        <ClientOnly>
          <Popper>
            <UserCircleIcon
              v-if="child?.breeders?.breedername"
              ref="trigger"
              class="h-4 w-3 text-sky-900 hover:text-sky-500"
              aria-hidden="true"
            />
            <template #content>
              <!-- <div>This is the Popper content</div> -->
              <div class="rounded-md bg-sky-800">
                <div class="flex">
                  <div>
                    <div class="mt-1 flex w-full flex-none gap-x-2 px-3">
                      <div class="flex-none">
                        <UserCircleIcon
                          class="h-6 w-5 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <div class="text-xs leading-6 text-white border-b">
                        {{ child?.breeders?.breedername || "N/A" }}
                      </div>
                    </div>

                    <div class="mt-1 flex w-full flex-none gap-x-2 px-3">
                      <div class="flex-none">
                        <PhoneIcon
                          class="h-6 w-5 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <div class="text-xs leading-6 text-white">
                        {{ child?.breeders?.tel || "N/A" }}
                      </div>
                    </div>

                    <div class="mt-1 flex w-full flex-none gap-x-2 px-3">
                      <div class="flex-none">
                        <MailIcon
                          class="h-6 w-5 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <div class="text-xs leading-6 text-white">
                        <NuxtLink
                          :to="
                            email(
                              child?.breeders?.email,
                              child?.breeders?.breedername
                            )
                          "
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <div class="text-xs leading-6 text-white">Email</div>
                        </NuxtLink>
                      </div>
                    </div>

                    <div class="mt-1 flex w-full flex-none gap-x-2 px-3">
                      <div class="flex-none">
                        <ExternalLinkIcon
                          class="h-6 w-5 text-white"
                          aria-hidden="true"
                        />
                      </div>
                      <div class="text-xs leading-6 text-white">
                        <NuxtLink
                          target="_blank"
                          rel="noopener noreferrer"
                          :to="
                            getAbsoluteUrl(child?.breeders?.website) ||
                            'https://google.com'
                          "
                          class="text-xs font-semibold leading-6 text-white"
                        >
                          Visit Our Website
                        </NuxtLink>
                      </div>
                    </div>

                    <!-- <p>{{ child?.breeders?.farmname }}</p> -->
                    <div class="mt-1 mb-1 flex w-full flex-none gap-x-2 px-3">
                      <NuxtLink
                        target="_blank"
                        rel="noopener noreferrer"
                        :to="
                          getAbsoluteUrl(child?.breeders?.mapref) ||
                          'https://maps.google.com'
                        "
                        class="text-xs font-semibold leading-6 text-white"
                      >
                        Map on Google <span aria-hidden="true">&rarr;</span>
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </div>
              <!--  -->
            </template>
          </Popper>
        </ClientOnly>

        <NuxtLink
          :class="
            addUpperCaseFontBold(
              child?.has_disciplines[0]?.disciplines?.short
            ) + ' pl-1 hover:border-sky-900 hover:text-sky-500'
          "
          :to="goHorseDetailLink(child?.horse_id)"
        >
          {{ convertUpCase(child.name) + ":" }}
        </NuxtLink>
        <span
          :class="
            isHighJump(child?.has_disciplines[0]?.disciplines?.short)
              ? 'pl-1 font-bold'
              : 'pl-1'
          "
        >
          {{ child?.has_disciplines[0]?.disciplines?.short }}
        </span>
        ({{ child?.predicates ? child.predicates : "" }}, {{ child?.color }},
        mare by {{ convertUpCase(child.sire?.name) }})
        <!-- when remarks is igual to <br /> or lenght is 6 -->
        <div v-if="removeSpaces(child?.remarks)?.length > 6">
          <div class="pl-8 pr-2" v-html="removeSpaces(child?.remarks)"></div>
        </div>
      </li>
      <HorseFamilyTree
        v-if="child?.horse_id !== id"
        :horses="child?.lineage_dam"
        :id="id"
        :level="level"
        :sw="!sw"
      />
    </ul>
  </div>
</template>
  
<script setup>
import Popper from "vue3-popper";
import {
  UserCircleIcon,
  LocationMarkerIcon,
  PhoneIcon,
  MailIcon,
  ExternalLinkIcon,
} from "@heroicons/vue/solid";

import {
  convertUpCase,
  getAbsoluteUrl,
  email,
  encryptData,
  shortJumpingInt,
} from "/assets/js/functions";
// Define a ref for the trigger element
const trigger = ref(null);
const relationshipLevel = [
  "1st Dam",
  "2nd Dam",
  "3rd Dam",
  "4th Dam",
  "5th Dam",
  "6th Dam",
  "7th Dam",
  "8th Dam",
  "9th Dam",
];
const props = defineProps({
  horses: Object || Array, // Define the type of the horse prop
  id: Number,
  level: Number,
  sw: true,
});
const highJump130 = 1.3;
const highJump140 = 1.4;
const goHorseDetailLink = (id) => {
  // Assuming /horseDetail is the route for horseDetail.vue
  if (id) {
    return `../PremiumHorseDetail/${encryptData(
      id,
      import.meta.env.VITE_ENCRYPT_KEY
    )}`;
  }
  return "#";
};
const removeSpaces = (str) => {
  return str?.trim(); // This will remove all spaces (including tabs and newlines)
};
const isHighJump = (short) => {
  if (shortJumpingInt[short] >= highJump130) return true;
  return false;
};

const addUpperCaseFontBold = (short) => {
  if (shortJumpingInt[short] >= highJump140) return "uppercase font-bold";
  if (shortJumpingInt[short] >= highJump130) return "font-bold";
  return "";
};
</script>
  