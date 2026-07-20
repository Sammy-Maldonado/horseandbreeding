<template  >
  <div v-if="photos.length > 0">
    <Carousel
      id="gallery"
      :items-to-show="1"
      :wrap-around="false"
      v-model="initialSlide"
    >
      <Slide v-for="(photo, index) in photos" :key="index">
        <div class="carousel__item">
          <div class="relative">
            <div class="relative h-96 w-auto overflow-hidden rounded-lg">
              <img
                :src="
                  photo?.photo_id
                    ? '/uploadImages/' + photo?.photo_id
                    : '/img/cardtrick.jpg'
                "
                :alt="photo?.title || ''"
                class="h-full w-auto object-cover object-center"
              />
            </div>
          </div>
        </div>
      </Slide>
      <template #addons>
        <!-- Slider controls -->
        <Navigation />
        <Pagination />
      </template>
    </Carousel>

    <Carousel
      id="thumbnails"
      :items-to-show="photos.length < 5 ? photos.length : 4"
      :wrap-around="true"
      v-model="initialSlide"
      ref="carousel"
    >
      <Slide v-for="(photo, index) in photos" :key="index">
        <div class="carousel__item pt-2" @click="slideTo(index)">
          <div class="relative">
            <div
              class="relative lg:h-32 lg:w-40 md:h-32 md:w-40 sm:h-24 sm:w-36 h-12 w-16 overflow-hidden rounded-lg"
            >
              <img
                :src="
                  photo?.photo_id
                    ? '/uploadImages/' + photo?.photo_id
                    : '/img/cardtrick.jpg'
                "
                :alt="photo?.title || ''"
                class="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </Slide>
    </Carousel>
  </div>
</template>

<script setup>
import { Carousel, Slide, Navigation, Pagination } from "vue3-carousel";
import "vue3-carousel/dist/carousel.css";

const props = defineProps({
  photos: {
    type: Object,
  },
  position: {
    type: Number,
  },
});
// Use computed to reactively update initialSlide
const initialSlide = ref(0);

const slideTo = (val) => {
  initialSlide.value = val;
};
// Function to close the modal
const closeModal = () => {
  props.close();
};
</script>  
<style  >
.carousel__prev,
.carousel__next {
  width: 2rem; /* Set the desired width */
  height: 2rem; /* Set the desired height */
  background-color: white;
  border-radius: 50%; /* Makes the box circular */
  box-sizing: border-box;
  border: 2px solid rgb(3 105 161 / var(--tw-bg-opacity));
  color: rgb(3 105 161 / var(--tw-bg-opacity));
}
</style>