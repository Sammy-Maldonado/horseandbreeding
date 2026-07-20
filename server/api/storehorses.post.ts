import { PrismaClient } from "@prisma/client";
// import { VercelRequest, VercelResponse } from "@vercel/node";
import validateApiKey from '../middleware/validateApiKey';
const prisma = new PrismaClient();
// @ts-ignore
export default defineEventHandler(async (event) => {
  await validateApiKey(event);
  try {
    // @ts-ignore1
    // const query = getQuery(event);
    const body = await readBody(event);
    const breederId = body.breederId;
    const apiResponse = await prisma.$queryRaw`
    SELECT
      breeder.id,
      breeder.notes,
      breeder.addr1,
      breeder.tel,
      breeder.email,
      breeder.website,
      breeder.mapref,
      breeder.logo,
      breeder.farmname,
      card_trick.horse_id,
      card_trick.name,
      card_trick.birthyear,
      card_trick.breeder,
      breeder.breedername,
      card_trick.horse_id AS card_trick_id,
      card_trick.name AS card_trick_name,
      card_trick.sire_id AS card_trick_sire_id,
      sire.name AS sire_name,
      card_trick.dam_id AS card_trick_dam_id,
      dam.sire_id AS dam_sire_id,
      dam.name AS dam_name,
      grand_dam_sire.sire_id AS grand_dam_sire_id,
      grand_dam_sire.name AS grand_dam_sire_name,
      great_grand_dam.sire_id AS great_grand_dam_sire_id,
      great_grand_dam.name AS great_grand_dam_name,
      great_grand_dam_sire.name AS great_grand_dam_sire_name
    FROM
      storehorse AS card_trick
    JOIN
      storehorse AS sire ON card_trick.sire_id = sire.horse_id
    JOIN
      storehorse AS dam ON card_trick.dam_id = dam.horse_id
    JOIN
      storehorse AS grand_dam_sire ON dam.sire_id = grand_dam_sire.horse_id
    JOIN
      storehorse AS great_grand_dam ON dam.dam_id = great_grand_dam.horse_id
    JOIN
      storehorse AS great_grand_dam_sire ON great_grand_dam.sire_id = great_grand_dam_sire.horse_id
    JOIN
      breeder ON card_trick.breederid = breeder.id
    WHERE
      card_trick.breederid = ${breederId};`;
    return {
      status: 200,
      body: JSON.stringify( apiResponse),
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
});