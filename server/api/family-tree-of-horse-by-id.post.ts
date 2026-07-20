import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();
async function getDescendantsById(whereFilter: any) {
  const horses = await prisma.storehorse.findMany({
    select: {
      birthyear: true,
      name: true, // Add specific fields you want to fetch
      horse_id: true, // Select only the ID (you can add other fields you need)
      sire: {
        select: {
          name: true
        }
      },
      breeders: {
        select: {
          id: true,
          breedername: true,
          contactfname: true,
          contactlname: true
        }
      },

      has_disciplines: {
        where: {
          diciplinevalues_idvalues: {
            not: -1 // Exclude studbooks with an ID of 0
          }
        },
        include: {
          disciplines: {
            select: {
              value: true, // Field from diciplinevalues
              short: true, // Short description from diciplinevalues
              priority: true // Priority field from diciplinevalues
            }
          }
        }
      },
      has_approvedby: {
        where: {
          id_approvedby: {
            not: -1 // Exclude studbooks with an ID of 0
          }
        },
        include: {
          approvedly: {
            select: {
              approvedby: true,
              breed_code: true
            }
          }
        }
      },

      studbook_has: {
        where: {
          studbook_id: {
            not: -1 // Exclude studbooks with an ID of 0
          }
        },
        include: {
          studBook: {
            select: {
              abbr: true
            }
          }
        },
        take: 1
      }
    },

    where: whereFilter, // Assuming 'lineage_dam_id' is the field for the parent reference
    orderBy: {
      birthyear: "asc"
    }
  });
  return horses;
}
async function findFirstAncestor(id: any, level: any) {
  // Retrieve the horse record with the specified dam_id and status of 1

  const storeHorse = await prisma.storehorse.findFirst({
    select: {
      dam_id: true,
      horse_id: true,
      dam: {
        select: {
          dam_id: true,
          horse_id: true,
          status: true
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
    throw new Error(`No horse found with dam_id: ${storeHorse}`);
  }

  // Validate the dam_id
  if (storeHorse?.dam === null || level == 4) {
    const whereFolter = { horse_id: storeHorse?.horse_id, status: 1 };
    const mainHorse = await getDescendantsById(whereFolter);
    if (mainHorse.length > 0) {
      return mainHorse[0];
    }
    return storeHorse; // Found the top-level dam (first ancestor)
  }

  // Otherwise, recursively call to find the ancestor
  return await findFirstAncestor(storeHorse.dam_id, ++level); // Recursive call
}

async function getDescendants(horseId: any): Promise<any> {
  // Fetch only the direct children (lineage_dam) of the horse
  const whereFolter = {
    dam_id: Number(horseId),
    status: 1,
    horse_id: {
      gt: 0, // dam_id greater than 0
      not: {
        equals: horseId // dam_id should not be equal to the current id
      }
    }
  };
  const descendants = await getDescendantsById(whereFolter);

  // Recursively fetch descendants of each child
  const allDescendants = await Promise.all(
    descendants.map(async (child) => ({
      ...child,
      Offspring: await getDescendants(child.horse_id) // Recursively get children's descendants
    }))
  );

  return allDescendants;
}

// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event);
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if (!body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" })
      };
    }
    const id = Number(body.id);
    const mainHorse = await findFirstAncestor(id, 0);
    const apiResponse = await getDescendants(mainHorse.horse_id);
    const response = await {
      ...mainHorse,
      Offspring: apiResponse
    };
    return {
      status: 200,
      //   body:mainHorse,
      body: response
      //   body: JSON.stringify([response]),
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: error })
    };
  } finally {
    await prisma.$disconnect();
  }
});
