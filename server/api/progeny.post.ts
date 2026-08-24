import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, isError } from "h3";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });

const buildSelect = () => {
 
    return {
      horse_id:true,
      name: true,
      birthyear:true,
      sire:{
        select:{
            name:true
        }
      },
      dam:{
        select:{
            name:true,
            sire:{
                select:{
                    name:true,
                },
            },
        }
      },
      has_disciplines: {
        where: {
          diciplinevalues_idvalues: {
            not: -1, // Exclude studbooks with an ID of 0
          },
        },
        include: {
          disciplines: {
            select: {
              short: true, // Short description from diciplinevalues
            },
          },
        },
      },
      type_horse:{
        select:{
          type:true,
        }
      },
      
      studbook_has:{ 
        where: {
          studbook_id: {
            not: -1, // Exclude studbooks with an ID of 0
          },
        },
        include: {
          studBook: {
            select: {
              abbr: true,  
            },
          },
        },
        take:1
      }
    };
};

// @ts-ignore
export default defineEventHandler(async (event) => {
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if ( !body.id) {
      // A required field is missing or too short: the caller's mistake,
      // not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
    } 
    let id=Number(body.id);
    let select = buildSelect();

    const data = await prisma.storehorse.findMany({
      select: select,
      where: {
        OR: [
          { dam_id: id },
          { sire_id: id },
        ],
      },
      orderBy:{
        birthyear:"asc"
      }
    });
    return {
      status: 200,
      // body:data,
      body: JSON.stringify(data),
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
