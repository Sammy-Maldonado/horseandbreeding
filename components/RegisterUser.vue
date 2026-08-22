<template>
  <!-- form -->
  <div class="mt-10 mx-5 w-full">
    <form @submit.prevent="registerUser">
      <!-- Name -->
      <div class="mb-4 flex items-center">
        <label class="text-sm leading-6 text-gray-900 mr-4 w-32" for="name">
          First Name *
        </label>
        <input
          type="text"
          v-model="form.data.first_name"
          id="first_name"
          placeholder="Enter your first name"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <!-- Last Name -->
      <div class="mb-4 flex items-center">
        <label for="last_name" class="text-sm leading-6 text-gray-900 mr-4 w-32"
          >Last Name*</label
        >
        <input
          type="text"
          v-model="form.data.last_name"
          id="last_name"
          placeholder="Enter your last name"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <!-- farmname -->
      <div class="mb-4 flex item-center">
        <label for="farmname" class="text-sm leading-6 text-gray-900 mr-4 w-32"
          >Farmname*</label
        >
        <input
          v-model="form.data.farmname"
          required
          name="farmname"
          type="text"
          minlength="3"
          placeholder="Enter your farmname "
          title="Enter a valid farmname"
          id="farmname"
          autocomplete="farmname"
          class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
      </div>
      <!-- Mobile -->
      <div class="mb-4 flex item-center">
        <label for="phone" class="text-sm leading-6 text-gray-900 mr-4 w-32">
          Phone*
        </label>
        <input
          v-model="form.data.mobile"
          required
          name="telphone"
          type="tel"
          maxlength="15"
          placeholder="Enter your mobile number"
          title="Enter a valid phone number"
          id="telphone"
          autocomplete="phone-number"
          class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
      </div>
      <!-- county -->
      <app-select-option
        name="county"
        @update:selected="handleCountry"
        :val="form.data.countyId"
      >
        <option value="0" disabled>No county</option>
        <option v-for="(val, index) in counties" :value="val.id" :key="index">
          {{ val.county }}
        </option>
      </app-select-option>
      <!-- Zip Code -->
      <div class="mb-4 flex item-center">
        <label for="zip_code" class="text-sm leading-6 text-gray-900 mr-4 w-32"
          >Zip Code*</label
        >
        <input
          type="text"
          v-model="form.data.zip_code"
          id="zip_code"
          required
          placeholder="Enter your zip code"
          @input="validateZipCode"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <!-- Address -->
      <div class="mb-4 flex item-center">
        <label for="address" class="text-sm leading-6 text-gray-900 mr-4 w-32"
          >Address*</label
        >
        <textarea
          v-model="form.data.address"
          id="address"
          minlength="5"
          rows="3"
          required
          placeholder="Enter your address"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>
      <div
        class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8"
      >
        <!-- Submit Button -->
        <button
          type="submit"
          class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Register
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { fetchDataMethodGet } from "../assets/js/functions";

const emit = defineEmits(["getStatus"]);
const props = defineProps({
  userData: {
    type: Object,
    default: () => ({}), // Correct way to set an object default in Vue 3
  },
});
const counties = ref([]);
const userInfo = ref({});
const selectTownLabel = () => {
  const option = counties.value.find((opt) => opt.id === form.data.countyId);
  return option?.county;
};
// Reactive form object
const form = reactive({
  data: {
    first_name: "",
    last_name: "",
    town: "",
    countyId: null,
    address: "",
    mobile: "",
    zip_code: "",
    farmname: "",
  },
  userInfo: {
    email: String,
    password: String,
  },
});

const handleCountry = (val) => {
  form.data.countyId = val;
  form.data.town = selectTownLabel();
};

const fetchCounties = async () => {
  const url = "/api/counties";
  counties.value = await fetchDataMethodGet(url);
};

onMounted(fetchCounties);

