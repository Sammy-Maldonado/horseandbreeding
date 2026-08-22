import { PrismaClient } from "@prisma/client";
import { createError, isError } from "h3";
const prisma = new PrismaClient();
export default async function ( ) {
    try {
      const apiResponse = await prisma.breeder.findMany({
        select:{
          breedername:true,
          id:true,
          
        },
        where: {
          breedername:{
            not:null,
          },
    }});
      
      return {
        status: 200,
        body:apiResponse
        // body: JSON.stringify(apiResponse),
      };
    } catch (error) {
      // A deliberate HTTP error keeps the status it was raised with;
      // anything else failed on our side, so it is a 500 and the raw
      // error stays in the log (CLAUDE.md §7).
      if (isError(error)) {
        throw error;
      }
      console.error("Error fetching data:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
        message: "Internal Server Error"
      });
    } finally {
      await prisma.$disconnect();
    }
  }