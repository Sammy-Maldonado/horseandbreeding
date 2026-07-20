import { PrismaClient } from "@prisma/client";
import { defineEventHandler, readBody } from "h3";
import type { UserData } from "../utils/types"; // Adjust this import as needed
import { ensureHasRoleAndScope } from "../utils/authorization"; // Adjust the path based on your structure
const prisma = new PrismaClient();
const validateFields = (data: any) => {
  const {
    ad_title,
    comments,
    height,
    age,
    sexe,
    currency,
    price,
    fullname,
    areaId,
    horse_type,
    location
  } = data;

  // Check if required fields are missing or empty
  if (!ad_title?.trim())
    throw new Error("Ad title is required and cannot be empty.");
  if (!comments?.trim())
    throw new Error("comments are required and cannot be empty.");
  if (!height?.trim()) throw new Error("Field height is required.");
  if (!age?.trim()) throw new Error("Field age is required.");
  if (!horse_type?.trim()) throw new Error("Field horse_type is required.");
  if (!location?.trim()) throw new Error("Field area name is required.");

  if (!currency?.trim()) throw new Error("Currency is required.");
  if (!fullname?.trim()) throw new Error("Full name is required.");

  if (typeof sexe !== "number" || sexe < 0)
    throw new Error("Sexe must be a valid");
  if (typeof price !== "number" || price < 0)
    throw new Error("Price must be a valid number greater than or equal to 0.");

  if (typeof areaId !== "number" || areaId <= 0)
    throw new Error("Area must be a valid.");
  // Return true if all validations pass
  return true;
};

export default defineEventHandler(async (event) => {
  const userInfo: UserData = event.context.user; // Get the user info from the context
  // Check if the user has the required scope to update horses
  ensureHasRoleAndScope(userInfo, ["Admin", "Seller"], "create_horses");
  if (!userInfo) {
    return { statusCode: 401, message: "Unauthorized" }; // User not authenticated
  }
  try {
    const {
      ad_title,
      comments,
      height,
      age,
      sexe,
      currency,
      price,
      fullname,
      phone,
      areaId,
      photos,
      cover,
      horse_type,
      location
    } = await readBody(event);
    validateFields({
      ad_title,
      comments,
      height,
      age,
      sexe,
      currency,
      price,
      fullname,
      areaId,
      horse_type,
      location
    });
    const storehorse = await prisma.storehorse.create({
      data: {
        ad_title: ad_title,
        comments: comments,
        height: height,
        age: age,
        sell_price: price,
        currency: currency,
        horse_type: horse_type,
        owner: userInfo.userId,
        forsale: 1,
        status: -1,
        seller: {
          create: {
            full_name: fullname,
            mobile: phone,
            email: userInfo.email,
            location: location,
            user_id: userInfo.userId
          }
        },
        user_has_horse: {
          create: {
            user_id: userInfo.userId,
            area_id: areaId,
            owner: userInfo.userId
          }
        }
      }
    });

    const { horse_id } = storehorse;
    return {
      statusMessage: "Horse created successfully",
      statusCode: 200,
      body: JSON.stringify({ horse_id: horse_id })
    };
  } catch (error) {
    console.log("Error produssing", error);
    return {
      statusCode: 400,
      message: "Error produssing",
      statusMessage: error
    };
  }
});
