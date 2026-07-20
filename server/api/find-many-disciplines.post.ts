import { PrismaClient } from "@prisma/client";
import validateApiKey from "../middleware/validateApiKey";
import{defineEventHandler} from "h3";

const prisma = new PrismaClient();
const JUMPING = 0;
const DRESSAGE = 1;
const EVENTING = 2;
const RACING = 3;
export default defineEventHandler( async (event) =>{
    await validateApiKey(event);
    try {
        // @ts-ignore1
        const body = await readBody(event);
        
        const disciplineIDs = [JUMPING,DRESSAGE,EVENTING,RACING];
        const data =[];
        for (const id of disciplineIDs ) {
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
            // @ts-ignore1
            data.push(response);
        }
        
        return {
            message:"Successful..!",
            status:200,
            // data:data
            body: JSON.stringify(data)
        }
    } catch (error) {
        return{
            statusCode:400,
            message:"Error produssing",
            statusMessage:"Bad request"
        }
    }
})