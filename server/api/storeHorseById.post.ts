import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import { title } from "process";

const prisma = new PrismaClient();

const buildSelect = (level: any, topLevel: any): any => {
  if (level === 0) {
    if (topLevel === 0) {
      return {
        name: true
      };
    }
    return {
      select: {
        name: true
      }
    };
  }
  if (level === topLevel) {
    return {
      name: true,
      sell_price: true,
      horse_type: true,
      birthyear: true,
      sexe: true,
      currency: true,
      age: true,
      comments: true,
      height: true,
      created_at: true,
      ad_title: true,
      // user_has_horse:{
      //   select:{
      //     area:{
      //       select:{
      //         full_name:true
      //       }
      //     },
      //     user:{
      //       select:{
      //         email:true,
      //         first_name:true,
      //         last_name:true,
      //         mobile:true,
      //       }
      //     }
      //   }
      // },
      seller: {
        select: {
          full_name: true,
          mobile: true,
          email: true,
          location: true
        }
      },
      photos: {
        select: {
          photo_id: true,
          type: true,
          cover: true,
          title: true
        },
        orderBy: {
          cover: "desc"
        }
      },
      sire: buildSelect(level - 1, topLevel),
      dam: buildSelect(level - 1, topLevel)
    };
  } else {
    return {
      select: {
        name: true,
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

    if (!body.level || !body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" })
      };
    }
    const level = Number(body.level);
    let id = Number(body.id);
    let select = buildSelect(level, level);
    const apiResponse = await prisma.storehorse.findMany({
      select: select,
      where: {
        horse_id: id
      }
    });

    return {
      status: 200,
      // body:apiResponse,
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
