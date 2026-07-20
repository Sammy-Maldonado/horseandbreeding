import { PrismaClient } from "@prisma/client";
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
      console.error("Error fetching data:", error);
      return {
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      };
    } finally {
      await prisma.$disconnect();
    }
  }