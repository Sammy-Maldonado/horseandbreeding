import { PrismaClient } from "@prisma/client";
import { title } from "process";
import { createError, isError } from "h3";

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
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if (!body.id) {
      // A required field is missing or too short: the caller's mistake,
      // not a server failure (HOR-96).
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        message: "Error the data define"
      });
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
    // The guard above raises its own 400; anything that reaches here
    // failed on our side, and the raw error never leaves the server
    // (CLAUDE.md §7).
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
