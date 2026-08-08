import { PrismaClient } from "@prisma/client";
import{defineEventHandler} from "h3";

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
        return{
            status:400,
            message:"Error produssing",
            statusMessage:"Bad request"
        }
    }
})