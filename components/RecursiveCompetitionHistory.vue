<template>
  <div>
    <div class="pt-6" v-if="familyTree.length > 0">
      <div
        class="gap-x-8 border rounded"
        v-for="(horse, index) in familyTree.slice(0, familyTree.length - 1)"
        :key="index"
      >
        <!-- set Id -999 when it is the first 1Dam and then set the last previos Dam_id -->
        <HorseFamilyTree
          :horses="horse"
          :level="index"
          :id="index == 0 ? -999 : familyTree[index - 1].dam_id"
        />
      </div>
    </div>
    <div v-else>no data in recursive-competition-history</div>
  </div>
</template>
    
<script setup>
// Define props
const props = defineProps({
  horses: { type: Object, default: null },
});
const byDam = ref([]);
// Watch for changes in props.horses and update familyTree accordingly
watch(
  () => props.horses,
  (data) => {
    familyTree.value = [];
    familyTree.value = genealogyTree(data);
  }
);

watchEffect(() => {
  // This function will be executed whenever the value of `data` changes
});

// Select elements by class name after rendering
onMounted(() => {});

function genealogyTree(data) {
  if (!data) return [];
  if (!data[0] || !data[0].dam) {
    //add genealogy data in the last index
    byDam.value.push({ data: data });
    return addGenealogyData();
  }

  const dam = {
    genealogy: [],
    dam_id: data[0]?.dam?.horse_id,
    birthyear: data[0]?.birthyear,
    horse_id: data[0]?.horse_id,
    name: data[0]?.name,
    sire_name: data[0]?.sire?.name,
  };

  byDam.value.push(dam);
  return genealogyTree([data[0].dam]); // Ensure `lineage` is an array
}

function getLineageDam(data, id) {
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    if (element?.horse_id == id) {
      return element;
    }
    if (element.lineage_dam && element.lineage_dam.length > 0) {
      const result = getLineageDam(element.lineage_dam, id);

      if (result && Object.keys(result).length > 0) {
        data = [];
        return result;
      }
    }
  }
  return [];
}
function addGenealogyData() {
  for (let index = 0; index < byDam.value.length; index++) {
    const element = byDam.value[index];
    const lineageData = byDam.value[byDam.value.length - 1].data;
    const data = getLineageDam(lineageData, element.dam_id);
    byDam.value[index].genealogy = data;
  }

  return byDam.value;
}

const familyTree = ref(genealogyTree(props.horses));
</script>
  
