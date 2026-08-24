import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, defineEventHandler, readBody } from "h3";
import { toPublicErrorResponse, ValidationError } from "../utils/publicError";
import { ensureHasRoleAndScope } from "../utils/requireAuthorization";
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
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
    throw new ValidationError("Ad title is required and cannot be empty.");
  if (!comments?.trim())
    throw new ValidationError("comments are required and cannot be empty.");
  if (!height?.trim()) throw new ValidationError("Field height is required.");
  if (!age?.trim()) throw new ValidationError("Field age is required.");
  if (!horse_type?.trim()) throw new ValidationError("Field horse_type is required.");
  if (!location?.trim()) throw new ValidationError("Field area name is required.");

  if (!currency?.trim()) throw new ValidationError("Currency is required.");
  if (!fullname?.trim()) throw new ValidationError("Full name is required.");

  if (typeof sexe !== "number" || sexe < 0)
    throw new ValidationError("Sexe must be a valid");
  if (typeof price !== "number" || price < 0)
    throw new ValidationError("Price must be a valid number greater than or equal to 0.");

  if (typeof areaId !== "number" || areaId <= 0)
    throw new ValidationError("Area must be a valid.");
  // Return true if all validations pass
  return true;
};

export default defineEventHandler(async (event) => {
  // Refuses the caller before any work is done: 401 when the request carries
  // no verifiable token, 403 when the user lacks the role or the scope.
  const userInfo = ensureHasRoleAndScope(
    event.context.user,
    ["Admin", "Seller"],
    "create_horses"
  );

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
    // A rejected field is a 400 the caller can fix; a database failure is ours
    // and stays a 500. Neither one may carry the raw error to the client.
    console.error("Creating the horse failed:", error);
    throw createError(toPublicErrorResponse(error));
  }
});
