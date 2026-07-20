<template>
  <div>
    <!-- end-form -->
    <search-modal :show="isModalOpen" @close="closeModal">
      <template #header>
        <app-search :searchText="searchText" @find="handleSearch" />
      </template>
      <template #body>
        <app-search-table
          @select="handleSelect"
          :data="data"
          :horseType="selectedType"
        />
        <app-pagination-modal
          v-if="pagination.pages"
          :total="pagination?.pages"
          :page="currentPage"
          @selectedPage="handlePagination"
        />
      </template>
      <template #footer>
        <div>
          <p class="mt-2 text-sm md:text-lg lg:text-lg text-gray-700 pr-2">
            If your horse is not listed above, please click
            <strong>"Close"</strong> to proceed.
          </p>
        </div>
      </template>
    </search-modal>

    <!-- Modal for Terms and Conditions -->
    <app-modal :show="isModalOpenTermConditions" @close="closeTerms">
      <template #header>
        <strong class="pt-2 pb-4">Declaration</strong>
      </template>
      <template #body>
        <div class="p-4">
          <ul class="list-disc list-inside text-gray-700">
            <li class="mb-2">
              Ensure <strong>accurate parentage information</strong>, as
              inaccuracies can cause complications with breed records and
              competition eligibility.
            </li>
            <li class="mb-2">
              Registration will be tied to the
              <strong>horse's lifetime records</strong>, making
              <strong>accuracy crucial</strong> to avoid disputes over
              ownership, health records, and breeding history.
            </li>
            <li class="mb-2">
              Some registration authorities may take
              <strong>several weeks</strong> to process applications. To avoid
              delays, submit your application as early as possible, especially
              if you need it for upcoming events.
            </li>
            <li>
              Certain organizations may have
              <strong>deadlines for registering foals</strong> or horses under
              specific ages, so be mindful of these timeframes.
            </li>
          </ul>
        </div>
      </template>
      <template #footer>
        <div class="mt-6 flex justify-end">
          <button
            @click="acceptTerms"
            class="px-4 py-2 text-white bg-sky-950 rounded-lg hover:bg-sky-500 focus:outline-none"
          >
            Accept
          </button>
        </div>
      </template>
    </app-modal>
    <app-navbar />
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border">
      <!-- form -->
      <div class="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-lg">
        <h2 class="text-2xl font-bold mb-6">User Registration</h2>
        <form @submit.prevent="submitForm">
          <!-- Name of the Horse -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="name"
            >
              Name of the Horse {{ form.horse_id }}
            </label>
            <input
              v-model="form.horse.name"
              required
              @blur="disableHoverHorseName"
              type="text"
              id="name"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>

          <!-- Sexe -->
          <app-select-option
            name="sexe"
            :val="validated(form.horse.sexe)"
            @update:selected="handleSexe"
          >
            <option
              v-for="(val, index) in sexes"
              :value="Number(val.idsexe)"
              :key="index"
            >
              {{ val.type }}
            </option>
          </app-select-option>

          <!-- Approved -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="approved"
              >Approved</label
            >
          </div>

          <!-- Birthyear -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="birthyear"
              >Birthyear</label
            >
            <input
              v-model="form.horse.birthyear"
              maxlength="4"
              minlength="4"
              required
              type="number"
              id="birthyear"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>

          <!-- Sire -->
          <div class="mb-4 flex items-center space-x-2">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="sire"
            >
              Sire
            </label>
            <input
              :value="form.horse.sire?.name"
              disabled
              type="text"
              id="sire"
              class="mt-1 block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-gray-100 cursor-not-allowed"
            />
            <!-- Find Button -->
            <button
              @click="handleSire"
              type="button"
              class="mt-1 px-2 py-1 text-sm bg-sky-950 text-white rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500"
            >
              Find
            </button>

            <!-- Clear Button -->
            <button
              @click="clearSire"
              type="button"
              class="mt-1 px-2 py-1 text-sm bg-gray-500 text-white rounded-md shadow-sm focus:ring-2 focus:ring-gray-500"
            >
              Clear
            </button>
          </div>

          <!-- Dam -->
          <div class="mb-4 flex items-center space-x-2">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="dam"
            >
              Dam
            </label>
            <input
              :value="form.horse.dam?.name"
              @click="handleDam"
              disabled
              type="text"
              id="dam"
              class="mt-1 block w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-gray-100 cursor-not-allowed"
            />
            <!-- Find Button -->
            <button
              @click="handleDam"
              type="button"
              class="mt-1 px-2 py-1 text-sm bg-sky-950 text-white rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500"
            >
              Find
            </button>

            <!-- Clear Button -->
            <button
              @click="clearDam"
              type="button"
              class="mt-1 px-2 py-1 text-sm bg-gray-500 text-white rounded-md shadow-sm focus:ring-2 focus:ring-gray-500"
            >
              Clear
            </button>
          </div>
          <!-- Studbook -->
          <app-select-option
            :required="false"
            :val="validated(form.studbook_id)"
            name="studbook"
            @update:selected="handleStudbook"
          >
            <option
              v-for="(val, index) in studbook"
              :value="val.id"
              :key="index"
            >
              {{ val.name }} ({{ val.abbr }})
            </option>
          </app-select-option>

          <!-- Reg Nr -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="regnr"
            >
              Reg Nr
            </label>
            <input
              v-model="form.horse.regnr"
              type="text"
              id="regnr"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>
          <!-- predicates -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="predicates"
            >
              Predicates
            </label>
            <input
              v-model="form.horse.predicates"
              type="text"
              id="predicates"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>
          <!-- Color -->
          <app-select-option
            name="color"
            :required="false"
            :val="validated(form.horse.color)"
            @update:selected="handleColor"
          >
            <option
              v-for="(val, index) in colors"
              :value="val.color_code"
              :key="index"
            >
              {{ val.color_name }} ({{ val.color_code }})
            </option>
          </app-select-option>

          <!-- Height -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="height"
              >Height</label
            >
            <input
              v-model="form.horse.height"
              type="text"
              id="height"
              class="mt-1 block w-1/2 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
            <span class="pl-2"> metres (i.e. 165) </span>
          </div>

          <!-- Alias -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="alias"
              >Alias</label
            >
            <input
              v-model="form.horse.alias"
              type="text"
              id="alias"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>
          <app-select-option
            :required="false"
            :val="
              validated(form.diciplinevalues[JUMPING].diciplinevalues_idvalues)
            "
            name="jumping"
            @update:selected="handleJumping"
          >
            <option
              v-for="(val, index) in jumping"
              :value="val.idvalues"
              :key="index"
            >
              {{ val.value }} ({{ val.short }})
            </option>
          </app-select-option>

          <app-select-option
            :required="false"
            :val="
              validated(form.diciplinevalues[DRESSAGE].diciplinevalues_idvalues)
            "
            name="dressage"
            @update:selected="handleDressage"
          >
            <option
              v-for="(val, index) in dressage"
              :value="val.idvalues"
              :key="index"
            >
              {{ val.value }} ({{ val.short }})
            </option>
          </app-select-option>

          <app-select-option
            :required="false"
            :val="
              validated(form.diciplinevalues[EVENTING].diciplinevalues_idvalues)
            "
            name="eventing"
            @update:selected="handleEventing"
          >
            <option
              v-for="(val, index) in eventing"
              :value="val.idvalues"
              :key="index"
            >
              {{ val.value }} ({{ val.short }})
            </option>
          </app-select-option>
          <app-select-option
            :val="
              validated(form.diciplinevalues[RACING].diciplinevalues_idvalues)
            "
            :required="false"
            name="racing"
            @update:selected="handleRacing"
          >
            <option
              v-for="(val, index) in racing"
              :value="val.idvalues"
              :key="index"
            >
              {{ val.value }} ({{ val.short }})
            </option>
          </app-select-option>

          <!-- competitionAuthority -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="competitionAuthority"
            >
              Sports Results * Governing Body
            </label>

            <input
              v-model="form.horse.competitionAuthority"
              type="text"
              id="competitionAuthority"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>
          <!-- remarks_short -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="remarks_short"
            >
              Rider/Export
            </label>
            <input
              v-model="form.horse.remarks_short"
              type="text"
              id="remarks_short"
              class="mt-1 block w-3/4 focus:ring-2 focus:ring-inset focus:ring-sky-600 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm"
            />
          </div>

          <!-- remarks -->
          <div class="mb-4 flex items-center">
            <label
              class="block w-1/4 text-sm font-medium text-gray-700"
              for="remarks"
            >
              Remarks (long)
            </label>
            <textarea
              v-model="form.horse.remarks"
              placeholder=""
              id="remarks"
              name="remarks"
              rows="5"
              class="block w-full rounded-md border-0 px-2 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-sky-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div class="space-y-4">
            <!-- Terms and Conditions Section -->
            <div class="flex items-center">
              <input
                id="terms"
                type="checkbox"
                v-model="agreed"
                required
                class="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
              />
              <label for="terms" class="ml-2 block text-sm text-gray-700">
                I agree to the
                <button
                  type="button"
                  @click="openTerms"
                  class="text-sky-950 hover:text-sky-600 underline focus:outline-none"
                >
                  Terms and Conditions
                </button>
              </label>
            </div>
            <!-- response message -->
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
                isError ? "Invalid." : "Add horse successful!"
              }}</span>
              {{ message }}
            </div>
          </div>
          <!-- Submit Button -->
          <div class="flex justify-end">
            <!-- Submit Button -->
            <button
              :disabled="!agreed"
              class="mt-4 px-4 py-2 rounded-md text-white font-semibold transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-sky-950 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
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
import { reactive } from "vue";
import { fetchWithToken, isLoggedIn } from "@/composables/tokenManager";
import { fetchDataMethodPost } from "../assets/js/functions";

