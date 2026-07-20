import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import{defineEventHandler} from "h3";

const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
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
        return{
            statusCode:400,
            message:"Error produssing",
            statusMessage:"Bad request"
        }
    }
})