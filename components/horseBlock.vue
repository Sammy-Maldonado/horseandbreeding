<template>
  <div class="space-y-16 sm:space-y-24">
    <div
      v-for="product in products"
      :key="product.id"
      class="flex py-6 sm:py-10"
    >
      <div class="min-w-0 flex-1 lg:flex lg:flex-col">
        <div class="lg:flex-1">
          <div class="sm:flex">
            <div>
              <h4 class="font-medium text-gray-900">
                {{ product.name }}
              </h4>
              <p class="mt-2 hidden text-sm text-gray-500 sm:block">
                {{ product.description }}
              </p>
            </div>
            <p class="mt-1 font-medium text-gray-900 sm:ml-6 sm:mt-0">
              {{ product.price }}
            </p>
          </div>
          <div class="mt-2 flex text-sm font-medium sm:mt-4">
            <a
              :href="product.href"
              class="text-indigo-600 hover:text-indigo-500"
              >View Product</a
            >
            <div class="ml-4 border-l border-gray-200 pl-4 sm:ml-6 sm:pl-6">
              <a href="#" class="text-indigo-600 hover:text-indigo-500"
                >Buy Again</a
              >
            </div>
          </div>
        </div>
      </div>
      <div class="ml-4 flex-shrink-0 sm:order-first sm:m-0 sm:mr-6">
        <img
          :src="product.imageSrc"
          :alt="product.imageAlt"
          class="col-start-2 col-end-3 h-20 w-20 rounded-lg object-cover object-center sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:h-40 sm:w-40 lg:h-52 lg:w-52"
        />
      </div>
    </div>
  </div>
</template>
  
  <script setup>
const products = [
  {
    id: 1,
    name: "Nomad Tumbler",
    description:
      "This durable double-walled insulated tumbler keeps your beverages at the perfect temperature all day long. Hot, cold, or even lukewarm if you're weird like that, this bottle is ready for your next adventure.",
    href: "#",
    price: "$35.00",
    status: "out-for-delivery",
    date: "January 5, 2021",
    datetime: "2021-01-05",
    imageSrc:
      "https://tailwindui.com/img/ecommerce-images/order-history-page-06-product-01.jpg",
    imageAlt:
      "Olive drab green insulated bottle with flared screw lid and flat top.",
  },
  // More products...
];
</script>