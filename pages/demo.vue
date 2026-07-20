<template>
  <main class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
    <div
      class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
    >
      <!-- Invoice summary -->
      <div class="lg:col-start-1 lg:row-end-1">
        <div class="rounded-lg bg-gray-50 shadow-sm ring-1 ring-gray-900/5 p-6">
          <dl class="flex flex-wrap">
            <div class="flex-auto">
              <dt class="text-sm font-semibold leading-6 text-gray-900">
                Contact Information
              </dt>
              <dd class="mt-1 text-base font-semibold leading-6 text-gray-900">
                $ 1.00
              </dd>
            </div>
            <div class="self-end pt-4">
              <dt class="sr-only">Status</dt>
              <dd
                class="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-inset ring-green-600/20"
              >
                Email
              </dd>
            </div>
            <div
              class="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6"
            >
              <img
                class="col-span-2 max-h-12 w-full object-contain lg:col-span-1"
                src="https://tailwindui.com/img/logos/158x48/transistor-logo-gray-900.svg"
                alt="Transistor"
                width="158"
                height="48"
              />
            </div>
            <div
              class="mt-6 flex w-full flex-none gap-x-4 border-gray-900/5 px-6 pt-6"
            >
              <dt class="flex-none">
                <span class="sr-only">Client</span>
                <UserCircleIcon
                  class="h-6 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </dt>
              <dd class="text-sm font-medium leading-6 text-gray-900">
                {{ contact.breedername }}
              </dd>
            </div>
            <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt class="flex-none">
                <span class="sr-only">Address</span>
                <LocationMarkerIcon
                  class="h-6 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </dt>
              <dd class="text-sm leading-6 text-gray-500">
                <time datetime="2023-01-31">
                  {{ contact.addr1 }}
                </time>
              </dd>
            </div>
            <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt class="flex-none">
                <span class="sr-only">phone</span>
                <PhoneIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />
              </dt>
              <dd class="text-sm leading-6 text-gray-500">{{ contact.tel }}</dd>
            </div>

            <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt class="flex-none">
                <span class="sr-only">mail</span>
                <MailIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />
              </dt>
              <dd class="text-sm leading-6 text-gray-500">
                {{ contact.email }}
              </dd>
            </div>

            <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
              <dt class="flex-none">
                <span class="sr-only">web</span>
                <ExternalLinkIcon
                  class="h-6 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </dt>
              <dd class="text-sm leading-6 text-gray-500">
                {{ contact.website }}
              </dd>
            </div>
            <!-- Additional details... -->
          </dl>
          <div class="mt-6 border-t border-gray-900/5 px-6 pt-6">
            <a
              :href="contact.mapref"
              class="text-sm font-semibold leading-6 text-gray-900"
              >Show on Google Map <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Invoice -->
      <div
        class="px-4 py-8 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pb-20 xl:pt-16"
      >
        <h2 class="text-base font-semibold leading-6 text-gray-900">
          Morningside Stud
        </h2>
        <p class="mt-2 text-sm text-gray-500">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum.
        </p>
        <!-- "mt-6 grid grid-cols-1 text-sm leading-6 sm:grid-cols-2 -->
        <dl
          class="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-1 md:grid-cols-2 md:gap-y-8 sm:gap-y-4 lg:grid-cols-3 lg:gap-x-8 xl:grid-cols-3"
        >
          <div v-for="order in orders" :key="order.id" class="group relative">
            <div
              class="aspect-h-1 aspect-w-1 overflow-hidden rounded-md bg-gray-200 group-hover:opacity-75"
            >
              <img
                :src="order.imageSrc"
                :alt="order.imageAlt"
                class="object-cover object-center"
              />
            </div>
            <h3 class="mt-4 text-sm text-gray-500">
              <a :href="order.href">
                <span class="absolute inset-0" />
                ABC Landliebe (1994)
              </a>
            </h3>
            <p class="mt-1 text-lg font-medium">
              <span v-if="order.status === 'delivered1'" class="text-gray-900">
                ABC Landliebe (
                <time :datetime="order.datetime">{{ order.date }}</time>
                )
              </span>
              <span class="text-gray-500">EKSTEINE x CONDIOS x ORLANDO</span>
            </p>
          </div>
        </dl>
      </div>
    </div>
  </main>
</template>
  
  <script>
export default {
  data() {
    return {
      contact: [],
    };
  },
  async mounted() {
    try {
      const response = await $fetch("/api/breeder");
      // Check if the response has a 'data' property
      console.log("API Response:", response);
      if (response.status == 200) {
        // Assuming response.data is a JSON string
        const parsedData = JSON.parse(response.body);
        this.contact = parsedData[0];
      } else {
        console.error("API response is missing the 'data' property:", response);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  },
};
</script>
  