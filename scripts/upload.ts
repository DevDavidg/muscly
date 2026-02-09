import { put } from "@vercel/blob";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });
config();

async function uploadFile() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const fileName = "VLVЯ.wav";
  const filePath = join(process.cwd(), fileName);

  console.log(`Reading file: ${filePath}`);
  const fileBuffer = readFileSync(filePath);

  console.log(`Uploading ${fileName} to Vercel Blob...`);
  const blob = await put(fileName, fileBuffer, {
    token,
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log(`Upload successful!`);
  console.log(`URL: ${blob.url}`);
}

uploadFile().catch((error) => {
  console.error("Upload failed:", error);
  process.exit(1);
});
