<template>
  <div
    class="max-w-lg mx-auto mt-10 p-6 border border-gray-300 rounded-lg shadow-md"
  >
    <h2 class="text-xl font-semibold text-gray-800 mb-4">Secure Payment</h2>

    <div id="payment-form">
      <div class="grid grid-rows-1 mb-4" id="card-element"></div>

      <button
        type="submit"
        @click="handleSubmit"
        class="w-full py-2 bg-blue-600 text-white font-semibold rounded-sm hover:bg-blue-700 transition duration-200"
      >
        Pay
      </button>
      <app-message :message="paymentResult" :isError="isError" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { loadStripe } from "@stripe/stripe-js";

/**
 * Collects the card and confirms the payment the server priced.
 *
 * Authoritative decision:
 * `docs/adr/ADR-010-server-side-payment-amount-authority.md`.
 *
 * This component used to hold its own copy of the price table, work out what the
 * customer owed, and post that number to `/api/create-payment-intent`. It no
 * longer knows any price. It sends the plan the customer chose and the server
 * decides what that costs, which is the only arrangement in which the amount
 * cannot be edited in a browser.
 *
 * The button therefore reads a plain "Pay": `PaymentCard.vue` renders the price
 * beside this form on the same page, and a component that no longer knows the
 * amount must not display one.
 */

const paymentResult = ref("");
const isError = ref(false);
let stripe, cardElement;

const props = defineProps({
  /** The plan's position in the premium catalogue, as it arrives in the URL. */
  type: {
    type: Number,
    default: 0,
  },
  /**
   * "monthly" or "annually" — lower case, matching the values
   * `components/payment.vue` puts in the link and the server prices against.
   * This defaulted to "Monthly", which no catalogue key has ever matched; the
   * server now refuses that spelling outright rather than mispricing it.
   */
  subscriptionType: {
    type: String,
    default: "monthly",
  },
});

const config = useRuntimeConfig();
const appId = config.public.appId;

// `loadStripe` injects https://js.stripe.com/v3/ itself. A `useHead` script tag
// used to load it a second time, from the same origin, on every render of this
// page.
const stripePromise = loadStripe(String(config.public.stripe.publishableKey));

onMounted(async () => {
  stripe = await stripePromise;
  const elements = stripe.elements();
  cardElement = elements.create("card");
  cardElement.mount("#card-element");
});

const handleSubmit = async () => {
  paymentResult.value = "";

  try {
    // The body names the plan and nothing else. There is deliberately no
    // `amount` and no `currency`: the server ignores both, and sending them
    // would only imply they were worth something.
    //
    // `$fetch`, not `useFetch`: this runs on a click rather than in setup, and
    // it must throw on a refusal. The route answers with real status codes now —
    // 400, 422, 500 — where it previously replied 200 to every outcome and hid
    // the real result in a JSON string inside the body.
    const { clientSecret } = await $fetch("/api/create-payment-intent", {
      method: "POST",
      body: {
        tier: props.type,
        frequency: props.subscriptionType,
      },
    });

    const { paymentIntent, error } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } }
    );

    if (error) {
      paymentResult.value = `Payment failed: ${error.message}`;
      isError.value = true;
    } else {
      paymentResult.value = `Payment successful! Payment ID: <b>${paymentIntent.id}</b>`;
      isError.value = false;
    }
  } catch (error) {
    isError.value = true;
    // A refusal from our own route arrives as a fetch error carrying the status
    // message we chose; anything else falls back to its own.
    paymentResult.value = `Error: ${error.data?.statusMessage ?? error.message}`;
  }
};
</script>

<style scoped>
#card-element {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}
button {
  background-color: #6772e5;
  color: white;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background-color: #5469d4;
}
</style>
