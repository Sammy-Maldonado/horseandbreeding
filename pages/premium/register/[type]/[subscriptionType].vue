<template>
  <div>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <div
        class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 pt-8 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
      >
        <div class="lg:col-start-1 lg:row-end-1">
          <div
            class="rounded-lg bg-sky-900 shadow-sm ring-1 ring-gray-900/5 p-6"
          >
            <payment-card :type="type" :subscriptionType="subscriptionType" />
          </div>
        </div>
        <div
          class="px-4 py-8 shadow-sm ring-1 ring-gray-900/5 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-8 xl:pb-10 xl:pt-8"
        >
          <div class="tabs">
            <div class="flex">
              <!-- Tabs Navigation -->
              <ul class="flex flex-wrap transition-all duration-300">
                <li v-for="(tab, index) in tabs" :key="index">
                  <button
                    @click="selectTab(tab.id)"
                    :class="[
                      'inline-block py-3 px-6 font-medium',
                      tab.id === activeTab
                        ? 'bg-sky-50 text-sky-600 rounded-xl'
                        : 'text-gray-500 hover:text-gray-800',
                    ]"
                    role="tab"
                    :aria-selected="tab.id === activeTab"
                  >
                    {{ tab.label }}
                  </button>
                </li>
              </ul>
            </div>
            <!-- Tab Content -->
            <app-message :message="message" :isError="isError" />
            <div class="mt-3">
              <div
                v-for="(tab, index) in tabs"
                :key="index"
                v-show="tab.id === activeTab"
                role="tabpanel"
                :aria-labelledby="`tab-${tab.id}`"
              >
                <!-- Tab 1: User Login Form -->
                <div v-if="tab.id === 'login'">
                  <form-username-password @getUserNamePassword="getUserInfo" />
                </div>

                <!-- Tab 2: Checkbox Button -->
                <div v-else-if="tab.id === 'contact'">
                  <register-user
                    :userData="user"
                    @getStatus="handleUserStatus"
                  />
                </div>

                <!-- Tab 3: Additional Content -->
                <div v-else-if="tab.id === 'payment'">
                  <!-- <bank-card /> -->
                  <stripe-peyment
                    :type="type"
                    :subscriptionType="subscriptionType"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const type = Number(route.params.type); // For query parameters
const subscriptionType = route.params.subscriptionType;

// Define the tabs
const tabs = [
  { id: "login", label: "Sign in or create a account" },
  { id: "contact", label: "Contact details" },
  { id: "payment", label: "Payment method" },
];

// Reactive reference for the active tab
const activeTab = ref("login");

// Reactive checkbox state
const isChecked = ref(false);

// Function to switch tabs
function selectTab(tabId) {
  activeTab.value = tabId;
}

// Function to go to the next tab
function nextTab() {
  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.value);
  const nextIndex = (currentIndex + 1) % tabs.length;
  activeTab.value = tabs[nextIndex].id;
}
function backTab() {
  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.value);
  const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  activeTab.value = tabs[prevIndex].id;
}

// Reactive user object in the parent component
const user = ref({
  email: "",
  password: "",
});
// Method for handling login form submission
const getUserInfo = (userInfo) => {
  user.value.email = userInfo.email;
  user.value.password = userInfo.password;
};

const isError = ref(false); // To track if it's an error message
const message = ref(null); // To store success/error messages
const handleUserStatus = (status, next = true) => {
  switch (status.statusCode) {
    case 200:
      isError.value = false;
      break;
    case 400:
      isError.value = true;
      break;
    case 401:
      isError.value = true;
      break;
    case 404:
      isError.value = false;
      break;
    case 500:
      isError.value = true;
      break;
    default:
      isError.value = false;
      break;
  }
  if (next) {
    nextTab();
  }
  message.value = status.message;
  setTimeout(() => {
    message.value = "";
  }, 15000);
};
</script>
 