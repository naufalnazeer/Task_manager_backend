const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const s3Client = new S3Client({
  endpoint: process.env.SUPABASE_S3_ENDPOINT,
  region: process.env.SUPABASE_S3_REGION,
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.SUPABASE_S3_BUCKET;

/**
 * Upload a file to Supabase S3
 * @param {Buffer} fileBuffer - The file content
 * @param {string} originalName - Original file name
 * @param {string} mimeType - MIME type of the file
 * @param {string} folder - Folder path in the bucket (e.g., 'attachments' or 'voice-notes')
 * @returns {object} - { key, url }
 */
const uploadFile = async (fileBuffer, originalName, mimeType, folder) => {
  const uniqueId = crypto.randomUUID();
  const ext = path.extname(originalName);
  const key = `${folder}/${uniqueId}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Construct the public URL
  const url = `${process.env.SUPABASE_S3_ENDPOINT.replace('/s3', '')}/${BUCKET}/${key}`;

  return { key, url };
};

/**
 * Delete a file from Supabase S3
 * @param {string} key - The S3 object key
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
};

module.exports = { uploadFile, deleteFile, s3Client };