// import PrimeVueResolver from "@primevue/auto-import-resolver";
const text = ref("");

const isError = ref(-1); // To track if it's an error message
const message = ref(""); // To store success/error messages
// fetch disciplines
const fetchHorseEdit = async (horseId) => {
  const url = "/api/edit-horse-by-id";
  const key = import.meta.env.VITE_API_KEY;
  let body = { id: horseId };
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    resetForm();
    const storeHorse = JSON.parse(response.body);
    form.horse = storeHorse.storehorse;
    // if response return null sire or dam
    if (!form.horse.sire) {
      form.horse.sire = {
        name: "",
      };
    }
    if (!form.horse.dam) {
      form.horse.dam = {
        name: "",
      };
    }
    form.studbook_id = storeHorse?.studbook_id;
    storeHorse?.storeHorseDisciplines.forEach((val) => {
      const key = val.disciplines?.diciplines_iddiciplines;
      const value = val?.diciplinevalues_idvalues;
      form.diciplinevalues[key].diciplinevalues_idvalues = value;
    });
    form.horse_id = horseId;
  }
};

const form = reactive({
  horse: {
    name: "",
    status: 1,
    horse_type: "",
    birthyear: null,
    regnr: "",
    color: "",
    height: "",
    alias: "",
    predicates: "",
    competitionAuthority: "",
    remarks_short: "",
    remarks: "",
    sire_id: 0,
    dam_id: 0,
    sexe: null,
    sire: {
      name: " ",
    },
    dam: {
      name: " ",
    },
  },
  studbook_id: null,
  horse_id: null,
  diciplinevalues: [
    { diciplinevalues_idvalues: null },
    { diciplinevalues_idvalues: null },
    { diciplinevalues_idvalues: null },
    { diciplinevalues_idvalues: null },
  ],
});
// Function to reset all properties
const resetForm = () => {
  form.horse.name = "";
  form.horse.status = 1;
  form.horse.horse_type = "";
  form.horse.birthyear = null;
  form.horse.regnr = "";
  form.horse.color = "";
  form.horse.height = "";
  form.horse.alias = "";
  form.horse.predicates = "";
  form.horse.competitionAuthority = "";
  form.horse.remarks_short = "";
  form.horse.remarks = "";
  form.horse.sire_id = 0;
  form.horse.dam_id = 0;
  form.horse.sexe = null;
  form.horse.sire.name = " ";
  form.horse.dam.name = " ";
  form.studbook_id = null;
  form.horse_id = null;

  // Reset the diciplinevalues array
  form.diciplinevalues = [
    { diciplinevalues_idvalues: null },
    { diciplinevalues_idvalues: null },
    { diciplinevalues_idvalues: null },
    { diciplinevalues_idvalues: null },
  ];
  agreed.value = false;
};

