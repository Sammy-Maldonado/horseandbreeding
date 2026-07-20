import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import { title } from "process";

const prisma = new PrismaClient();

const buildSelect = () => {
   
    return {
        name:true,
        type_horse:{
            select:{
                type:true,
            },
        }, 
        has_approvedby:{
           
            where: {
              id_approvedby: {
                not: -1, // Exclude studbooks with an ID of 0
              },
            },
            include: {
                approvedly: {
                    select: {
                    approvedby: true,  
                    breed_code: true,   
                    },
                },
                
            },
        },
        birthyear:true,
        sire:{
            select:{
              name:true
            }
        },
        dam:{
            select:{
                name:true
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
              include:{
                disciplines:true,
              },
              
            },
          },
          
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
                  name:true,  
                },
              },
            },
            take:1
          },
          regnr:true,
          color:true,
          height:true,
          alias:true,
          rider:true,
          remarks_short:true,
          remarks:true,
          competitionAuthority:true
    };
   
};

// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event)
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if (!body.id) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" }),
      };
    } 
    let id = Number(body.id) ;
    let filter = buildSelect();
    const apiResponse = await prisma.storehorse.findFirst({
        select: filter,
        where: {
          horse_id: id,
        },
      });

    return {
      status: 200,
      // body:apiResponse,
      body: JSON.stringify(apiResponse),
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      status: 500,
      body: JSON.stringify({ error: error }),
    };
  } finally {
    await prisma.$disconnect();
  }
});
