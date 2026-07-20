import { PrismaClient } from "@prisma/client";
import { defineEventHandler, readBody } from "h3";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
  try {
    const { id } = await readBody(event);
    const horseId = Number(id);

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
  } catch (error: any) {
    return {
      status: 400,
      message: "Error produssing",
      statusMessage: error.message
    };
  }
});
