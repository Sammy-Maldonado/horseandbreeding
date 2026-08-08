import { PrismaClient } from "@prisma/client";
import {defineEventHandler} from "h3";
const prisma = new PrismaClient();
export default defineEventHandler( async (event) =>{
    try {
        const count = await prisma.storehorse.count({
            where:{
                status:-1,
                forsale:1
            }
        });
        return {
            statusCode: 200,
            pages : Math.ceil( count /20 ) ,
            message:'Successful..!'
        }
    } catch (error) {
        return{
            statusCode:400,
            message:'Error produssing ..!',
            statusMessage:'Bad request..'
        }
    }
});