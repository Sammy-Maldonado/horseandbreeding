import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import{defineEventHandler} from "h3";

const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
    try {
        const response = await prisma.sexe.findMany({
            select:{
                idsexe:true,
                type:true
            },
            orderBy:{
                type:"asc"
            }
        });
        return {
            message:"Successful..!",
            statusCode:200,
            body: JSON.stringify(response)
        }
    } catch (error) {
        return{
            statusCode:400,
            message:"Error produssing",
            statusMessage:"Bad request"
        }
    }
})