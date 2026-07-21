import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import {
  activeHorseFilter,
  horseStatusSelect,
  storehorseSupportsStatus
} from "../utils/storehorse-compat";

const prisma = new PrismaClient();

const buildSelect = (
  level: any,
  topLevel: any,
  supportsStatus: boolean
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
        ...activeHorseFilter(supportsStatus)
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
      sire: buildSelect(level - 1, topLevel, supportsStatus),
      dam: buildSelect(level - 1, topLevel, supportsStatus)
    };
  } else {
    return {
      select: {
        ...horseStatusSelect(supportsStatus),
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
        sire: buildSelect(level - 1, topLevel, supportsStatus),

        dam: buildSelect(level - 1, topLevel, supportsStatus)
      },
      where: {
        ...activeHorseFilter(supportsStatus)
      }
    };
  }
};

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
    let id = Number(body.id);
    const supportsStatus = await storehorseSupportsStatus(prisma);
    let select = buildSelect(level, level, supportsStatus);

    const data = await prisma.storehorse.findMany({
      select: select,
      where: {
        horse_id: id,
        ...activeHorseFilter(supportsStatus)
      }
    });
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