// store new horse name
const searchTerm = ref("");
// modal sire, mare, new horse
const isModalOpen = ref(false);
const closeModal = () => {
  isModalOpen.value = false;
};

const openModal = () => {
  isModalOpen.value = true;
};

const STALLION = 0;
const MARE = 2;
const NEWHORSE = -1;
const selectedType = ref("");

// new horse search
const searchText = ref("");
const disableHoverHorseName = () => {
  form.horse_id = null;
  if (form.horse.name.length > 3) {
    openModal();
    handleSearch(form.horse.name.trim());
    searchText.value = form.horse.name;
    selectedType.value = NEWHORSE;
    // here
  } else {
    alert(
      "Please enter four or more characters of the animals name. If you are sure your animal has less than three characters in their name, please contact the administrator at info@horseandbreeder.com."
    );
  }
};

const handleSire = () => {
  data.value = [];
  pagination.value = [];
  openModal();
  selectedType.value = STALLION;
  searchText.value = "";
};

const handleDam = () => {
  data.value = [];
  pagination.value = [];
  openModal();
  selectedType.value = MARE;
  searchText.value = "";
};

const goToPage = (page) => {};
// const searchText = ref(route.params.texts || ""); // Search query from URL
const currentPage = ref(1); // Current page from URL
const data = ref([]);

