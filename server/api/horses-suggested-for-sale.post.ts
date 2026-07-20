import {  PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";

const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
    try {
        // @ts-ignore
        const {horse_type, age} = await readBody(event);
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
            },
            where:{
                OR: [
                    horse_type ? { horse_type } : {},   // Filter by horse type, if provided
                    age ? { age: { equals: age } } : {}, // Filter by exact age, if provided
                  ],
                status: -1 ,          // Filter by status (e.g., -1)
                forsale: 1 ,          // Filter by forsale (e.g., 1)
            },
            // orderBy:{
            //     horse_id:"desc",
            // },
            take: 6   // Equivalent to LIMIT 20
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
