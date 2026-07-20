import { PrismaClient } from "@prisma/client";
import { defineEventHandler, readBody } from "h3";
import type { UserData } from "../utils/types"; // Adjust this import as needed
import { ensureHasRoleAndScope } from "../utils/authorization"; // Adjust the path based on your structure
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const userInfo: UserData = event.context.user; // Get the user info from the context
  // Check if the user has the required scope to update horses
  ensureHasRoleAndScope(userInfo, ["Admin"], "create_horses");
  if (!userInfo) {
    return { statusCode: 401, message: "Unauthorized" }; // User not authenticated
  }
  try {
    const { data } = await readBody(event);
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
    return {
      statusCode: 400,
      message: "Error produssing",
      statusMessage:
        "An error occurred while adding or editing horses in your request."
    };
  }
});
