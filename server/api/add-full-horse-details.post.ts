import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, defineEventHandler, isError, readBody } from "h3";
import { ensureHasRoleAndScope } from "../utils/requireAuthorization";
const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

export default defineEventHandler(async (event) => {
  // Refuses the caller before any work is done: 401 when the request carries
  // no verifiable token, 403 when the user lacks the role or the scope.
  const userInfo = ensureHasRoleAndScope(
    event.context.user,
    ["Admin"],
    "create_horses"
  );

  try {
    const { data } = await readBody(event).catch(() => ({ data: null }));
    if (!data?.horse) {
      throw createError({
        statusCode: 400,
        message: "Error produssing",
        statusMessage: "Horse details are required."
      });
    }
    const horseId = data?.horse_id ? data?.horse_id : -1;
    data.horse.remarks = data?.horse?.remarks
      ? data?.horse?.remarks?.replace(/(&nbsp;)+/g, "")
      : "";

    // First, find or create the user
    const filteredDisciplineData = data.diciplinevalues.filter(
      (item: any) => item.diciplinevalues_idvalues !== null
    );
    console.log(" filteredDisciplineData", filteredDisciplineData);
    delete data?.horse?.sire;
    delete data?.horse?.dam;

    let storehorseData;
    if (horseId < 0) {
      storehorseData = {
        ...data.horse,
        owner: userInfo.userId,
        has_disciplines: {
          createMany: {
            data: filteredDisciplineData
          }
        }
      };
      if (data.studbook_id) {
        storehorseData = {
          ...storehorseData,
          studbook_has: {
            create: {
              studbook_id: data.studbook_id
            }
          }
        };
      }
    } else {
      // If updating an existing horse, delete existing related disciplines first
      await prisma.storehorse_has_diciplinevalues.deleteMany({
        where: { storehorse_horse_id: horseId }
      });

      // For updating an existing horse record
      storehorseData = {
        ...data.horse,
        owner: userInfo.userId,
        has_disciplines: {
          createMany: {
            data: filteredDisciplineData
          }
        }
      };

      if (data.studbook_id) {
        await prisma.storehorse_has_diciplinevalues.deleteMany({
          where: { storehorse_horse_id: horseId }
        });
        storehorseData = {
          ...storehorseData,
          studbook_has: {
            create: { studbook_id: data.studbook_id }
          }
        };
      }
    }
    // console.log("data", storehorseData);
    // return;
    const horse = await prisma.storehorse.upsert({
      where: { horse_id: horseId },
      update: storehorseData, // No update needed for user
      create: storehorseData,
      include: {
        has_approvedby: true,
        studbook_has: true
      }
    });
    return {
      statusMessage: "Horse created successfully",
      statusCode: 200,
      // body:userInfo
      // body:horse_id,
      body: JSON.stringify(horse?.horse_id)
    };
  } catch (error) {
    console.log("Error produssing", error);
    // The request itself was well formed; the failure happened on our side, so
    // it is a 500 and not a 400 (CLAUDE.md §7).
    if (isError(error)) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: "Error produssing",
      statusMessage:
        "An error occurred while adding or editing horses in your request."
    });
  }
});
