<template>
  <div class="col-span-full p-4">
    <div
      v-if="isError >= 0"
      :class="
        isError
          ? 'p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300 pb-2'
          : 'p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400 pb-2'
      "
      role="alert"
    >
      <span class="font-medium">{{
        isError ? "Invalid credentials. " + message : message
      }}</span>
    </div>

    <form @submit.prevent="UploadPhotos">
      <input
        id="file-upload"
        type="file"
        @change="handleFileChange"
        accept="image/*"
        multiple
        class="hidden"
        ref="fileInput"
      />
      <button key="photo-key" type="button" @click.prevent="UploadPhotos">
        Upload Images
      </button>
    </form>
    <button
      type="button"
      @click.prevent="UploadPhotos()"
      class="rounded-md bg-sky-950 px-3 py-2 text-sm text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      Upload Images
    </button>

    PNG, JPG, GIF
    <div
      class="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-3 gap-2 border p-2 rounded"
    >
      <figure
        class="relative max-w-sm"
        v-for="(img, index) in images"
        :key="index"
      >
        <img class="rounded-lg" :src="img" :alt="'Image-' + (index + 1)" />
        <figcaption class="absolute px-4 text-lg text-white top-1 right-1">
          <button
            type="button"
            class="absolute top-0 right-0 p-1 bg-red-600 rounded-lg opacity-50"
            @click="removeImage(index)"
          >
            <TrashIcon class="h-5 w-5 text-white" aria-hidden="true" />
          </button>
        </figcaption>
        <figcaption
          :class="[
            'absolute px-2 text-lg text-white top-1 left-1',
            index === coverPoint
              ? 'rounded-lg bg-green-500 opacity-75'
              : 'opacity-50',
          ]"
        >
          <button
            type="button"
            :class="[
              'absolute top-0 left-0 p-1 rounded-lg',
              index === coverPoint ? '' : 'bg-amber-500',
            ]"
            @click="setCover(index)"
          >
            <StarIcon
              :class="[
                'h-5 w-5 text-white',
                index === coverPoint ? 'fill-amber-500 opacity-100' : '',
              ]"
              aria-hidden="true"
            />
          </button>
          <p class="pl-5 opacity-100" v-if="index === coverPoint">Cover</p>
        </figcaption>
      </figure>
      <div
        class="relative rounded-lg bg-slate-100 h-24 w-20 flex items-center justify-center"
      >
        <button
          type="button"
          @click="openFilePicker"
          id="photo_ids"
          class="rounded-full bg-sky-950 p-2 text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center justify-center"
        >
          <PlusIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { PlusIcon, TrashIcon, StarIcon } from "@heroicons/vue/solid";
import { fetchWithToken } from "@/composables/tokenManager";
const props = defineProps({
  getPhotosIds: {
    type: Function,
    required: true,
  },
  horseId: {
    type: Number,
    default: 0,
  },
});
const isError = ref(-1); // To track if it's an error message
const message = ref(""); // To store success/error messages
const uploadedImages = ref([]);
const images = ref([]);
const fileInput = ref(null);
const coverPoint = ref(0);

const openFilePicker = () => {
  fileInput.value.click();
};

const handleFileChange = (event) => {
  const files = event.target.files;
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB size limit
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        alert(
          `Invalid file type: ${file.name}. Only PNG, JPG, and GIF are allowed.`
        );
        continue;
      }
      // Validate file size
      if (file.size > maxSizeInBytes) {
        alert(
          `File size too large: ${file.name}. Maximum allowed size is 5MB.`
        );
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        images.value.push(reader.result);
        uploadedImages.value.push(file);
      };
      reader.readAsDataURL(file);
    }
  }
};

const UploadPhotos = async (event) => {
  message.value = "";
  try {
    if (uploadedImages.value.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < uploadedImages.value.length; i++) {
      formData.append("files", uploadedImages.value[i]);
    }
    formData.append("horseId", props.horseId);
    formData.append("cover", coverPoint.value);
    const response = await fetchWithToken("/api/uploadImages", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.statusCode == 200) {
        message.value = data.statusMessage;
        isError.value = 0; // Set error state
        // resetForm();
      } else {
        message.value = data.statusMessage;
        isError.value = 1; // Set error state
      }

      // uploadedImages.value = [];
      // images.value = [];
      props.getPhotosIds(coverPoint.value, data.files);
    } else {
      isError.value = 1;
      message.value = " Image upload error ";
    }
  } catch (error) {
    console.error("Image upload error:", error);
    isError.value = 1;
    message.value = " Image upload error ";
  }
};

const removeImage = (index) => {
  if (images.value.length > 0) {
    coverPoint.value =
      coverPoint.value >= index
        ? Math.max(0, coverPoint.value - 1)
        : coverPoint.value;
    images.value.splice(index, 1);
    uploadedImages.value.splice(index, 1);
  }
};

const setCover = (index) => {
  coverPoint.value = index;
};
</script>
