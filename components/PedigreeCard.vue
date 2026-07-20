<template>
  <div>
    <NuxtLink
      v-if="!convertUpCaseSireOrDam(horseDetail?.name)"
      :class="
        ' text-sm hover:border-sky-900 hover:text-sky-500' +
          horseDetail?.has_disciplines?.length >
        0
          ? addUpperCaseFontBold(
              horseDetail?.has_disciplines[0]?.disciplines?.short
            )
          : ''
      "
      :to="'/editdetails/' + goTo(child?.horse_id)"
    >
      <div class="py-2">
        <span
          v-if="child?.horse_id"
          class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {{ "Add " + sireOrDam }}
        </span>
      </div>
    </NuxtLink>
    <NuxtLink
      v-else
      :class="
        horseDetail?.has_disciplines?.length > 0
          ? addUpperCaseFontBold(
              horseDetail?.has_disciplines[0]?.disciplines?.short
            ) + ' text-sm hover:border-sky-900 hover:text-sky-500 text-sky-900'
          : 'text-sm hover:border-sky-900 hover:text-sky-500 text-sky-900'
      "
      :to="`${moveTo}${horseDetail.name}/${goTo(horseDetail?.horse_id)}`"
    >
      {{ convertUpCaseSireOrDam(horseDetail?.name) }}
    </NuxtLink>
    <div v-if="horseDetail?.studbook_has?.studbook_id == 52">
      XX, <span> {{ horseDetail?.regnr }}</span>
    </div>
    <div v-else-if="horseDetail?.studbook_has?.length > 0">
      <span v-if="horseDetail?.studbook_has[0]?.studBook?.abbr">
        {{ horseDetail?.studbook_has[0]?.studBook?.abbr }}
      </span>
      <span
        class="pr-1"
        v-if="
          horseDetail?.studbook_has[0]?.studBook?.abbr &&
          horseDetail?.regnr &&
          horseDetail?.regnr != 0
        "
        >,</span
      >
      <span v-if="horseDetail?.regnr">
        <span v-if="horseDetail?.regnr != 0"> {{ horseDetail?.regnr }}</span>
      </span>
    </div>

    <div>
      <span v-if="horseDetail?.type_horse?.type" class="pr-1">{{
        horseDetail?.type_horse?.type
      }}</span>
      <span
        v-if="horseDetail?.birthyear && horseDetail?.birthyear != 0"
        class="pr-1"
      >
        {{ horseDetail?.birthyear }}
      </span>
      <span v-if="horseDetail?.color">
        {{ getColorDescription(horseDetail?.color) }}
      </span>
      <span v-if="horseDetail?.height && horseDetail?.height > 0" class="pr-1">
        <span v-if="parseFloat(horseDetail?.height) < 3"
          >{{ horseDetail?.height }}m</span
        >
        <span v-else>{{ horseDetail?.height / 100 }}m</span>
      </span>
    </div>
    <div>
      <span v-if="horseDetail?.has_approvedby?.length > 0">Lic.</span>
      <span v-for="(app, index) in horseDetail?.has_approvedby" :key="index">
        <span v-if="index != horseDetail?.has_approvedby.length - 1">
          {{ app?.approvedly?.breed_code }},
        </span>
        <span v-else> {{ app?.approvedly?.breed_code }} </span>
      </span>
    </div>
    <p v-if="horseDetail?.breeders?.breedername">
      <span class="text-sky-500">Info:</span>
      <NuxtLink
        v-if="horseDetail?.breeders?.id"
        class="pl-1 text-green-700"
        :to="'/premium-profile/' + goTo(horseDetail?.breeders?.id)"
      >
        {{
          horseDetail?.breeders?.breedername
            ? horseDetail?.breeders?.breedername
            : horseDetail?.breeders?.farmname
        }}
      </NuxtLink>
    </p>
    <div>
      <span class="">
        {{
          horseDetail?.remarks_short ||
          (horseDetail?.has_disciplines?.length > 0
            ? horseDetail?.has_disciplines[0]?.disciplines?.short
            : "")
        }}
      </span>
    </div>
  </div>
</template>
<script setup>
import {
  convertUpCaseSireOrDam,
  encryptData,
  shortJumpingInt,
  getColorDescription,
} from "/assets/js/functions";
// Define props

const props = defineProps({
  horseDetail: { type: Object, default: [] },
  moveTo: { type: String, default: "/pedigree/" },
  sireOrDam: {
    type: String,
    default: "Sire",
  },
  child: { type: Object, default: [] },
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