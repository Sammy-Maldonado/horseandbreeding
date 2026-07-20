// server/api/uploadImages.js
import { defineEventHandler, readBody } from "h3";
import multiparty from "multiparty";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ensureHasRoleAndScope } from "../utils/authorization"; // Adjust the path based on your structure
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// Define an interface for the expected structure
interface ParseResult {
  fields: Record<string, any>; // Replace 'any' with a more specific type if known
  files: Record<string, any>; // Replace 'any' with a more specific type if known
}

const configGallery = (photos: any, user_id: any, cover: any, horseId: any) => {
  if (!photos) {
    return [];
  }
  return photos.map((photo: any, index: any) => ({
    photo_id: photo,
    user_id: user_id,
    status: true,
    cover: cover == index,
    horse_id: horseId
  }));
};

export default defineEventHandler(async (event) => {
  // Check if the user has the required scope to update horses
  const userInfo = event.context.user; // Get the user info from the context
  ensureHasRoleAndScope(userInfo, ["Admin", "Seller"], "create_horses");

  try {
    // Ensure the uploadImages directory exists
    const uploadDir = path.join(process.cwd(), "public/uploadImages");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Create a new multiparty form
    const form = new multiparty.Form();
    let horse_id = -1,
      cover = 0;

    // Parse the incoming form data
    const { files }: ParseResult = await new Promise((resolve, reject) => {
      form.parse(event.req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
        horse_id = fields?.horseId ? Number(fields?.horseId) : 0;
        cover = Number(fields?.cover) || 0;
      });
    });

    // Validate horse_id
    if (horse_id < 0) {
      return {
        statusMessage: "Horse ID is required and cannot be empty.",
        statusCode: 400,
        horse_id: horse_id
      };
    } else {
      const horse = await prisma.storehorse.findUnique({
        where: { horse_id: horse_id }
      });
      if (!horse?.horse_id) {
        return {
          statusMessage: "Horse ID is required, not valid.",
          statusCode: 401,
          horse_id: horse_id
        };
      }
    }

    // Check if files.files is an array
    if (!files || !files.files || !Array.isArray(files.files)) {
      throw new Error("Files is not an array");
    }

    const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif"];
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/gif"];
    let photos: string[] = [];

    // Process and save each file with a unique ID as the filename
    for (const file of files.files) {
      const tempPath = file.path;
      const fileExtension = path.extname(file.originalFilename).toLowerCase();
      const mimeType = file.headers["content-type"];

      // Validate file extension and MIME type
      if (
        !allowedExtensions.includes(fileExtension) ||
        !allowedMimeTypes.includes(mimeType)
      ) {
        fs.unlinkSync(tempPath); // Delete the temp file if invalid
        throw new Error(`Invalid file type: ${file.originalFilename}`);
      }

      // Generate a unique filename using uuid
      let uniqueFilename: string = `${uuidv4()}${fileExtension}`;
      const targetPath = path.join(uploadDir, uniqueFilename);

      // Copy the file instead of renaming, then delete the original
      fs.copyFileSync(tempPath, targetPath); // Copy file to target directory
      fs.unlinkSync(tempPath); // Remove the temp file
      photos.push(uniqueFilename);
    }

    const galleryData = configGallery(photos, userInfo.userId, cover, horse_id);
    await prisma.gallery.deleteMany({
      where: { horse_id: horse_id }
    });
    const gallery = await prisma.gallery.createMany({
      data: galleryData
    });

    // Return the list of saved file URLs
    return {
      statusMessage: "Photos uploaded and saved successfully!",
      files: gallery,
      statusCode: 200
    };
  } catch (error) {
    console.error("Error processing files:", error);
    return {
      statusCode: 400,
      statusMessage: "Bad Request",
      message: "Error processing files"
    };
  }
});
