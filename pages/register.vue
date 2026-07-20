<template>
  <div>
    <app-navbar></app-navbar>
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <!-- form -->
      <div class="max-w-xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <h2 class="text-2xl font-bold mb-6">User Registration</h2>
        <form @submit.prevent="registerUser" class="">
          <!-- Name -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="name"
            >
              First Name *
            </label>
            <input
              type="text"
              v-model="form.first_name"
              id="first_name"
              placeholder="Enter your first name"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <!-- Last Name -->
          <div class="mb-4 flex items-center">
            <label
              for="last_name"
              class="block w-1/4 text-sm font-medium text-gray-700"
              >Last Name*</label
            >
            <input
              type="text"
              v-model="form.last_name"
              id="last_name"
              placeholder="Enter your last name"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <!-- Email -->
          <div class="mb-4 flex item-center">
            <label
              for="email"
              class="block w-1/4 text-sm font-medium text-gray-700"
            >
              Email*
            </label>
            <input
              type="email"
              v-model="form.email"
              id="email"
              required
              placeholder="Enter your email"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <!-- Password -->
          <div class="mb-4 flex item-center">
            <label
              for="password"
              class="block w-1/4 text-sm font-medium text-gray-700"
              >Password*</label
            >
            <input
              type="password"
              v-model="form.password"
              id="password"
              required
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              title="Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters"
              placeholder="Enter your password"
              @input="validatePassword"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <!-- Error message if password doesn't meet criteria -->
            <div v-if="messagePassword" class="mt-1 text-red-500 text-sm">
              {{ messagePassword }}
            </div>
          </div>
          <!-- Confirm Password -->
          <div class="mb-4 flex item-center">
            <label
              for="confirm_password"
              class="block w-1/4 text-sm font-medium text-gray-700"
              >Confirm Password*</label
            >
            <input
              type="password"
              v-model="form.confirm_password"
              id="confirm_password"
              required
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
              title="Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters"
              placeholder="Confirm your password"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <!-- farmname -->
          <div class="mb-4 flex item-center">
            <label
              for="farmname"
              class="block w-1/4 text-sm font-medium text-gray-700"
              >Farmname*</label
            >
            <input
              v-model="form.farmname"
              required
              name="farmname"
              type="text"
              minlength="3"
              placeholder="Enter your farmname "
              title="Enter a valid farmname"
              id="farmname"
              autocomplete="farmname"
              class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
          <!-- Mobile -->
          <div class="mb-4 flex item-center">
            <label
              for="phone"
              class="block w-1/4 text-sm font-medium text-gray-700"
            >
              Phone*
            </label>
            <input
              v-model="form.mobile"
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
          <!-- county -->
          <app-select-option name="county" @update:selected="handleCountry">
            <option
              v-for="(val, index) in counties"
              :value="val.id"
              :key="index"
            >
              {{ val.county }}
            </option>
          </app-select-option>
          <!-- Zip Code -->
          <div class="mb-4 flex item-center">
            <label
              for="zip_code"
              class="block w-1/4 text-sm font-medium text-gray-700"
              >Zip Code</label
            >
            <input
              type="text"
              v-model="form.zip_code"
              id="zip_code"
              required
              placeholder="Enter your zip code"
              @input="validateZipCode"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <!-- Error message for invalid zip code -->
            <div v-if="zipCodeError" class="mt-1 text-red-500 text-sm">
              {{ zipCodeError }}
            </div>
          </div>
          <!-- Address -->
          <div class="mb-4 flex item-center">
            <label
              for="address"
              class="block w-1/4 text-sm font-medium text-gray-700"
              >Address</label
            >
            <textarea
              v-model="form.address"
              id="address"
              minlength="5"
              rows="3"
              placeholder="Enter your address"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>

          <div class="px-4 py-6 sm:p-8">
            <!-- Error message if passwords don't match -->
            <div
              v-if="message"
              :class="
                isError
                  ? 'p-4 my-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300'
                  : 'p-4 my-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400'
              "
              role="alert"
            >
              <span class="font-medium">{{
                isError ? "Invalid." : "Successful. "
              }}</span>
              {{ message }}
            </div>
          </div>

          <div
            class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8"
          >
            <!-- Submit Button -->
            <button
              type="submit"
              class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
  
<script setup>
import { reactive } from "vue";
import {
  fetchDataMethodGet,
  fetchDataMethodPost,
} from "../assets/js/functions";

const counties = ref([]);
const isError = ref(false); // To track if it's an error message
const message = ref(""); // To store success/error messages
const messagePassword = ref("");
const zipCodeError = ref("");

const selectTownLabel = () => {
  const option = counties.value.find((opt) => opt.id === form.countyId);
  return option?.county;
};
const form = reactive({
  email: "",
  first_name: "",
  last_name: "",
  town: "",
  countyId: null,
  password: "",
  confirm_password: "",
  address: "",
  mobile: "",
  areaId: null,
  zip_code: "",
  farmname: "",
});

// Zip code validation for Irish format (e.g., D04 Y654)
const validateZipCode = () => {
  const zipCodeRegex = /^[A-Za-z]\d{2} [A-Za-z0-9]{4}$/;
  if (!zipCodeRegex.test(form.zip_code)) {
    zipCodeError.value =
      "Please enter a valid Irish zip code (e.g., A65 X1X0).";
  } else {
    zipCodeError.value = "";
  }
};

const validatePassword = () => {
  // Regex: Min 8 characters, at least one uppercase letter, one lowercase letter
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  if (!passwordRegex.test(form.password)) {
    messagePassword.value =
      "Password must be at least 8 characters long and include both uppercase and lowercase letters.";
  } else {
    messagePassword.value = "";
  }
};

const handleCountry = (val) => {
  form.countyId = val;
  form.town = selectTownLabel();
};

const registerUser = () => {
  // Handle form submission logic
  addUser();
};

const fetchCounties = async () => {
  const url = "/api/counties";
  const key = import.meta.env.VITE_API_KEY;
  counties.value = await fetchDataMethodGet(url, key);
};

onMounted(fetchCounties);

const addUser = async () => {
  const url = "/api/sign-up";
  const key = import.meta.env.VITE_API_KEY;
  const body = form;

  message.value = "";

  // Check if passwords match
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  if (!passwordRegex.test(form.password)) {
    message.value =
      "Password must be at least 8 characters long and include both uppercase and lowercase letters.";
    isError.value = true;
    return;
  }

  if (form.password !== form.confirm_password) {
    message.value = "Passwords do not match. Please check and try again.";
    isError.value = true;
    return; // Stop the form submission
  }

  const response = await fetchDataMethodPost(url, key, body, "POST");

  if (response.statusCode == 200) {
    message.value = response.statusMessage;
    isError.value = false; // Set error state

    setTimeout(() => {
      goToLogin();
    }, 3000);
  } else {
    message.value = response.statusMessage;
    isError.value = true; // Set error state
  }
};

const router = useRouter();
// Function to navigate to the login page
const goToLogin = (url) => {
  router.push("/login");
};
</script>
 
  