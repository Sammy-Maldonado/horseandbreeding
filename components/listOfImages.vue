<template>
  <div>
    <div
      v-for="(img, index) in images"
      :key="index"
      class="grid grid-cols-2 md:grid-cols-3 gap-4"
    >
      <div>
        <img class="h-auto max-w-full rounded-lg" :src="img" :alt="index" />
      </div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  images: { type: Object, default: null },
});

if (props.images) {
  for (let i = 0; i < props.images.length; i++) {
    const file = props.images[i];
    const reader = new FileReader();
    reader.onloadend = () => {
      previews.value.push(reader.result);
    };
    reader.readAsDataURL(file);
  }
}
</script>