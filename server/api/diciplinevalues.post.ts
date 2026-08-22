import { PrismaClient } from "@prisma/client";
import { createError, defineEventHandler } from "h3";

const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    try {
        // @ts-ignore1
        const body = await readBody(event);
        const id = body.id?body.id:0;
        const response = await prisma.diciplinevalues.findMany({
            select:{
                value:true,
                short:true, 
                idvalues:true
            },
            where:{
                diciplines_iddiciplines:id
            },
            orderBy:{
                value:"asc"
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