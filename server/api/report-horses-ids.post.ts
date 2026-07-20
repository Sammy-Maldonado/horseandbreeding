import { PrismaClient } from "@prisma/client";
import type { UserData } from "../utils/types"; // Adjust this import as needed
import { ensureHasRoleAndScope } from "../utils/authorization"; // Adjust the path based on your structure
const prisma = new PrismaClient();

const convertToArray = (idString: any) => {
  // Check if the string is empty or undefined
  if (!idString) {
    return [];
  }

  // Split the string by commas and trim any whitespace around each element
  return idString.split(",").map((id: any) => Number(id));
};
const cleanDiscipline = (disciplines: any[]): any[] => {
  if (disciplines) {
    for (let index = 0; index < disciplines.length; index++) {
      disciplines[index] = {
        // value: disciplines[index].disciplines.value,
        // priority: disciplines[index].disciplines.priority,
        short: disciplines[index].disciplines.short,
        group: disciplines[index].disciplines.group_priority
      };
    }
  }
  return disciplines;
};
const cleanData = (data: any[]): any[] => {
  for (let i = data.length - 1; i >= 0; i--) {
    const element = data[i];
    data[i] = {
      name: element.name,
      id: element.horse_id,
      birthyear: element.birthyear,
      remarks_short: element.remarks_short,
      remarks: element.remarks,
      has_disciplines: cleanDiscipline(element.has_disciplines),
      lineage_dam: orderLineageDam(element.lineage_dam)
    };

    if (element.lineage_dam && element.lineage_dam.length > 0) {
      cleanData(element.lineage_dam);
    }
  }

  return data;
};

const pedigree = (data: any[], ids: number[]): any[] => {
  // Create a deep copy of the data
  const deepCopyData = JSON.parse(JSON.stringify(data));

  for (const horse of deepCopyData) {
    if (Object.prototype.hasOwnProperty.call(horse, "lineage_dam")) {
      for (const lineage of horse.lineage_dam) {
        if (ids.includes(lineage.id)) {
          // Clear the lineage_dam without affecting the original reference
          lineage.lineage_dam = [];
          const index = ids.indexOf(lineage.id);
          ids.splice(index, 1);

          break;
        }
      }
    }
  }

  return deepCopyData;
};

const buildNestedIncludes = (level: any): any => {
  if (level < 0) return {};
  return {
    select: {
      name: true,
      horse_id: true,
      birthyear: true,
      remarks_short: true,
      remarks: true,
      has_disciplines: {
        select: {
          disciplines: true // Include disciplines
        },
        orderBy: {
          disciplines: {
            group_priority: "desc" // Order disciplines by priority descending
          }
        }
      },
      lineage_dam: buildNestedIncludes(level - 1)
    },
    where: {
      status: 1
    }
  };
};

async function findFirstAncestor(id: any, level = 0, dam_ids: number[] = []) {
  // Retrieve the horse record with the specified dam_id and status of 1

  const storeHorse = await prisma.storehorse.findFirst({
    select: {
      dam_id: true,
      horse_id: true,
      name: true,
      dam: {
        select: {
          dam_id: true,
          horse_id: true,
          status: true,
          name: true
        },
        where: {
          status: 1,
          horse_id: {
            gt: 0, // dam_id greater than 0
            not: {
              equals: id // dam_id should not be equal to the current id
            }
          }
        }
      }
    },
    where: {
      horse_id: id, // Convert to number if necessary
      status: 1 // Only consider active horses
    }
  });
  // Check if the horse has a dam (parent)
  if (!storeHorse) {
    return dam_ids;
  }
  // Validate the dam_id
  if (storeHorse?.dam === null || level == 4) {
    return dam_ids; // Found the top-level dam (first ancestor)
  }
  dam_ids.push(storeHorse?.dam?.horse_id);

  // Otherwise, recursively call to find the ancestor
  return await findFirstAncestor(storeHorse.dam_id, ++level, dam_ids); // Recursive call
}
const orderLineageDam = (data: any[]): any[] => {
  try {
    return data?.sort((a: any, b: any) => {
      const aPriority = a?.has_disciplines?.[0]?.disciplines?.priority ?? 0;
      const bPriority = b?.has_disciplines?.[0]?.disciplines?.priority ?? 0;

      // Descending order by priority
      return bPriority - aPriority;
    });
  } catch (error) {
    console.error("Error ordering lineage dam:", error);
    return data; // Return original data in case of an error
  }
};

const getLineageDam = (
  data: any[],
  ids: Number[],
  filter: any[] = []
): any[] => {
  if (ids.length === 0) {
    return filter;
  }

  for (let i = data.length - 1; i >= 0; i--) {
    const element = data[i];
    // Check if the current element matches the ID
    if (ids.includes(element.id)) {
      filter.unshift(element);
    }
    // Recursively search in `lineage_dam`
    if (element.lineage_dam && element.lineage_dam.length > 0) {
      getLineageDam(element.lineage_dam, ids, filter);
    }
  }

  return filter;
};
// @ts-ignore
export default defineEventHandler(async (event) => {
  const userInfo: UserData = event.context.user; // Get the user info from the context
  // Check if the user has the required scope to update horses
  ensureHasRoleAndScope(userInfo, ["Admin", "Seller"], "create_horses");
  if (!userInfo) {
    return { statusCode: 401, message: "Unauthorized" }; // User not authenticated
  }
  try {
    // @ts-ignore1
    const body = await readBody(event);

    // Set your desired recursion level here

    if (!body.horseIds) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" })
      };
    }

    let horseIds = convertToArray(body.horseIds);
    let data = [];
    let query = {};
    for (let i = 0; i < horseIds.length; i++) {
      const damIds = await findFirstAncestor(horseIds[i]);
      const level = damIds.length ?? 0;
      if (level > 0) {
        const damId = damIds[level - 1];
        query = {
          name: true,
          horse_id: true,
          birthyear: true,
          remarks_short: true,
          remarks: true,
          has_disciplines: {
            select: {
              disciplines: true // Include disciplines
            },
            orderBy: {
              disciplines: {
                group_priority: "desc" // Order disciplines by priority descending
              }
            }
          },
          lineage_dam: buildNestedIncludes(level)
        };
        const apiResponse = await prisma.storehorse.findMany({
          select: query,
          where: {
            horse_id: damId,
            status: 1
          }
        });
        data.push(
          pedigree(getLineageDam(cleanData(apiResponse), damIds, []), damIds)
        );
        // data.push(apiResponse);
      }
    }
    return {
      statusMessage: "Report created successfully",
      statusCode: 200,
      body: JSON.stringify(data)
      // body: data
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      statusCode: 400,
      message: "Error produssing",
      statusMessage: error
    };
  } finally {
    await prisma.$disconnect();
  }
});