// Signs an existing customer in through the one password boundary the API has
// (POST /api/login, credentials in the body — never in a URL) and prefills the
// contact form from the authenticated profile read. The access token lives in
// this call and nowhere else: the wizard's final PUT authenticates with the
// password again, so nothing needs to be stored (HOR-98).
const signInAndPrefill = async () => {
  let login;
  try {
    login = await $fetch("/api/login", {
      method: "POST",
      body: {
        email: userInfo.value.email,
        password: userInfo.value.password,
      },
    });
  } catch (err) {
    if (err?.statusCode === 401 || err?.statusCode === 400) {
      // The server's own words: "Invalid email or password." — the same
      // answer whether the address is unknown or the password wrong.
      emit(
        "getStatus",
        {
          statusCode: err.statusCode,
          message: err.data?.statusMessage ?? "Invalid email or password.",
        },
        false
      );
      return;
    }
    console.error("Signing in failed with status:", err?.statusCode);
    emit(
      "getStatus",
      {
        statusCode: 500,
        message: "An unexpected error occurred. Please try again later.",
      },
      false
    );
    return;
  }

  try {
    const response = await $fetch("/api/user-profile", {
      headers: {
        Authorization: `Bearer ${login.accessToken}`,
      },
    });
    form.data = { ...form.data, ...response.profile };
    emit(
      "getStatus",
      {
        statusCode: 200,
        message: "Welcome back! Your details have been filled in for you.",
      },
      true
    );
  } catch (err) {
    // The sign-in itself succeeded; a failed prefill only costs some typing.
    console.error("Prefilling the profile failed with status:", err?.statusCode);
    emit(
      "getStatus",
      {
        statusCode: 200,
        message: "You are signed in. Please fill in your contact details.",
      },
      true
    );
  }
};

// Watch for changes to the userData prop and update the form
watch(
  () => props.userData,
  (newVal) => {
    if (newVal) {
      userInfo.value = newVal ?? {};
      if (userInfo.value?.email) {
        if (userInfo.value.mode === "new") {
          // A new customer: no account to check against. Any duplicate email
          // is answered by the final save itself, not by a pre-check.
          emit(
            "getStatus",
            {
              statusCode: 200,
              message: "Please fill in your contact details.",
            },
            true
          );
        } else {
          signInAndPrefill();
        }
      }
    }
  },
  { immediate: true, deep: true } // Immediate watch to update the form initially if needed
);

const registerUser = async () => {
  // Same double-fire as `fetchUser`: `onResponseError` used to overwrite the
  // status the server actually returned (HOR-96).
  let answered = false;
  try {
    await useFetch("/api/user", {
      method: "PUT",
      body: JSON.stringify({
        userData: form.data,
        // Only what the endpoint reads — the wizard's account-mode choice is
        // client state and stays out of the request.
        userInfo: {
          email: userInfo.value.email,
          password: userInfo.value.password,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
      transform: (user) => user,
      onResponse({ response }) {
        const _data = response._data;
        // if (_data.statusCode === 200) {
        //   const userDetail = JSON.parse(_data.body);
        //   form.data = data;
        //   form.data = userDetail;
        // }
        if (typeof _data?.statusCode !== "number") {
          return;
        }
        answered = true;
        let next =
          _data.statusCode === 200 || _data.statusCode === 404 ? true : false;
        emit(
          "getStatus",
          {
            statusCode: _data.statusCode,
            message: _data.statusMessage,
          },
          next
        );
        // setTimeout(() => {}, 1500);
      },
      onResponseError() {
        if (answered) {
          return;
        }
        let message = "An unexpected error occurred. Please try again later.";
        emit("getStatus", { statusCode: 500, message: message }, false);
      },
    });
  } catch (err) {
    console.error("Error logging in:", err);
    let message = "An unexpected error occurred. Please try again later.";
    emit("getStatus", { statusCode: 500, message: message }, false);
  }
};
</script>
 
  