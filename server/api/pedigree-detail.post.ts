import { PrismaClient } from "@prisma/client";
import { createError, isError } from "h3";
import {
  activeHorseFilter,
  horseStatusSelect
} from "../utils/storehorse-compat";

const prisma = new PrismaClient();

const buildSelect = (
  level: any,
  topLevel: any
): any => {
  if (level === 0) {
    if (topLevel === 0) {
      return {
        name: true,
        horse_id: true,
        remarks_short: true,
        height: true,
        type_horse: {
          select: {
            type: true
          }
        },
        regnr: true,
        color: true,
        breeders: {
          select: {
            id: true,
            breedername: true,
            farmname: true,
            contactfname: true,
            contactlname: true
          }
        }
      };
    }
    return {
      select: {
        name: true,
        horse_id: true,
        remarks_short: true,
        height: true,
        type_horse: {
          select: {
            type: true
          }
        },
        regnr: true,
        color: true,
        breeders: {
          select: {
            id: true,
            breedername: true,
            farmname: true,
            contactfname: true,
            contactlname: true
          }
        },
        birthyear: true,
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
      where: {
        ...activeHorseFilter()
      }
    };
  }
  if (level === topLevel) {
    return {
      name: true,
      horse_id: true,
      remarks_short: true,
      height: true,
      type_horse: {
        select: {
          type: true
        }
      },
      regnr: true,
      color: true,
      breeders: {
        select: {
          id: true,
          breedername: true,
          farmname: true,
          contactfname: true,
          contactlname: true
        }
      },
      birthyear: true,
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
      },
      sire: buildSelect(level - 1, topLevel),
      dam: buildSelect(level - 1, topLevel)
    };
  } else {
    return {
      select: {
        ...horseStatusSelect(),
        name: true,
        horse_id: true,
        remarks_short: true,
        height: true,
        type_horse: {
          select: {
            type: true
          }
        },
        regnr: true,
        color: true,
        breeders: {
          select: {
            id: true,
            breedername: true,
            farmname: true,
            contactfname: true,
            contactlname: true
          }
        },
        birthyear: true,
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
        },
        sire: buildSelect(level - 1, topLevel),

        dam: buildSelect(level - 1, topLevel)
      },
      where: {
        ...activeHorseFilter()
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
    const level = Number(body.level);
    let id = Number(body.id);
    let select = buildSelect(level, level);

    const data = await prisma.storehorse.findMany({
      select: select,
      where: {
        horse_id: id,
        ...activeHorseFilter()
      }
    });
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
