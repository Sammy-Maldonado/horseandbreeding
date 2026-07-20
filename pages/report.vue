<template>
  <div>
    <app-navbar></app-navbar>
    <div class="bg-white">
      <div class="mx-auto max-w-2xl px-4 py-8 lg:max-w-7xl lg:px-8">
        <div
          class="lg:flex md:flex sm:block justify-between items-center p-4 bg-gray-50 rounded-lg"
        >
          <!-- Left Div -->
          <div class="text-left pb-2">
            <button
              class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              @click="exportToDocx"
            >
              Generate .docx
            </button>
          </div>

          <!-- Center Div -->
          <div class="lg:text-center md:text-center text-left pb-2">
            <button
              class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              @click="print"
            >
              Print
            </button>
          </div>

          <div class="text-right flex gap-2">
            <div class="w-full max-w-lg lg:max-w-xs">
              <label for="search" class="sr-only">Search</label>
              <div class="relative">
                <div
                  class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
                >
                  <svg
                    class="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  id="search"
                  name="search"
                  v-model="search"
                  class="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-300 placeholder:text-gray-400 focus:bg-white focus:text-gray-900 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="Search"
                  type="search"
                />
              </div>
            </div>
            <button
              type="button"
              @click="fetchHorse()"
              :disabled="pending"
              class="rounded-md bg-sky-950 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {{ pending ? "Loading..." : "Search" }}
            </button>
          </div>
        </div>
        <div
          v-if="isError >= 0"
          :class="
            isError
              ? 'p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300'
              : 'p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400'
          "
          role="alert"
        >
          <span class="font-medium">{{
            isError ? "Invalid." : "Report. "
          }}</span>
          {{ message }}
        </div>
        <div class="grid grid-rows-2 grid-flow-col gap-2">
          <div class="row-span-2 col-span-2 pdf-content" ref="contentToPrint">
            <export-data ref="docx">
              <div
                id="report-docx"
                style="font-size: 10pt; font-family: 'Arial', sans-serif"
              >
                <div v-if="_competitionHistory.length > 0">
                  <div
                    v-for="(horse, index) in _competitionHistory"
                    :key="index"
                    class="page"
                  >
                    <pedigree :pedigrees="pedigrees[index]" />
                    <br />
                    <report-competition-history :horses="horse" />
                    <br />
                    <br />
                  </div>
                </div>
                <div v-else>No data</div>
              </div>
            </export-data>
          </div>
        </div>
        <app-modal :show="isModalOpen" @close="closeModal">
          <template #body>
            <app-log-in></app-log-in>
          </template>
        </app-modal>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from "vue";
const docx = ref(null);
const search = ref("59295");

const isError = ref(-1); // To track if it's an error message
const message = ref(""); // To store success/error messages

const error = ref(null);
const pending = ref(false);
const _competitionHistory = ref([]);

const isModalOpen = ref(false);
const closeModal = () => {
  isModalOpen.value = false;
  userInfo();
};
const openModal = () => {
  isModalOpen.value = true;
};
if (!isLoggedIn()) {
  openModal();
}
async function fetchHorse() {
  pending.value = true;
  error.value = null;
  fetchPedigree();
  try {
    _competitionHistory.value = [];

    const options = {
      body: JSON.stringify({ horseIds: search.value }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };
    const response = await fetchWithToken("/api/report-horses-ids", options);
    if (response.ok) {
      const data = await response.json();
      message.value = data.statusMessage;
      if (data.statusCode == 200) {
        _competitionHistory.value = JSON.parse(data.body);
        setTimeout(() => {
          isError.value = -1;
        }, 5000);
        isError.value = 0; // Set error state
      } else {
        isError.value = 1; // Set error state
        if (data.statusCode == 401) {
          openModal();
        }
      }
    } else {
      if (response.status === 500) {
        message.value =
          " It looks like you're not logged in. Log in to get started on creating your horse!";
        isError.value = 1; // Set error st

        setTimeout(() => {
          openModal();
        }, 3000);
      }
    }
  } catch (err) {
    console.log("Error horse competition history", err);
    error.value = err;
  } finally {
    pending.value = false;
  }
}
const pedigrees = ref([]);
const fetchPedigree = async () => {
  const url = "/api/pedigree";
  try {
    const { data: fetchData, erro: fetchError } = await useFetch(url, {
      method: "POST",
      body: JSON.stringify({ id: search.value, level: 3 }),
      headers: {
        "Content-type": "application/json",
        "api-key": import.meta.env.VITE_API_KEY,
      },
      transform: (data) => JSON.parse(data.body),
    });
    pedigrees.value = fetchData.value;
  } catch (error) {
    console.error("Error fetching pedigree:", error);
  }
};

const exportToDocx = () => {
  if (docx.value) {
    docx.value.generateDocx();
  }
};

const contentToPrint = ref(null);

const print = () => {
  const printArea = document.getElementById("report-docx"); // Replace with your HTML element ID = document.getElementById("printableArea");
  const printWindow = window.open("", "_blank");

  // Set up the print window content
  printWindow.document.write(`
        <html>
          <head>
            <title>Horse and breeder</title>
            <style>
              /* Add your print styles here */
               body {
                margin-top: 0.75cm; margin-left: 1.5cm; margin-right: 1.55cm; padding: 0;
                font-family: 'Arial', sans-serif; /* Font family for the entire document */
                font-size: 8pt; /* Default font size */
                padding: 0; /* Padding for the entire document */
                margin: 0; /* No margin for body */
                
              } 
              .bordered-table {
                width: 100%;
                border-collapse: collapse; /* Ensures borders are collapsed */
              }

              .bordered-table th,
              .bordered-table td {
                border: 1px solid #ddd; /* Border for each cell */
               
                text-align: left; /* Align text to the left */
              }

              .bordered-table th {
                background-color: #f2f2f2; /* Background color for headers */
              }
               
              .page {
                margin-bottom: 20mm; /* Space between pages in the PDF */
                page-break-before: always; /* Start a new page before this element */
              }
              @media print {
                .page {
                  page-break-before: always; /* Ensures each page class starts on a new page */
                }
              }



              div.c {
                line-height: 1; /* Remove extra space between lines */
                margin: 0;      /* Remove margins */
                padding: 0;     /* Remove padding */
              }

              div.c p {
                margin: 0;
                padding: 0;
              }

              div.c div {
                margin: 0;
                padding: 0;
              }


            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${printArea.innerHTML}
          </body>
        </html>
      `);
  printWindow.document.close(); // Close the document to finish loading
};
</script>


<style scoped>
.pdf-content {
  padding: 10mm; /* Use mm to match PDF units */
  font-size: 12pt; /* Adjust font size */
}

.page {
  margin-bottom: 20mm; /* Space between pages in the PDF */
}

h1 {
  font-size: 18pt; /* Adjust header size */
}
</style>
