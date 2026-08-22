import { PrismaClient, Prisma } from "@prisma/client";
import { activeHorseFilter } from "../utils/storehorse-compat";

const prisma = new PrismaClient();

const buildSelect = () => {
  return {
    horse_id: true,
    name: true,
    birthyear: true,
    sire: {
      select: {
        name: true
      }
    },
    dam: {
      select: {
        name: true,
        sire: {
          select: {
            name: true
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
    regnr: true
  };
};

const searchHorses = async (select: any, name: string, offSet: any) => {
  const conditions: Prisma.storehorseWhereInput[] = [];

  // Add name condition if provided
  if (name) {
    conditions.push({ name: { contains: name } }); // Removed `mode: 'insensitive'`
  }

  const result = await prisma.storehorse.findMany({
    select: select,
    where: {
      // If there are any conditions, add them to OR
      ...(conditions.length > 0 && { OR: conditions }),
      // Ensure status is 1
      ...activeHorseFilter()
    },
    orderBy: {
      name: "asc"
    },
    skip: offSet, // Equivalent to OFFSET 0
    take: 50 // Equivalent to LIMIT 20
  });

  return result;
};

// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if (!body.search && !body.page) {
      // A required field is missing from the request: that is the caller's
      // mistake, not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
    }
    const { page, search } = body;

    let select = buildSelect();
    const data = await searchHorses(select, search, Number(page));
    return {
      status: 200,
      //   body:data,
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
