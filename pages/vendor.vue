<template>
  <div class="space-y-10 divide-y divide-gray-900/10">
    <div class="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
      <div class="px-4 sm:px-0">
        <h2 class="text-base font-semibold leading-7 text-gray-900">
          Welcome to Premium Membership!
        </h2>
        <p class="mt-1 text-sm leading-6 text-gray-600">
          Our premium membership is available for a discounted price. Thanks for
          considering upgrading. When you upgrade to a premium account, you'll
          have access to exclusive features and benefits designed to enhance
          your experience.
        </p>
      </div>

      <form
        class="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2"
        @submit.prevent="addVendor"
      >
        <div class="px-4 py-6 sm:p-8">
          <div
            class="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6"
          >
            <div class="sm:col-span-3">
              <label
                for="fullname"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Full name</label
              >
              <div class="mt-2">
                <input
                  v-model="vendorName"
                  type="text"
                  name="fullname"
                  id="fullname"
                  autocomplete="given-name"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div class="sm:col-span-3">
              <label
                for="telphone"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Contact</label
              >
              <div class="mt-2">
                <input
                  v-model="vendorContact"
                  type="text"
                  name="telphone"
                  pattern="[0-9]{10}"
                  id="telphone"
                  title="Ten digits code"
                  required
                  autocomplete="phone-number"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div class="col-span-full">
              <label
                for="street-address"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Street address</label
              >
              <div class="mt-2">
                <input
                  v-model="vendorAddress"
                  type="text"
                  name="street-address"
                  id="street-address"
                  autocomplete="street-address"
                  class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <!--  -->
            <div class="col-span-full">
              <label
                for="photo"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Photo</label
              >
              <div class="mt-2 flex items-center gap-x-3">
                <UserCircleIcon
                  class="h-12 w-12 text-gray-300"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  class="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Change
                </button>
              </div>
            </div>

            <div class="col-span-full">
              <label
                for="cover-photo"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Cover photo</label
              >
              <div
                class="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10"
              >
                <div class="text-center">
                  <div class="mt-4 flex text-sm leading-6 text-gray-600">
                    <label
                      for="file-upload"
                      class="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        class="sr-only"
                      />
                    </label>
                    <p class="pl-1">or drag and drop</p>
                  </div>
                  <p class="text-xs leading-5 text-gray-600">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8"
        >
          <button
            type="button"
            class="text-sm font-semibold leading-6 text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
<script setup>
import { UserCircleIcon } from "@heroicons/vue/solid";
import { ref } from "vue";
const vendorName = ref("");

const vendorContact = ref("");
const vendorAddress = ref("");
const addVendor = async () => {
  const { data: _storehorses } = await useFetch("/api/vendor", {
    method: "POST",
    params: {
      name: vendorName.value,
      contact: vendorContact.value,
      address: vendorAddress.value,
    },
    headers: {
      "Content-Type": "application/json",
      "api-key": import.meta.env.VITE_API_KEY,
    },
    transform: (storehorses) => JSON.parse(storehorses.body),
  });
};
</script>

