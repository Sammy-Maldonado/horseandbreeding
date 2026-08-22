import { PrismaClient } from "@prisma/client";
import { createError, isError } from "h3";
import {
  buildSelect,
  isValidPedigreeLevel,
  MAX_PEDIGREE_LEVEL
} from "../utils/pedigreeSelect";
import {
  activeHorseFilter,
  horseStatusSelect
} from "../utils/storehorse-compat";

const prisma = new PrismaClient();

async function findFirstAncestor(
  id: any,
  level = 0
) {
  // Retrieve the horse record with the specified dam_id and status of 1

  const storeHorse = await prisma.storehorse.findFirst({
    select: {
      dam_id: true,
      horse_id: true,
      dam: {
        select: {
          dam_id: true,
          horse_id: true,
          ...horseStatusSelect()
        },
        where: {
          horse_id: {
            gt: 0, // dam_id greater than 0
            not: {
              equals: id // dam_id should not be equal to the current id
            }
          },
          ...activeHorseFilter()
        }
      }
    },
    where: {
      horse_id: id, // Convert to number if necessary
      // Only consider active horses
      ...activeHorseFilter()
    }
  });
  // No active horse matches this id, so there is no maternal line to measure.
  // This used to `return --level`, which produced -1 from the initial level of
  // 0 and drove `buildSelect` past its base case (HOR-107). Absence is reported
  // as absence; the caller decides what to do with it.
  if (!storeHorse) {
    return null;
  }

  // Validate the dam_id
  if (storeHorse?.dam === null || level >= MAX_PEDIGREE_LEVEL) {
    return level; // Found the top-level dam (first ancestor)
  }

  // Otherwise, recursively call to find the ancestor
  return await findFirstAncestor(storeHorse.dam_id, ++level); // Recursive call
}

function convertToArray(idString: any) {
  // Check if the string is empty or undefined
  if (!idString) {
    return [];
  }

  // Split the string by commas and trim any whitespace around each element
  return idString.split(",").map((id: any) => Number(id));
}

// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event);

    // Set your desired recursion level here

    if (!body.level || !body.id) {
      // A required field is missing from the request: that is the caller's
      // mistake, not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
    }

    let ids = convertToArray(body.id);
    const data = [];
    for (let i = 0; i < ids.length; i++) {
      const level = await findFirstAncestor(ids[i]);

      // `findFirstAncestor` found no active horse for this id. Its lookup uses
      // the same filter as the query below, so that query would return nothing
      // anyway: report the empty result for this id explicitly instead of
      // building a select for a depth that does not exist.
      if (!isValidPedigreeLevel(level)) {
        data.push([]);
        continue;
      }

      const select = buildSelect(level, level);
      const apiResponse = await prisma.storehorse.findMany({
        select: select,
        where: {
          horse_id: ids[i],
          ...activeHorseFilter()
        },
        orderBy: {
          birthyear: "asc"
        }
      });
      // @ts-ignore1
      data.push(apiResponse); // Use spread operator to append array elements
    }
    return {
      status: 200,
      // body:JSON.stringify(apiResponse),
      body: JSON.stringify(data)
      // body:data
    };
  } catch (error) {
    // The guard above raises its own 400; anything that reaches here
    // failed on our side and stays a 500 (CLAUDE.md §7).
    if (isError(error)) {
      throw error;
    }
    console.error("Error fetching data:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      message: "Internal Server Error"
    });
  } finally {
    await prisma.$disconnect();
  }
});
