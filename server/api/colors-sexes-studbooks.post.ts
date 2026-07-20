import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import{defineEventHandler} from "h3";

const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
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
        return{
            status:400,
            message:"Error produssing",
            statusMessage:"Bad request"
        }
    }
})