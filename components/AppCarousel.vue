<template  >
  <Carousel v-model="initialSlide">
    <Slide v-for="(photo, index) in photos" :key="index">
      <img
        :src="'/uploadImages/' + photo.photo_id"
        :alt="photo.title"
        class="h-full w-full object-cover object-center sm:rounded-lg"
      />
    </Slide>
    <template #addons>
      <!-- Slider controls -->
      <Navigation />
      <Pagination />
    </template>
  </Carousel>
</template>
<script setup>
import { computed } from "vue";
import "vue3-carousel/dist/carousel.css";

import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
import { Carousel, Navigation, Pagination, Slide } from "vue3-carousel";
const props = defineProps({
  photos: {
    type: Object,
  },
  position: {
    type: Number,
  },
});
// Use computed to reactively update initialSlide
const initialSlide = computed(() => props.position);
// Function to close the modal
const closeModal = () => {
  props.close();
};
</script> 
<style  >
.carousel__prev,
.carousel__next {
  width: 25px; /* Set the desired width */
  height: 25px; /* Set the desired height */
  background-color: rgb(3 105 161 / var(--tw-bg-opacity));
  border-radius: 50%; /* Makes the box circular */
  box-sizing: border-box;
  border: 2px solid white;
  color: white;
}
</style>