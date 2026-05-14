const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

// Lazy-init the S3 client so env vars are available after dotenv.config()
let s3Client;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.SUPABASE_S3_ENDPOINT,
      region: process.env.SUPABASE_S3_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY,
        secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
};

/**
 * Upload a file to Supabase S3
 * @param {Buffer} fileBuffer - The file content
 * @param {string} originalName - Original file name
 * @param {string} mimeType - MIME type of the file
 * @param {string} folder - Folder path in the bucket (e.g., 'attachments' or 'voice-notes')
 * @returns {object} - { key, url }
 */
const uploadFile = async (fileBuffer, originalName, mimeType, folder) => {
  const bucket = process.env.SUPABASE_S3_BUCKET;
  const uniqueId = crypto.randomUUID();
  const ext = path.extname(originalName);
  const key = `${folder}/${uniqueId}${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });
try {
  await getS3Client().send(command);
    
} catch (error) {
    console.log(error)
}

  // Construct the public URL
  const url = `${process.env.SUPABASE_S3_ENDPOINT.replace('/s3', '')}/${bucket}/${key}`;

  return { key, url };
};

/**
 * Delete a file from Supabase S3
 * @param {string} key - The S3 object key
 */
const deleteFile = async (key) => {
  const bucket = process.env.SUPABASE_S3_BUCKET;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await getS3Client().send(command);
};

module.exports = { uploadFile, deleteFile };
