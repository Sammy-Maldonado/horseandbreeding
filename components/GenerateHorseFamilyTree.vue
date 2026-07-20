<template>
  <!-- Recursively render children if they exist -->
  <div style="margin-left: 20px; margin-top: 0; padding: 0; line-height: 80%">
    <div style="line-height: 80%" v-for="(child, key) in horses" :key="key">
      <div v-if="childrenHaveDiscipline(child)">
        <p>
          <span
            v-if="child?.has_disciplines?.length > 0"
            :style="addUpperCaseFontBoldStyle(child?.has_disciplines[0]?.group)"
          >
            {{ convertUpCase(child.name) }}:
          </span>
          <span v-else> {{ convertUpCase(child.name) }}: </span>

          <span
            v-for="(has_dis, key) in child?.has_disciplines"
            :key="key"
            :style="`text-transform: lowercase; ${addFontBoldStyle(
              has_dis?.group
            )}`"
          >
            {{ has_dis?.short ? has_dis?.short : "" }}
          </span>
          <span v-if="child?.birthyear > 0"> ({{ child?.birthyear }}) </span>
          <span v-if="child?.remarks_short">{{ child?.remarks_short }} </span>
        </p>

        <!-- &#80; -->

        <div
          style="margin-left: 30px"
          v-html="removeSpaces(child?.remarks)"
        ></div>
        <generate-horse-family-tree :horses="child?.lineage_dam" />
      </div>
    </div>
  </div>
</template>
    
<script setup>
import {
  convertUpCase,
  addUpperCaseFontBoldStyle,
  addFontBoldStyle,
} from "/assets/js/functions";
const props = defineProps({
  horses: Object || Array, // Define the type of the horse prop
});
const removeSpaces = (str) => {
  return str?.trim(); // This will remove all spaces (including tabs and newlines)
};

const visitedNodes = new WeakSet();

const childrenHaveDiscipline = (horse) => {
  // Base case: invalid horse object
  if (!horse) {
    return false;
  }

  // Prevent infinite recursion
  if (visitedNodes.has(horse)) {
    return false;
  }
  visitedNodes.add(horse);

  // Check if the current horse has disciplines
  if (horse?.has_disciplines?.length) {
    return true;
  }

  // Check lineage recursively
  if (horse.lineage_dam && Array.isArray(horse.lineage_dam)) {
    for (const child of horse.lineage_dam) {
      if (childrenHaveDiscipline(child)) {
        return true; // Found a child with disciplines
      }
    }
  }

  // If no disciplines found in this horse or its lineage
  return false;
};
</script>
    