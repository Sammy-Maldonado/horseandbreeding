import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();

const buildSelect = (level: any, topLevel: any): any => {
  if (level === 0) {
    if (topLevel === 0) {
      return {
        horse_id: true,
        name: true,
        regnr: true,
        color: true,
        birthyear: true,
        breederid: true
      };
    }
    return {
      select: {
        horse_id: true,
        name: true,
        regnr: true,
        color: true,
        birthyear: true,
        breederid: true
      }
    };
  }
  if (level === topLevel) {
    return {
      horse_id: true,
      name: true,
      regnr: true,
      color: true,
      birthyear: true,
      breeders: true,
      breederid: true,
      sire: buildSelect(level - 1, topLevel),
      dam: buildSelect(level - 1, topLevel)
    };
  } else {
    return {
      select: {
        horse_id: true,
        name: true,
        regnr: true,
        color: true,
        birthyear: true,
        breederid: true,
        sire: buildSelect(level - 1, topLevel),
        dam: buildSelect(level - 1, topLevel)
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

    // Set your desired recursion level here

    if (!body.level || !body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" })
      };
    }
    const level = Number(body.level);
    const id = Number(body.id);
    let select = buildSelect(level, level);
    const apiResponse = await prisma.storehorse.findMany({
      select: select,
      where: {
        horse_id: id
      }
    });

    return {
      status: 200,
      body: JSON.stringify(apiResponse)
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