const handleSelect = (horse) => {
  switch (selectedType.value) {
    case STALLION:
      form.horse.sire.name = horse.name;
      form.horse.sire_id = horse.horse_id;
      break;
    case MARE:
      form.horse.dam.name = horse.name;
      form.horse.dam_id = horse.horse_id;
      break;
    default:
      form.horse.name = horse.name;
      form.horse_id = horse.horse_id;
      fetchHorseEdit(form.horse_id);
      break;
  }

  closeModal();
};
const handleSearch = (word) => {
  searchTerm.value = !word ? searchTerm.value : word;
  currentPage.value = 1;
  fetchSearch();
  fetchPagination();
};

const handlePagination = (page) => {
  currentPage.value = page;
  fetchSearch();
};

const fetchSearch = async () => {
  let url = "/api/filter-horses-by-name-sex";
  let body = {};
  switch (selectedType.value) {
    case STALLION:
      body = {
        search: searchTerm.value,
        sex: STALLION,
        page: (currentPage.value - 1) * 10,
      };
      break;
    case MARE:
      body = {
        search: searchTerm.value,
        sex: MARE,
        page: (currentPage.value - 1) * 10,
      };
      break;
    default:
      url = "/api/filter-horses-by-name";
      body = {
        search: searchTerm.value,
        page: (currentPage.value - 1) * 10,
      };
      break;
  }

  const key = import.meta.env.VITE_API_KEY;
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    data.value = JSON.parse(response.body);
  }
};

