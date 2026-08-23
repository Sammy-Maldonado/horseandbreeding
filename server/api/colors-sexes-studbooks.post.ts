import { PrismaClient } from "../../generated/prisma/client";
import { createMariaDbAdapter } from "../utils/prismaAdapter";
import { createError, defineEventHandler } from "h3";

const prisma = new PrismaClient({ adapter: createMariaDbAdapter() });
export default defineEventHandler( async (event) =>{
    try {
        const colors = await prisma.tbl_color.findMany({
            orderBy:{
                color_name:"asc"
            }
        });
        
        const sexes = await prisma.sexe.findMany({
            select:{
                idsexe:true,
                type:true
            },
            orderBy:{
                type:"asc"
            }
        });
        const studbook = await prisma.studbook.findMany({
            orderBy:{
                name:"asc"
            }
        });
        const response = {
            colors:colors,
            sexes: sexes,
            studbook:studbook
        }
        return {
            message:"Successful..!",
            status:200,
            // data:response
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