import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, isError } from "h3";
import { parseHorseIds } from "../utils/horseIds";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

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

// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if (!body.level || !body.id) {
      // A required field is missing from the request: that is the caller's
      // mistake, not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
    }
    // Same grammar, same refusal as `POST /api/horse`: the id is decided before
    // anything is queried, so a malformed one never becomes a 500 (HOR-103).
    const parsed = parseHorseIds(body.id);
    if (!parsed.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: parsed.reason
      });
    }

    const level = Number(body.level);
    const ids = parsed.ids;
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
