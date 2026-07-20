import {  PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
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
        console.error("Error fetching data:", error);
        return {
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
        };
    } finally {
        await prisma.$disconnect();
    }
})