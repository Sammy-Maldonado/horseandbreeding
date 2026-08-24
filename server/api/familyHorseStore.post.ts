import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, isError } from "h3";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

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
