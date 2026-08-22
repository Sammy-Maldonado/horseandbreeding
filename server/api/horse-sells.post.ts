import {  PrismaClient } from "@prisma/client";
import { createError, isError } from "h3";

const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler( async (event) =>{
    try {
        // @ts-ignore
        const {offSet} = await readBody(event);
        console.log(offSet);
        const apiResponse = await prisma.storehorse.findMany({
            select:{
                name:true,
                horse_id:true,
                sell_price:true,
                horse_type:true,
                birthyear:true,
                sexe:true,
                currency:true,
                age:true,
                ad_title:true,
                photos:{
                    select:{
                        photo_id:true,
                        type:true,
                        cover:true, 
                        title:true
                    },
                    orderBy:{
                        cover: 'desc',
                    },
                    take:1
                },
                // sire:{
                //     select:{
                //         name:true
                //     }
                // },
                // dam:{
                //     select:{
                //         sire:{
                //             select:{
                //                 name:true
                //             }
                //         }
                //     },  
                // }
            },
            where:{
                status:-1,
                forsale:1,
            },
            orderBy:{
                horse_id:"desc",
            },
            skip: offSet,  // Equivalent to OFFSET 0
            take: 20   // Equivalent to LIMIT 20
        });
        return {
            status : 200,
            // body:apiResponse
            body: JSON.stringify(apiResponse)
        }
    } catch (error) {
      // A deliberate HTTP error keeps the status it was raised with;
      // anything else failed on our side, so it is a 500 and the raw
      // error stays in the log (CLAUDE.md §7).
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
})