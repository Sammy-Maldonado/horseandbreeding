import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();

const buildSelect = (level: any, topLevel: any): any => {
  if (level === 0) {
    if (topLevel === 0) {
      return {
        name: true,
        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true,
                group_priority: true
              }
            } // This will include the related disciplinesvalues
          }
        }
      };
    }
    return {
      select: {
        name: true,
        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true,
                group_priority: true
              }
            } // This will include the related disciplinesvalues
          }
        }
      }
    };
  }
  if (level === topLevel) {
    return {
      name: true,
      has_disciplines: {
        select: {
          disciplines: {
            select: {
              value: true,
              priority: true,
              short: true,
              group_priority: true
            }
          } // This will include the related disciplinesvalues
        }
      },
      sire: buildSelect(level - 1, topLevel),
      dam: buildSelect(level - 1, topLevel)
    };
  } else {
    return {
      select: {
        name: true,
        has_disciplines: {
          select: {
            disciplines: {
              select: {
                value: true,
                priority: true,
                short: true,
                group_priority: true
              }
            } // This will include the related disciplinesvalues
          }
        },
        sire: buildSelect(level - 1, topLevel),
        dam: buildSelect(level - 1, topLevel)
      }
    };
  }
};

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
  await validateApiKey(event);
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if (!body.level || !body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" })
      };
    }
    const level = Number(body.level);
    let ids = convertToArray(body.id);
    let select = buildSelect(level, level);

    const data = [];
    for (let id = 0; id < ids.length; id++) {
      const apiResponse = await prisma.storehorse.findMany({
        select: select,
        where: {
          horse_id: ids[id]
        }
      });
      // @ts-ignore1
      data.push(apiResponse);
    }

    return {
      status: 200,
      // body:data,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  } finally {
    await prisma.$disconnect();
  }
});
