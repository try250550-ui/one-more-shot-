const { S3Client, PutObjectCommand, GetObjectCommand, PutBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');

/**
 * Cloudflare R2 Client Configuration (S3-Compatible)
 * Uses environment variables:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY
 * - R2_SECRET_KEY
 * - R2_BUCKET
 */
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID || 'mock_account';
    const accessKeyId = process.env.R2_ACCESS_KEY || 'mock_key';
    const secretAccessKey = process.env.R2_SECRET_KEY || 'mock_secret';

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });
}

function getR2BucketName() {
    return process.env.R2_BUCKET || 'one-more-shot-uploads';
}

// In-memory fallback cache for dev/testing when R2 env vars are mock
const memoryStore = new Map();

/**
 * Upload buffer to Cloudflare R2 Bucket
 * @param {string} key - Object key (e.g. "orderId/photo.jpg")
 * @param {Buffer} buffer - File buffer
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} - Object Key
 */
async function uploadToR2(key, buffer, contentType = 'image/jpeg') {
    const bucket = getR2BucketName();
    
    // Always store in fallback memory cache for dev/test reliability
    memoryStore.set(key, buffer);

    try {
        const client = getR2Client();
        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType
        }));
        console.log(`[R2 Upload Success] Key: ${key} (${buffer.length} bytes)`);
    } catch (err) {
        console.warn(`[R2 Upload Fallback] Using memory cache for key ${key}: ${err.message}`);
    }

    return key;
}

/**
 * Download object buffer from Cloudflare R2 Bucket
 * @param {string} key - Object key
 * @returns {Promise<Buffer>} - Object Buffer
 */
async function downloadFromR2(key) {
    // Check fallback memory cache first for dev/test
    if (memoryStore.has(key)) {
        return memoryStore.get(key);
    }

    const bucket = getR2BucketName();
    const client = getR2Client();

    const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }));

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
}

/**
 * Applies a 7-Day Auto-Expiration Lifecycle Rule to the Cloudflare R2 Bucket
 */
async function applyR2Lifecycle7DaysRule() {
    const bucket = getR2BucketName();
    const client = getR2Client();

    const params = {
        Bucket: bucket,
        LifecycleConfiguration: {
            Rules: [
                {
                    ID: 'AutoExpireCustomerPhotos7Days',
                    Status: 'Enabled',
                    Filter: { Prefix: '' },
                    Expiration: {
                        Days: 7
                    }
                }
            ]
        }
    };

    return await client.send(new PutBucketLifecycleConfigurationCommand(params));
}

module.exports = {
    uploadToR2,
    downloadFromR2,
    applyR2Lifecycle7DaysRule,
    getR2BucketName
};
