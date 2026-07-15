import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface StorageClient {
  /** Presigned URL the caller can PUT/upload the raw file bytes to directly. */
  getUploadUrl(key: string, contentType: string): Promise<string>;
  getPublicUrl(key: string): string;
  deleteObject(key: string): Promise<void>;
}

class S3StorageClient implements StorageClient {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({ region: process.env.AWS_REGION });
    this.bucket = process.env.AWS_S3_BUCKET!;
  }

  async getUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, command, { expiresIn: 900 });
  }

  getPublicUrl(key: string) {
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

class SupabaseStorageClient implements StorageClient {
  private client;
  private bucket: string;

  constructor() {
    this.client = createSupabaseClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET!;
  }

  async getUploadUrl(key: string) {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUploadUrl(key);
    if (error) throw error;
    return data.signedUrl;
  }

  getPublicUrl(key: string) {
    return this.client.storage.from(this.bucket).getPublicUrl(key).data.publicUrl;
  }

  async deleteObject(key: string) {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw error;
  }
}

let instance: StorageClient | undefined;

/**
 * Server-side storage for API/admin-originated uploads (presigned direct
 * writes). The browser upload widget on the dashboard goes through
 * UploadThing instead (see src/app/api/uploadthing/core.ts) — this client
 * exists so the platform API (docs: "API" feature) can accept images
 * without round-tripping through the UploadThing widget.
 */
export function getStorageClient(): StorageClient {
  if (instance) return instance;
  instance = process.env.STORAGE_PROVIDER === 'supabase' ? new SupabaseStorageClient() : new S3StorageClient();
  return instance;
}
