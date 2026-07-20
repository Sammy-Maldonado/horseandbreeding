<template>
  <div>
    <app-navbar></app-navbar>
    <div class="mx-auto max-w-7xl sm:w-full px-4 py-8 sm:px-6 lg:px-8 border">
      <div class="text-center pt-10 flex">
        <h1 class="flex-1 text-2xl font-bold tracking-tight text-black">
          Add new horse
        </h1>
      </div>
      <div class="grid grid-cols-7 gap-x-8 gap-y-8 pt-10">
        <div class="hidden md:block lg:block col-span-1"></div>
        <div class="lg:col-span-5 md:col-span-5 sm:col-span-7 col-span-7">
          <form
            class="bg-gray-50 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-4 mx-4"
            @submit.prevent="addHorse"
          >
            <div class="px-4 py-6 sm:p-8">
              <div class="mb-4 flex item-center">
                <label
                  for="ad_title"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                >
                  Ad Title*
                </label>
                <input
                  v-model="formData.ad_title"
                  required
                  placeholder="e.g. Horse with previous competition experience, suitable for amateurs"
                  type="text"
                  name="ad_title"
                  id="ad_title"
                  autocomplete="given-horse"
                  minlength="4"
                  class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              <div class="mb-4 flex item-center">
                <label
                  for="comments"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                >
                  Description*
                </label>
                <textarea
                  v-model="formData.comments"
                  required
                  placeholder="e.g. Brood mare in foal with foal at foot, showing occasional anxiety, likely due to past trauma. Currently in calmness training."
                  id="comments"
                  name="comments"
                  minlength="50"
                  rows="5"
                  class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              <app-select-option name="gender" @update:selected="handleGender"
                ><option
                  v-for="(val, index) in gender"
                  :value="val.idsexe"
                  :key="index"
                >
                  {{ val.type }}
                </option>
              </app-select-option>
              <div class="mb-4 flex item-center">
                <label
                  for="height"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                >
                  Age*
                </label>
                <select
                  v-model="formData.age"
                  required
                  id="currency"
                  name="currency"
                  autocomplete="currency-name"
                  class="block w-full rounded-md border-0 p-2 pb-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="" disabled>Select a age</option>
                  <option value="6 months">6 months</option>
                  <option value="7 months">7 months</option>
                  <option value="8 months">8 months</option>
                  <option value="9 months">9 months</option>
                  <option value="10 months">10 months</option>
                  <option value="11 months">11 months</option>
                  <option value="1 year">1 year</option>
                  <option value="2 years">2 years</option>
                  <option value="3 years">3 years</option>
                  <option value="4 years">4 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
              </div>
              <div class="mb-4 flex item-center">
                <label
                  for="height"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                >
                  Height*
                </label>
                <select
                  v-model="formData.height"
                  required
                  id="currency"
                  name="currency"
                  autocomplete="currency-name"
                  class="block w-full rounded-md border-0 p-2 pb-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                >
                  <option value="" disabled>Select a height</option>
                  <option value="Under 12.0">Under 12.0</option>
                  <option value="12.0 - 12.2">12.0 - 12.2</option>
                  <option value="12.3 - 13.0">12.3 - 13.0</option>
                  <option value="13.1 - 13.2">13.1 - 13.2</option>
                  <option value="13.3 - 14.0">13.3 - 14.0</option>
                  <option value="14.1 - 14.2">14.1 - 14.2</option>
                  <option value="14.3 - 15.0">14.3 - 15.0</option>
                  <option value="15.1 - 15.2">15.1 - 15.2</option>
                  <option value="15.3 - 16.0">15.3 - 16.0</option>
                  <option value="16.1 - 16.2">16.1 - 16.2</option>
                  <option value="16.3 - 17.0">16.3 - 17.0</option>
                  <option value="17.1 - 17.2">17.1 - 17.2</option>
                  <option value="Above 17.2">Above 17.2</option>
                </select>
              </div>

              <div class="mb-4 flex item-center">
                <label
                  for="price"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                >
                  Price*
                </label>
                <select
                  v-model="formData.currency"
                  required
                  id="currency"
                  name="currency"
                  autocomplete="currency-name"
                  class="block w-1/4 mr-4 rounded-md border-0 p-2 pb-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                >
                  <option value="€">Euro (€)</option>
                  <option value="£">Pound (£)</option>
                  <option value="$">Dollar ($)</option>
                </select>
                <input
                  v-model="formData.price"
                  required
                  type="number"
                  name="price"
                  id="price"
                  placeholder="Enter amount, e.g., 1,000"
                  autocomplete="address-level1"
                  class="block w-3/4 rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>

              <div class="mb-4 flex item-center">
                <label
                  for="fullname"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                  >Full name*</label
                >
                <input
                  v-model="formData.fullname"
                  required
                  placeholder="Full name"
                  type="text"
                  name="fullname"
                  id="fullname"
                  autocomplete="given-name"
                  class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>

              <div class="mb-4 flex item-center">
                <label
                  for="telphone"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                  >Phone*</label
                >
                <input
                  v-model="formData.phone"
                  required
                  name="telphone"
                  type="tel"
                  maxlength="15"
                  placeholder="Enter your mobile number"
                  title="Enter a valid phone number"
                  id="telphone"
                  autocomplete="phone-number"
                  class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>

              <div class="mb-4 flex item-center">
                <label
                  for="fullname"
                  class="text-sm leading-6 text-gray-900 mr-4 w-32"
                >
                  E-mail*
                </label>
                <input
                  type="email"
                  v-model="email"
                  disabled
                  name="fullname"
                  id="fullname"
                  autocomplete="given-name"
                  class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              <app-select-option name="county" @update:selected="handleCountry">
                <option
                  v-for="(val, index) in counties"
                  :value="val.id"
                  :key="index"
                >
                  {{ val.county }}
                </option>
              </app-select-option>

              <app-select-option
                name="area"
                @update:selected="handleArea"
                v-if="formData?.countyId >= 0"
                ><option
                  v-for="(val, index) in areas"
                  :value="val.id"
                  :key="index"
                >
                  {{ val.name }}
                </option>
              </app-select-option>

              <!--  -->
            </div>
            <div
              v-if="isError >= 0"
              :class="
                isError
                  ? 'p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300'
                  : 'p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400'
              "
              role="alert"
            >
              <span class="font-medium">{{
                isError ? "Invalid." : "Add horse successful!"
              }}</span>
              {{ message }}
            </div>
            <div
              class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8"
            >
              <button
                type="button"
                @click="resetForm()"
                class="text-sm font-semibold leading-6 text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Save
              </button>
            </div>
          </form>
          <div v-if="horse_id > 0" class="rounded-md bg-gray-50 mx-4 mt-4">
            <upload-image :getPhotosIds="getPhotosIds" :horseId="horse_id" />
          </div>
        </div>
      </div>
    </div>
    <app-modal :show="isModalOpen" @close="closeModal">
      <template #body>
        <app-log-in></app-log-in>
      </template>
    </app-modal>
  </div>
