import { PrismaClient } from "@prisma/client";
import { defineEventHandler } from 'h3';
import validateApiKey from "../middleware/validateApiKey";
 
const prisma = new PrismaClient();
export default defineEventHandler(async(event) => {
    await validateApiKey(event)
    try {
        const response = await prisma.counties.findMany(
            {
                select:{
                    id:true,
                    county:true
                }
            }
        )
        return {
            massage: 'Successful..!',
            statusCode :200,
            body: JSON.stringify(response)
        }
    } catch (error) {
        console.error( 'Error produssing', error);
        return {
            statusCode:400,
            massage:"Error produssing..!",
            statusMessage:"Bad request"


        }
    }
});   