<template>
  <div style="margin: 0; padding: 0">
    <div
      style="list-style: none; margin: 0; padding: 0"
      v-for="(horse, index) in familyTree"
      :key="index"
    >
      <div style="margin: 0; padding: 0">
        <br />
        <p
          style="
            font-family: Arial Black;
            font-weight: 700;
            margin: 0;
            padding: 0;
          "
        >
          {{ relationshipLevel[index] }}
        </p>
        <p>
          <span
            :style="`margin: 0; padding: 0;${addUpperCaseFontBoldStyle(
              horse?.has_disciplines[0]?.group
            )}`"
          >
            {{ convertUpCase(horse?.name) }}:
          </span>
          <span
            v-for="(has_dis, key) in horse?.has_disciplines"
            :key="key"
            :style="addFontBoldStyle(has_dis?.group)"
          >
            {{ has_dis?.short }}
          </span>

          <span v-if="horse?.birthyear > 0"> ({{ horse?.birthyear }}) </span>
          <span v-if="horse?.remarks_short">{{ horse?.remarks_short }} </span>
        </p>
        <div
          style="margin-left: 30px"
          v-if="horse?.remarks"
          v-html="horse?.remarks"
        ></div>
      </div>
      <!-- set Id -999 when it is the first 1Dam and then set the last previos Dam_id -->
      <generate-horse-family-tree :horses="horse?.lineage_dam" />
    </div>
  </div>
</template>
    
<script setup>
import {
  convertUpCase,
  addUpperCaseFontBoldStyle,
  addFontBoldStyle,
} from "/assets/js/functions";
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
  horses: { type: Object, default: [] },
});
// Watch for changes in props.horses and update familyTree accordingly
watch(
  () => props.horses,
  (data) => {
    familyTree.value = [];
    familyTree.value = data;
  }
);

const familyTree = ref(props.horses);
</script>
  
