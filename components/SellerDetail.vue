<template>
  <div class="rounded-lg bg-sky-900 shadow-sm ring-1 ring-gray-900/5 p-6">
    <dl class="flex flex-wrap">
      <div class="flex-auto">
        <div class="text-lg font-semibold leading-6 text-white">
          Contact Seller
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
        class="mt-6 flex w-full flex-none gap-x-4 border-t border-white-900/5 px-6 pt-6"
      >
        <div class="flex-none">
          <span class="sr-only">Client</span>
          <UserCircleIcon class="h-6 w-5 text-white" aria-hidden="true" />
        </div>
        <div class="text-sm font-medium leading-6 text-white">
          {{ seller?.full_name }}
        </div>
      </div>

      <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
        <div class="flex-none">
          <span class="sr-only">Address</span>
          <LocationMarkerIcon class="h-6 w-5 text-white" aria-hidden="true" />
        </div>
        <div class="text-sm leading-6 text-white">
          {{ seller?.location }}
        </div>
      </div>

      <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
        <div class="flex-none">
          <span class="sr-only">Phone</span>
          <PhoneIcon class="h-6 w-5 text-white" aria-hidden="true" />
        </div>
        <div class="text-sm leading-6 text-white">
          <button
            :class="
              !isVisible
                ? 'rounded-md bg-sky-700 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-sky-600/20'
                : ''
            "
            @click="phoneVisibility()"
          >
            {{ isVisible ? seller?.mobile : "Show phone number" }}
          </button>
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

      <!-- Additional details... -->
      <div class="w-full mt-6 px-6 pt-6 border-t border-white-900/5">
        <a
          target="_blank"
          rel="noopener noreferrer"
          :href="
            'https://www.google.com/maps/search/?api=1&query=' +
            seller?.location
          "
          class="text-sm font-semibold leading-6 text-white"
        >
          Show on Google Map <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </dl>
  </div>
</template>
<script setup>
import {
  UserCircleIcon,
  LocationMarkerIcon,
  PhoneIcon,
  MailIcon,
  ExternalLinkIcon,
} from "@heroicons/vue/solid";

// Define props
const props = defineProps({
  seller: { type: Object, default: null },
  adTitle: { type: String, default: "" },
});
const isVisible = ref(false);
const subject = "Inquiry Regarding " + props.adTitle;
const body = `Hi%20${props.seller?.first_name}
  I hope you're doing well. I wanted to check in regarding the ${props.adTitle} you’re selling. Could you please provide an update on availability and any other relevant details?
 
  Looking forward to your response!`;
const emailLink = `mailto:${props.seller?.email}?subject=${subject}&body=${body}`;

const phoneVisibility = () => {
  isVisible.value = !isVisible.value; // Toggle the state
};
</script>