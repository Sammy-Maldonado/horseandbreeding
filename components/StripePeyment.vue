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
        class="w-full py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition duration-200"
      >
        Pay {{ pricing.tiers[type].price[subscriptionType] }}
      </button>
      <app-message :message="paymentResult" :isError="isError" />
    </div>
  </div>
</template>
  
<script setup>
import { ref, onMounted } from "vue";
import { useHead } from "unhead";
import { loadStripe } from "@stripe/stripe-js";
// Define props
const paymentResult = ref("");
let stripe, cardElement;
const isError = ref(false);
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

// Pricing structure
const pricing = {
  tiers: [
    { price: { monthly: "€19", annually: "€199" } },
    { price: { monthly: "€49", annually: "€499" } },
    { price: { monthly: "€99", annually: "€999" } },
  ],
};

const config = useRuntimeConfig();
const appId = config.public.appId;
// Load the public key from environment variables

// Load Stripe script with `useHead`
useHead({
  script: [
    {
      src: "https://js.stripe.com/v3/",
      defer: true,
    },
  ],
});
let stripePublicKey = String(config.public.stripe.publishableKey);
const stripePromise = loadStripe(stripePublicKey);
// Initialize Stripe Elements on mount
onMounted(async () => {
  stripe = await stripePromise;
  const elements = stripe.elements();
  cardElement = elements.create("card");
  cardElement.mount("#card-element");
});
// Function to handle form submission
const handleSubmit = async () => {
  paymentResult.value = "";
  let amount = pricing.tiers[props.type].price[props.subscriptionType];

  try {
    // Call your server to create a PaymentIntent
    const { data: client } = await useFetch("/api/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": import.meta.env.VITE_API_KEY,
      },
      body: JSON.stringify({
        amount: parseFloat(amount.replace("€", "")) * 100,
        currency: "eur",
      }),
      transform: (data) => JSON.parse(data.body),
    });

    // Confirm the card payment
    const { paymentIntent, error } = await stripe.confirmCardPayment(
      client.value.clientSecret,
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
    paymentResult.value = `Error: ${error.message}`;
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
  