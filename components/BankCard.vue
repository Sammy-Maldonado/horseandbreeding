<template>
  <form @submit.prevent="handlePayment" class="mt-10 mx-5 w-full">
    <section aria-labelledby="payment-heading">
      <!-- Name on Card -->
      <div class="flex items-center mb-6">
        <label
          for="name-on-card"
          class="text-sm leading-6 text-gray-900 mr-4 w-32"
        >
          Name on card*
        </label>
        <div class="flex-1">
          <input
            type="text"
            id="name-on-card"
            name="name-on-card"
            autocomplete="cc-name"
            class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
            required
          />
        </div>
      </div>

      <!-- Card Number -->
      <div class="flex items-center mb-6">
        <label
          for="card-number"
          class="text-sm leading-6 text-gray-900 mr-4 w-32"
        >
          Card number*
        </label>
        <div class="flex-1">
          <input
            type="text"
            id="card-number"
            name="card-number"
            autocomplete="cc-number"
            class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
            required
          />
        </div>
      </div>

      <!-- Expiration Date and CVC -->
      <div class="flex items-center mb-6">
        <label
          for="expiration-date"
          class="text-sm leading-6 text-gray-900 mr-4 w-32"
        >
          Expiration date (MM/YY)*
        </label>
        <div class="flex-1">
          <input
            type="text"
            name="expiration-date"
            id="expiration-date"
            autocomplete="cc-exp"
            placeholder="MM/YY"
            class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
            required
          />
        </div>
        <label for="cvc" class="text-sm leading-6 text-gray-900 ml-6 mr-4 w-16">
          CVC*
        </label>
        <div class="flex-1">
          <input
            type="text"
            name="cvc"
            id="cvc"
            autocomplete="csc"
            class="appearance-none text-slate-900 bg-white rounded-md block w-full px-3 h-8 shadow-sm sm:text-sm focus:outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 ring-1 ring-slate-200"
            required
          />
        </div>
      </div>

      <!-- Submit Button -->
      <div class="text-right">
        <button
          type="submit"
          class="inline-flex justify-center rounded-lg text-sm py-2 px-4 bg-sky-700 ring-sky-600/20 text-white hover:bg-slate-700"
        >
          <span>Submit Payment</span>
        </button>
      </div>
    </section>
  </form>
</template>
  
  <script setup>
const handlePayment = () => {
  // Handle payment submission logic here
  alert("Payment submitted successfully!");
};
</script>
  