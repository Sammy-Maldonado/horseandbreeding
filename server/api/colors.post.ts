import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler } from "h3";

const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    try {
        const response = await prisma.tbl_color.findMany({
            orderBy:{
                color_name:"asc"
            }
        });
        return {
            message:"Successful..!",
            status:200,
            body: JSON.stringify(response)
        }
    } catch (error) {
        throw createError({
            statusCode: 500,
            message: "Error produssing",
            statusMessage: "Internal Server Error"
        });
    }
})