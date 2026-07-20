<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
    <!-- Pricing section -->
    <div class="isolate overflow-hidden">
      <div class="flow-root">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="relative z-10">
            <h1
              class="mx-auto max-w-4xl text-center text-3xl font-bold tracking-tight text-sky-950"
            >
              Flexible Plans for Every Horse Enthusiast
            </h1>
            <p
              class="mx-auto mt-4 max-w-2xl text-center text-lg leading-8 text-black/60"
            >
              Whether you're buying, selling, or breeding horses, we have the
              perfect plan to meet your needs. Access advanced features for
              genealogy, mare lines, and exclusive horse listings.
            </p>

            <div class="mt-16 flex justify-center">
              <fieldset aria-label="Payment frequency">
                <RadioGroup
                  v-model="frequency"
                  class="grid grid-cols-2 gap-x-1 rounded-full bg-gray-300 p-1 text-center text-xs font-semibold leading-5 text-white"
                >
                  <RadioGroupOption
                    as="template"
                    v-for="option in pricing.frequencies"
                    :key="option.value"
                    :value="option"
                    v-slot="{ checked }"
                  >
                    <div
                      :class="[
                        checked ? 'bg-sky-500' : '',
                        'cursor-pointer rounded-full px-2.5 py-1',
                      ]"
                    >
                      {{ option.label }}
                    </div>
                  </RadioGroupOption>
                </RadioGroup>
              </fieldset>
            </div>
          </div>
          <div
            class="relative mx-auto mt-10 grid max-w-md grid-cols-1 gap-y-8 lg:mx-0 lg:-mb-14 lg:max-w-none lg:grid-cols-3"
          >
            <svg
              viewBox="0 0 1208 1024"
              aria-hidden="true"
              class="absolute -bottom-48 left-1/2 h-[64rem] -translate-x-1/2 translate-y-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] lg:-top-48 lg:bottom-auto lg:translate-y-0"
            >
              <defs>
                <radialGradient id="d25c25d4-6d43-4bf9-b9ac-1842a30a4867">
                  <stop stop-color="#7775D6" />
                  <stop offset="1" stop-color="#E935C1" />
                </radialGradient>
              </defs>
            </svg>
            <div
              class="hidden lg:absolute lg:inset-x-px lg:bottom-0 lg:top-4 lg:block lg:rounded-t-2xl lg:ring-1 lg:ring-white/10"
              aria-hidden="true"
            />
            <div
              v-for="(tier, index) in pricing.tiers"
              :key="tier.id"
              :class="[
                tier.featured
                  ? 'z-10 bg-white shadow-xl ring-1 ring-gray-900/10'
                  : 'bg-sky-900 ring-1 ring-white/10 lg:mt-5 lg:pb-14 lg:ring-0',
                'relative rounded-2xl',
              ]"
            >
              <div class="p-8 lg:pt-12 xl:p-10 xl:pt-14">
                <h2
                  :id="tier.id"
                  :class="[
                    tier.featured ? 'text-gray-900' : 'text-white',
                    'text-sm font-semibold leading-6',
                  ]"
                >
                  {{ tier.name }}
                </h2>
                <div
                  class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-stretch"
                >
                  <div class="mt-2 flex items-center gap-x-4">
                    <p
                      :class="[
                        tier.featured ? 'text-gray-900' : 'text-white',
                        'text-4xl font-bold tracking-tight',
                      ]"
                    >
                      {{ tier.price[frequency.value] }}
                    </p>
                    <div class="text-sm leading-5">
                      <p
                        :class="tier.featured ? 'text-gray-900' : 'text-white'"
                      >
                        EUR
                      </p>
                      <p
                        :class="tier.featured ? 'text-gray-600' : 'text-white'"
                      >
                        {{ `Billed ${frequency.value}` }}
                      </p>
                    </div>
                  </div>
                  <NuxtLink
                    :to="`/premium/register/${index}/${frequency.value}/`"
                    :aria-describedby="tier.id"
                    :class="[
                      tier.featured
                        ? 'bg-sky-950 shadow-sm hover:bg-sky-800 focus-visible:outline-sky-800'
                        : 'bg-sky-800 hover:bg-sky-700 focus-visible:outline-sky-800',
                      'rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    ]"
                  >
                    Buy this plan
                  </NuxtLink>
                </div>
                <div class="mt-8 flow-root sm:mt-10">
                  <ul
                    role="list"
                    :class="[
                      tier.featured
                        ? 'divide-sky-950/5 border-sky-950/5 text-gray-600'
                        : 'divide-white/5 border-white/5 text-white',
                      '-my-2 divide-y border-t text-sm leading-6 lg:border-t-0',
                    ]"
                  >
                    <li
                      v-for="mainFeature in tier.highlights"
                      :key="mainFeature"
                      class="flex gap-x-3 py-2"
                    >
                      <CheckIcon
                        :class="[
                          tier.featured ? 'text-sky-600' : 'text-sky-950',
                          'h-6 w-5 flex-none text-sky-800',
                        ]"
                        aria-hidden="true"
                      />
                      {{ mainFeature }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="relative bg-white lg:pt-14"></div>
    </div>
  </div>
</template>
  
  <script setup>
import { ref } from "vue";
import { RadioGroup, RadioGroupOption } from "@headlessui/vue";
import { CheckIcon, ArrowSmRightIcon } from "@heroicons/vue/solid";

const pricing = {
  frequencies: [
    { value: "monthly", label: "Monthly" },
    { value: "annually", label: "Annually" },
  ],
  tiers: [
    {
      name: "Basic Access",
      id: "plan-basic",
      href: "#",
      featured: false,
      description:
        "Access essential features for viewing and exploring horses.",
      price: { monthly: "€19", annually: "€199" },
      highlights: [
        "View horse listings",
        "Access basic genealogy tree",
        "Limited mare line reports",
        "Basic search filters",
      ],
    },
    {
      name: "Pro Access",
      id: "plan-pro",
      href: "#",
      featured: true,
      description: "Enhanced features for serious buyers and sellers.",
      price: { monthly: "€49", annually: "€499" },
      highlights: [
        "Post horses for sale",
        "Unlimited viewing of genealogy trees",
        "Comprehensive mare line reports",
        "Advanced search filters",
        "Priority listing for horses",
        "Receive buyer inquiries",
      ],
    },
    {
      name: "Elite Access",
      id: "plan-elite",
      href: "#",
      featured: false,
      description:
        "Full suite of premium services for horse breeders and investors.",
      price: { monthly: "€99", annually: "€999" },
      highlights: [
        "Post unlimited horses for sale",
        "Access to full genealogy and breeding history",
        "Detailed mare line reports",
        "Featured horse promotion on homepage",
        "Custom search alerts for new listings",
        "Access exclusive horse auctions",
        "24/7 customer support",
      ],
    },
  ],
};

const frequency = ref(pricing.frequencies[0]);
</script>