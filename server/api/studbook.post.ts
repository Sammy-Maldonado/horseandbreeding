import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, defineEventHandler } from "h3";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
export default defineEventHandler( async (event) =>{
    try {
        const response = await prisma.studbook.findMany({
            orderBy:{
                name:"asc"
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