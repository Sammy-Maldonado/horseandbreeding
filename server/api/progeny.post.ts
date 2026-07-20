import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();

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
  await validateApiKey(event)
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if ( !body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" }),
      };
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
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  } finally {
    await prisma.$disconnect();
  }
});
