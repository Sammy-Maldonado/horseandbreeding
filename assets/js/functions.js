// using AES encryption with crypto-js library
import CryptoJS from "crypto-js";
// const { AES, enc } = CryptoJS;
export const shortJumpingInt = {
  "sj 1.10m": 1.1,
  "sj 1.20m": 1.2,
  "sj 1.30m": 1.3,
  "sj 1.35m": 1.35,
  "sj 1.40m": 1.4,
  "sj 1.50m": 1.5,
  "sj 1.55m": 1.55,
  "sj 1.60m": 1.6,
  "sj 1.65m": 1.65,
  "sj 1.70m": 1.7,
  "int 1.40m": 1.4,
  "int 1.50m": 1.5,
  "int 1.30m": 1.3,
  "int 1.35m": 1.35,
  "int 1.60m": 1.6,
  "sj 1.25m": 1.25,
  "sj 1.45m": 1.45,
  "int 1.25m": 1.25,
  "int 1.45m": 1.45,
  "int 1.55m": 1.55,
  "CNC*": 0.0,
  "CNC**": 0.0,
  "CNC***": 0.0,
  "CIC*": 0.0,
  "CIC**": 0.0,
  "CIC***": 0.0,
  "CCI*": 0.0,
  "CCI**": 0.0,
  "CCI***": 0.0,
  "CCI****": 0.0,
  "Nov-DH": 0.0,
  "Elim-DH": 0.0,
  "Med-DH": 0.0,
  "Ad-DH": 0.0,
  CDI: 0.0,
  "CDI**": 0.0,
  "Group 1": 0.0,
  "Group 2": 0.0,
  "Group 3": 0.0,
  Listed: 0.0,
  "Grade 1": 0.0,
  Grade2: 0.0,
  Grade3: 0.0,
  null: 0.0,
  "": 0.0
};
const highJump130 = 1.3;
const highJump140 = 1.4;

export const PRIORITIES = {
  0: "",
  1: "font-family: Arial Black;",
  2: "font-family: Arial Black; text-transform: uppercase;"
};
export const addUpperCaseFontBoldStyle = (group = 0) => {
  return PRIORITIES[group];
};

export const addFontBoldStyle = (group = 0) => {
  return PRIORITIES[group] + "text-transform: lowercase;";
};

export const convertUpCase = (horseName) => {
  // Convert the entire string to lowercase
  if (horseName) {
    // Split the horseName into words
    const words = horseName.split(" ");

    // Capitalize the first character of each word
    const capitalizedWords = words.map((word) => {
      if (word.length > 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      } else {
        return "";
      }
    });

    // Join the words back into a horseName
    return capitalizedWords.join(" ");
  } else {
    return "N/A";
  }
};

export const convertUpCaseSireOrDam = (horseName) => {
  // Check if the input is undefined, null, or an empty string after trimming
  if (!horseName || horseName.trim() === "") {
    return ""; // Return an empty string if invalid
  }

  // Split the name into words, capitalize the first letter of each word
  return horseName
    .trim() // Remove leading/trailing whitespaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export const decodedNotes = (notes) => {
  if (notes && notes.data) {
    const binaryData = new TextDecoder("utf-8").decode(
      new Uint8Array(notes.data)
    );
    return decodeURIComponent(binaryData);
  } else {
    return "No notes available";
  }
};

// Function to encrypt a Data using AES
export const encryptData = (data, key) => {
  if (!data || !key) {
    console.error("Data or key is missing for encryption");
    return;
  }
  try {
    // Encrypt the data and convert it to a URL-safe format
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      key
    ).toString();
    return encodeURIComponent(encrypted); // Make the encrypted string URL-safe
  } catch (error) {
    console.error("Encryption error:", error);
  }
  // return encodeURIComponent(AES.encrypt(Data.toString(), key ).toString());
};

// Function to decrypt an encrypted number using AES

export const decryptNumber = (encryptedNumber, key) => {
  try {
    // Decrypt the number
    const bytes = CryptoJS.AES.decrypt(encryptedNumber, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    // Check if decryption resulted in a valid number
    const decryptedNumber = parseInt(decryptedString, 10);
    return isNaN(decryptedNumber) ? -1 : decryptedNumber;
  } catch (error) {
    console.error("Decryption failed:", error);
    return -1; // Return -1 on any error
  }
};

export const getAbsoluteUrl = (website) => {
  if (website && website.startsWith("www.")) {
    return "https://" + website;
  } else if (website && !website.startsWith("http")) {
    return "https://www." + website;
  }
  return website;
};

export const email = (email, breedername) => {
  return `mailto:${email}?subject=Subject%20of%20the%20email&body=Hi%20${breedername}`;
};

export const formatPrice = (value, local = "en-US") => {
  return new Intl.NumberFormat(local, {
    minimumFractionDigits: value == 0 || value == null ? 2 : 0
  }).format(value);
};

export const fetchDataMethodGet = async (url, key) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "api-key": key
      }
    });
    const data = await response.json();
    return JSON.parse(data.body); // Adjust this based on your API's response structure
  } catch (error) {
    console.error("Failed to fetchData:", error);
    return [];
  }
};

export const fetchDataMethodPost = async (url, key, body, method) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(url, {
      method: method,
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "api-key": key,
        token: `${token}`
      }
    });
    const data = await response.json();
    return data; // Adjust this based on your API's response structure
  } catch (error) {
    console.error("Failed to fetchData:", error);
    return [];
  }
};

export const isHighJump = (short) => {
  try {
    if (shortJumpingInt[short] >= highJump130) return true;
  } catch (error) {
    return false;
  }
};

export const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const ago = Number(now) - Number(past);
  const seconds = Math.floor(ago / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30); // Approximate
  const years = Math.floor(days / 365); // Approximate

  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 30) return `${days} days ago`;
  if (months < 12) return `${months} months ago`;
  return `${years} years ago`;
};

export const getColorDescription = (colorValue) => {
  if (!colorValue) return "";
  const lowerCaseColor = colorValue.toLowerCase(); // Case-insensitive comparison

  if (lowerCaseColor === "br") {
    return "brown ";
  } else if (lowerCaseColor === "db") {
    return "darkbrown ";
  } else if (lowerCaseColor === "bl") {
    return "black ";
  } else if (lowerCaseColor === "ch") {
    return "chestnut ";
  } else if (lowerCaseColor === "gr") {
    return "grey ";
  } else if (lowerCaseColor === "sk") {
    return "skew or piebald ";
  } else if (lowerCaseColor === "b") {
    return "bay ";
  } else if (lowerCaseColor === "unknown") {
    return "";
  } else {
    return colorValue + " "; // If no match, return the original color with a space
  }
};
