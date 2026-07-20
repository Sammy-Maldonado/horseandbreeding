<template>
  <div class="lg:col-start-1 lg:row-end-1">
    <div class="rounded-lg bg-sky-900 shadow-sm ring-1 ring-gray-900/5 p-6">
      <dl class="flex flex-wrap">
        <div class="flex-auto">
          <div class="text-sm font-semibold leading-6 text-white">
            Contact Information
          </div>
        </div>
        <div class="self-end">
          <div class="sr-only">Email</div>
          <a :href="emailLink" target="_blank" rel="noopener noreferrer">
            <div
              class="rounded-md bg-sky-700 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-sky-600/20"
            >
              Email
            </div>
          </a>
        </div>
        <div
          class="mt-6 flex items-center justify-center w-full flex-none gap-x-4 border-t px-6 pt-6"
        >
          <img
            class="col-span-2 rounded-md lg:col-span-1 h-20 lg:h-24 w-20 lg:w-24"
            :src="breederDetail?.logo || '/logo.jpg'"
            alt="Transistor"
            width="158"
            height="48"
          />
        </div>
        <div
          class="mt-6 flex w-full flex-none gap-x-4 border-gray-900/5 px-6 pt-6"
        >
          <div class="flex-none">
            <span class="sr-only">Client</span>
            <UserCircleIcon class="h-6 w-5 text-white" aria-hidden="true" />
          </div>
          <div class="text-sm font-medium leading-6 text-white">
            {{ breederDetail?.breedername || "N/A" }}
          </div>
        </div>

        <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
          <div class="flex-none">
            <span class="sr-only">Address</span>
            <LocationMarkerIcon class="h-6 w-5 text-white" aria-hidden="true" />
          </div>
          <div class="text-sm leading-6 text-white">
            {{ breederDetail?.addr1.replace(/\r?\n/g, "") || "N/A" }}
          </div>
        </div>

        <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
          <div class="flex-none">
            <span class="sr-only">Phone</span>
            <PhoneIcon class="h-6 w-5 text-white" aria-hidden="true" />
          </div>
          <div class="text-sm leading-6 text-white">
            {{ breederDetail?.tel || "N/A" }}
          </div>
        </div>

        <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
          <div class="flex-none">
            <span class="sr-only">Email</span>
            <MailIcon class="h-6 w-5 text-white" aria-hidden="true" />
          </div>
          <div class="text-sm leading-6 text-white">
            <a :href="emailLink" target="_blank" rel="noopener noreferrer">
              Email
            </a>
          </div>
        </div>

        <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
          <div class="flex-none">
            <span class="sr-only">Web site</span>
            <ExternalLinkIcon class="h-6 w-5 text-white" aria-hidden="true" />
          </div>
          <div class="text-sm leading-6 text-white">
            <a
              target="_blank"
              rel="noopener noreferrer"
              :href="
                getAbsoluteUrl(breederDetail?.website) || 'https://google.com'
              "
              class="text-sm font-semibold leading-6 text-white"
            >
              Visit Our Website
            </a>
          </div>
        </div>
        <!-- Additional details... -->
        <div class="mt-6 border-t border-gray-900/5 px-6 pt-6">
          <a
            target="_blank"
            rel="noopener noreferrer"
            :href="
              getAbsoluteUrl(breederDetail?.mapref) || 'https://maps.google.com'
            "
            class="text-sm font-semibold leading-6 text-white"
          >
            Show on Google Map <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </dl>
    </div>
  </div>
</template>
  
  <script setup>
import {
  UserCircleIcon,
  LocationMarkerIcon,
  PhoneIcon,
  MailIcon,
  ExternalLinkIcon,
} from "@heroicons/vue/solid"; // Adjust the path based on your project structure

const props = defineProps(["breederDetail"]);
const emailLink = `mailto:${props.breederDetail?.email}?subject=Subject%20of%20the%20email&body=Hi%20${props.breederDetail?.breedername}`;
const getAbsoluteUrl = (website) => {
  if (website && website.startsWith("www.")) {
    return "https://" + website;
  } else if (website && !website.startsWith("http")) {
    return "https://www." + website;
  }
  return website;
};
</script>
  