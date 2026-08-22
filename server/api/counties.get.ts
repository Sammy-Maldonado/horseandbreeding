import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler } from "h3";
 
const prisma = new PrismaClient();
export default defineEventHandler(async(event) => {
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
        throw createError({
            statusCode: 500,
            message: "Error produssing..!",
            statusMessage: "Internal Server Error"
        });
    }
});   