</template>
<script setup>
import { ref } from "vue";
import {
  fetchDataMethodGet,
  fetchDataMethodPost,
} from "../assets/js/functions";
import { fetchWithToken, isLoggedIn } from "@/composables/tokenManager";
const isError = ref(-1); // To track if it's an error message
const message = ref(""); // To store success/error messages
const email = ref("info@horseandbredder.ie");
const isModalOpen = ref(false);
const closeModal = () => {
  isModalOpen.value = false;
  userInfo();
};
const openModal = () => {
  isModalOpen.value = true;
};

const horse_id = ref(0);
const addHorse = async () => {
  const url = "/api/addHorse";
  const body = {
    ad_title: formData.value.ad_title,
    comments: formData.value.comments.replace(/\n/g, "<br>"),
    height: formData.value.height,
    age: formData.value.age,
    sexe: formData.value.sexe,
    currency: formData.value.currency,
    price: formData.value.price,
    fullname: formData.value.fullname,
    phone: formData.value.phone,
    areaId: formData.value.areaId,
    photos: formData.value.photos,
    cover: formData.value.coverPoint,
    horse_type: selectSexeLabel(),
    location: selectAreaLabel(),
  };
  const options = {
    body: JSON.stringify(body),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const response = await fetchWithToken(url, options);

  if (response.ok) {
    const data = await response.json();
    if (data.statusCode == 200) {
      message.value = data.statusMessage;
      horse_id.value = JSON.parse(data.body)?.horse_id ?? 0;
      isError.value = 0; // Set error state
      resetForm();
    } else {
      message.value = data.statusMessage;
      isError.value = 1; // Set error state
      if (data.statusCode == 401) {
        openModal();
      }
    }
  } else {
    if (response.status === 500) {
      message.value =
        " It looks like you're not logged in. Log in to get started on creating your horse!";
      isError.value = 1; // Set error st

      setTimeout(() => {
        openModal();
      }, 3000);
    }
  }

  if (response.ok) {
    setTimeout(() => {
      isError.value = -1;
    }, 10000); // Delay for 10 seconds for user to see the message
  }
};

// Default values for the form data
const defaultFormData = {
  ad_title: "horse 1",
  comments: `3 year old thoroughbred filly by ice breeze ,
Big strong good looking filly
Ready for breaking
Priced to sell`,
  height: "",
  age: "",
  sexe: Number,
  currency: "€",
  price: Number,
  fullname: "",
  phone: "",
  email: "",
  areaId: Number,
  photos: [],
  coverPoint: Number,
  countyId: Number,
};

// Define a single reactive object for form data
const formData = ref({ ...defaultFormData });

// Function to reset all properties
const resetForm = () => {
  formData.value = { ...defaultFormData };
};

const handleCountry = (val) => {
  formData.value.countyId = val;
  fetchAreas();
};
const handleArea = (val) => {
  formData.value.areaId = val;
};
const handleGender = (val) => {
  formData.value.sexe = val;
};
const counties = ref([]);
const areas = ref([]);
const gender = ref([]);
// Fetch Counties from API on component mount
const fetchCounties = async () => {
  const url = "/api/counties";
  const key = import.meta.env.VITE_API_KEY;
  counties.value = await fetchDataMethodGet(url, key);
};

const fetchGender = async () => {
  const url = "/api/gender";
  const key = import.meta.env.VITE_API_KEY;
  gender.value = await fetchDataMethodGet(url, key);
};

const fetchAreas = async () => {
  const url = "/api/areas";
  const key = import.meta.env.VITE_API_KEY;
  const body = { county_id: formData.value.countyId };
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.statusCode == 200) {
    areas.value = JSON.parse(response.body);
  }
};

const getPhotosIds = (cover, files) => {
  formData.value.coverPoint = cover;
  formData.value.photos = files;
};

const selectSexeLabel = () => {
  const option = gender.value.find((opt) => opt.idsexe === formData.value.sexe);
  return option?.type;
};

const selectAreaLabel = () => {
  const option = areas.value.find((opt) => opt.id === formData.value.areaId);
  return option?.full_name;
};

const userInfo = async () => {
  if (isLoggedIn()) {
    const url = "/api/user-info/";
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };
    const response = await fetchWithToken(url, options);
    if (response.ok) {
      const data = await response.json();
      if (data.statusCode == 200) {
        const info = JSON.parse(data.data);
        formData.value.phone = info.mobile;
        email.value = info.email ? info.email : email.value;
        formData.value.fullname = info.first_name + info.last_name;
      }
    }
  }
};

if (!isLoggedIn()) {
  openModal();
}

onMounted(fetchCounties);
onMounted(fetchGender);
onMounted(userInfo);
</script>
  
  