const pagination = ref([]);
const fetchPagination = async () => {
  let url = "/api/pagination-horses-by-name-sex";
  let body = {};
  switch (selectedType.value) {
    case STALLION:
      body = { search: searchTerm.value, sex: STALLION };
      break;
    case MARE:
      body = { search: searchTerm.value, sex: MARE };
      break;
    default:
      url = "/api/pagination-horses-by-name";
      body = { search: searchTerm.value };
      break;
  }
  const key = import.meta.env.VITE_API_KEY;

  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    pagination.value = JSON.parse(response.body);
  }
};
const clearSire = () => {
  form.horse.sire.name = ""; // Clear the input field
  form.horse.sire_id = 0;
  resetForm();
};
const clearDam = () => {
  form.horse.dam.name = ""; // Clear the input field
  form.horse.dam_id = 0;
};
// sexe
const sexes = ref([]);
const handleSexe = (val) => {
  form.horse.sexe = val;
  form.horse.horse_type = selectSexeLabel();
};
const selectSexeLabel = () => {
  const option = sexes.value.find((opt) => opt.idsexe === form.horse.sexe);
  return option?.type;
};

// Studbook
const studbook = ref([]);
const handleStudbook = (val) => {
  form.studbook_id = val;
};

// colors
const colors = ref([]);
const handleColor = (val) => {
  form.horse.color = val;
};

const fetchColorsSexesStudbook = async () => {
  const url = "/api/colors-sexes-studbooks";
  const key = import.meta.env.VITE_API_KEY;
  let body = {};
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    const dataCXS = JSON.parse(response.body);
    sexes.value = dataCXS.sexes;
    studbook.value = dataCXS.studbook;
    colors.value = dataCXS.colors;
  }
};
onMounted(fetchColorsSexesStudbook);
// Jumping
const JUMPING = 0;
const jumping = ref([]);
const handleJumping = (val) => {
  form.diciplinevalues[JUMPING].diciplinevalues_idvalues = val;
};
// Dressage
const DRESSAGE = 1;
const dressage = ref([]);
const handleDressage = (val) => {
  form.diciplinevalues[DRESSAGE].diciplinevalues_idvalues = val;
};
// onMounted(fetchDressage);
// Eventing
const EVENTING = 2;
const eventing = ref([]);
const handleEventing = (val) => {
  form.diciplinevalues[EVENTING].diciplinevalues_idvalues = val;
};
// Racing
const RACING = 3;
const racing = ref([]);
const handleRacing = (val) => {
  form.diciplinevalues[RACING].diciplinevalues_idvalues = val;
};
// fetch disciplines
const fetchManyDisciplines = async () => {
  const url = "/api/find-many-disciplines";
  const key = import.meta.env.VITE_API_KEY;
  let body = {};
  const response = await fetchDataMethodPost(url, key, body, "POST");
  if (response.status == 200) {
    const disciplines = JSON.parse(response.body);
    jumping.value = disciplines[JUMPING];
    dressage.value = disciplines[DRESSAGE];
    eventing.value = disciplines[EVENTING];
    racing.value = disciplines[RACING];
  }
};
onMounted(fetchManyDisciplines);
// term and condition
const agreed = ref(false); // Checkbox state
const isModalOpenTermConditions = ref(false); // Modal visibility state

// Function to open the terms and conditions modal
const openTerms = () => {
  isModalOpenTermConditions.value = true;
};

// Function to close the modal
const closeTerms = () => {
  isModalOpenTermConditions.value = false;
};
const acceptTerms = () => {
  isModalOpenTermConditions.value = false;
  agreed.value = true;
};

const submitForm = async () => {
  const url = "/api/add-full-horse-details";
  message.val = "";
  isError.value = -1;
  console.log("form = >", form);
  const options = {
    body: JSON.stringify({ data: form }),
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const response = await fetchWithToken(url, options);

  if (response.ok) {
    const data = await response.json();
    if (data.statusCode == 200) {
      message.value = data.statusMessage;
      isError.value = 0; // Set error state
      resetForm();
    } else {
      message.value = data.statusMessage;
      isError.value = 1; // Set error state
      if (data.statusCode == 401) {
        // openModal();
      }
    }
  } else {
    if (response.status === 500) {
      message.value =
        " It looks like you are not logged in. Log in to get started on creating your horse!";
      isError.value = 1; // Set error st
    }
  }
};

const validated = (val) => {
  return String(val ?? "");
};
</script> 