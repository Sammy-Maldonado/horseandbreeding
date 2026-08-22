import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler, isError, readBody } from "h3";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  try {
    const { id } = await readBody(event).catch(() => ({ id: undefined }));
    const horseId = Number(id);
    if (!Number.isInteger(horseId) || horseId <= 0) {
      throw createError({
        statusCode: 400,
        message: "Error produssing",
        statusMessage: "A valid horse id is required."
      });
    }

    const storeHorse = await prisma.storehorse.findUnique({
      select: {
        name: true,
        horse_type: true,
        birthyear: true,
        regnr: true,
        color: true,
        height: true,
        alias: true,
        predicates: true,
        competitionAuthority: true,
        remarks_short: true,
        remarks: true,
        sire_id: true,
        dam_id: true,
        sexe: true,
        sire: {
          select: {
            name: true
          }
        },
        dam: {
          select: {
            name: true
          }
        }
      },
      where: {
        horse_id: horseId
      }
    });

    const studbookStorehorse = await prisma.studbook_has_storehorse.findFirst({
      select: {
        studbook_id: true
      },
      where: {
        storehorse_horse_id: horseId
      }
    });
    const storeHorseDisciplines =
      await prisma.storehorse_has_diciplinevalues.findMany({
        select: {
          diciplinevalues_idvalues: true,
          disciplines: {
            select: {
              diciplines_iddiciplines: true
            }
          }
        },
        where: {
          storehorse_horse_id: horseId,
          diciplinevalues_idvalues: {
            gt: -1
          }
        }
      });
    const response = {
      storehorse: storeHorse,
      studbook_id: studbookStorehorse?.studbook_id
        ? studbookStorehorse?.studbook_id
        : null,
      storeHorseDisciplines: storeHorseDisciplines
    };
    return {
      message: "Successful..!",
      status: 200,
      // data:response,
      body: JSON.stringify(response)
    };
  } catch (error: unknown) {
    // The raw database message never reaches the client (CLAUDE.md §7).
    if (isError(error)) {
      throw error;
    }
    console.error("Loading the horse for editing failed:", error);
    throw createError({
      statusCode: 500,
      message: "Error produssing",
      statusMessage: "An error occurred while loading the horse."
    });
  }
});
