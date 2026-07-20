<template>
  <!-- Root node (CategoTory) -->
  <div>
    <li v-for="(child, index) in data" :key="index">
      <div
        :class="horseId == child.horse_id ? 'sticky horse-select ' : 'sticky'"
      >
        <NuxtLink
          :class="
            addUpperCaseFontBold(
              child?.has_disciplines[0]?.disciplines?.short
            ) + ' pl-1 hover:border-sky-900 hover:text-sky-500'
          "
          :to="`/pedigree/${child.name}/${goTo(child?.horse_id)}`"
        >
          {{ convertUpCase(child.name) }}
        </NuxtLink>
        <p v-for="(studbook_has, index) in child?.studbook_has" :key="index">
          <span class="pl-1 text-slate-500">{{
            studbook_has?.studBook?.abbr
          }}</span>
        </p>
        <p>
          <span class="pl-1 text-slate-700"> S. {{ child?.sire?.name }} </span>
        </p>

        <p v-if="child?.breeders?.contactfname">
          <span class="text-sky-500">Info:</span>
          <NuxtLink
            v-if="child?.breeders?.id"
            class="pl-1 text-green-700"
            :to="'/premium-profile/' + goTo(child?.breeders?.id)"
          >
            {{ child?.breeders?.contactfname }}
            {{ child?.breeders?.contactlname }}
          </NuxtLink>
        </p>
        <p v-else>
          <span v-if="child?.breeders?.breedername" class="pl-1 text-green-700">
            <span class="text-sky-500">Info:</span>
            <NuxtLink
              v-if="child?.breeders?.id"
              class="pl-1 text-green-700"
              :to="'/premium-profile/' + goTo(child?.breeders?.id)"
            >
              {{ child?.breeders?.breedername }}
            </NuxtLink>
          </span>
        </p>
        <p
          v-for="(has_disciplines, index) in child?.has_disciplines"
          :key="index"
        >
          <span
            :class="
              isHighJump(has_disciplines?.disciplines?.short)
                ? 'pl-1 font-bold'
                : 'pl-1'
            "
          >
            {{ has_disciplines?.disciplines?.short }}
          </span>
        </p>
      </div>
      <ul v-if="child?.Offspring?.length">
        <!-- Recursively render offspring -->
        <MarelineTree :data="child.Offspring" :horseId="horseId" />
      </ul>
    </li>
  </div>
</template>
  
  <script setup>
import {
  convertUpCase,
  encryptData,
  shortJumpingInt,
} from "/assets/js/functions";
const highJump130 = 1.3;
const highJump140 = 1.4;
const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  horseId: {
    type: Number,
    default: 0,
  },
});

const isHighJump = (short) => {
  if (shortJumpingInt[short] >= highJump130) return true;
  return false;
};

const addUpperCaseFontBold = (short) => {
  if (shortJumpingInt[short] >= highJump140) return "uppercase font-bold";
  if (shortJumpingInt[short] >= highJump130) return "font-bold";
  return "";
};
const goTo = (id) => {
  // Assuming /horseDetail is the route for horseDetail.vue
  if (id) {
    return `${encryptData(id, import.meta.env.VITE_ENCRYPT_KEY)}`;
  }
  return "#";
};
</script>
  
<style scoped>
/* Tree Styling */
.tree {
  list-style: none;
  padding-left: 0;
}

.tree ul {
  margin: 0 0 0 6em;
  padding: 0;
  list-style: none;
  position: relative;
}

.tree:before,
.tree ul:before {
  content: "";
  display: block;
  width: 0;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-left: 1px solid #ccc;
  background: white;
  z-index: -1;
}

.tree li {
  line-height: 1.2em;
  margin: 0;
  padding: 0.5em 0 0 1.5em;
  position: relative;
}

.tree li:before {
  content: "";
  border-top: 1px solid #ccc;
  display: block;
  height: 100%;
  left: 0;
  margin-top: 1em;
  position: absolute;
  top: 1.5em;
  width: 2em;
}

.tree li:last-child:before {
  background: white;
  bottom: 0;
  height: auto;
  top: 1.5em;
}

.tree > li:before {
  border-top: none;
}

.tree li div {
  border-radius: 4px;
  border: 1px solid #afafaf;
  margin: 0;
  max-width: 12em;
  min-width: 9em;
  padding: 0.5em 1em;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.tree li div:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

/* Sticky Element Styling */
.sticky {
  position: sticky;
  top: 0;
  padding: 5px;
  border: 1px solid #ddd;
  margin-bottom: 5px;
  font-size: 9px;
  background: white;
  z-index: 2;
}

.sticky.horse-select {
  background-color: #ff9988 !important;
  border-color: #ff6666;
}

.sticky {
  color: #369;
}

/* Font and Text Styling */
.font-bold {
  font-weight: bold;
}

/* Mobile and Responsive Adjustments */
@media (max-width: 768px) {
  .tree ul {
    margin: 0 0 0 1em;
  }

  .tree li div {
    max-width: auto;
    min-width: auto;
    padding: 0.5em;
  }

  .sticky {
    font-size: 7px;
  }
}
</style>
