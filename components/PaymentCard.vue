<template>
  <div>
    <div v-for="(tier, index) in pricing.tiers" :key="tier.id">
      <div
        v-if="index == typePlan"
        class="ring-1 ring-white/10 lg:pb-14 lg:ring-0 relative rounded-2xl bg-sky-900"
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
                {{ tier.price[frequency] }}
              </p>
              <div class="text-sm leading-5">
                <p :class="tier.featured ? 'text-gray-900' : 'text-white'">
                  EUR
                </p>
                <p :class="tier.featured ? 'text-gray-600' : 'text-white'">
                  {{ `Billed ${frequency}` }}
                </p>
              </div>
            </div>
            <NuxtLink
              :to="`/premium/premium-info/`"
              :aria-describedby="tier.id"
              :class="[
                tier.featured
                  ? 'bg-sky-950 shadow-sm hover:bg-sky-800 focus-visible:outline-sky-800'
                  : 'bg-sky-800 hover:bg-sky-700 focus-visible:outline-sky-800',
                'rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              ]"
            >
              Change run time
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
</template>

<script setup>
import { ref } from "vue";
import { RadioGroup, RadioGroupOption } from "@headlessui/vue";
import { CheckIcon, ArrowSmRightIcon } from "@heroicons/vue/solid";

const props = defineProps({
  type: {
    type: Number,
    default: 0,
  },
  subscriptionType: {
    type: String,
    default: "Monthly",
  },
});
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
      featured: false,
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

const frequency = ref(props.subscriptionType);
const typePlan = ref(props.type);
</script>