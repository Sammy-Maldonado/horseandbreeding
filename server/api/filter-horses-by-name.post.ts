import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();

// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event)
  try {
    // @ts-ignore1
    const body = await readBody(event);

    if ( !body.search || body.search?.length < 3 ) {
      return {
        status: 500,
        body: JSON.stringify({ error: "Error the data define" }),
      };
    } 
    let search=body.search;
    let page = body.page? body.page:0;
    const data  = await prisma.storehorse.findMany({
        select:{
            horse_id:true,
            name:true,
            birthyear:true,
            regnr:true,
            dam:{
                select:{
                    name:true
                },
                where:{
                    status:1
                }
            },
            sire:{
                select:{
                    name:true
                },
                where:{
                    status:1
                }
            },
        },
        where: {
            name: {
                contains: search, // Partial match for name
            }, 
            status:1
        },
        orderBy:{
          name:"asc",
        },
        skip:page,
        take:10
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
