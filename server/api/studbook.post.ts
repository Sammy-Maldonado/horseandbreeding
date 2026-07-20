import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import{defineEventHandler} from "h3";

const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
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
        return{
            status:400,
            message:"Error produssing",
            statusMessage:"Bad request"
        }
    }
})