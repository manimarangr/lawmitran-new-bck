import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private bucketReady = false;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'lawmitran-documents';
    // Browser-facing base for public objects. In dev this is the MinIO endpoint
    // itself; in deployed envs set S3_PUBLIC_URL to an HTTPS route that proxies
    // the bucket (e.g. https://dev.lawmitran.com/storage) so images aren't
    // served from an internal/loopback host over plain HTTP.
    const publicUrl = this.config.get<string>('S3_PUBLIC_URL');
    this.publicBaseUrl = publicUrl
      ? publicUrl.replace(/\/+$/, '')
      : `${endpoint}/${this.bucket}`;
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      endpoint,
      forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY') ?? '',
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY') ?? '',
      },
    });
  }

  /** Apply bucket + public-image policy at startup so images work before the
   *  first upload. Non-fatal — storage may come up after the API in docker. */
  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
    } catch {
      this.logger.warn(
        'Storage not reachable at startup — will retry on first upload',
      );
    }
  }

  /** MinIO starts empty — create the bucket on first use so dev "just works". */
  private async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );
        this.logger.log(`Created storage bucket "${this.bucket}"`);
        this.bucketReady = true;
      } catch (err) {
        this.logger.error(`Storage unavailable: ${(err as Error).message}`);
        throw new ServiceUnavailableException(
          'Document storage is unavailable — check that MinIO is running and S3_* env vars are correct',
        );
      }
    }
    await this.ensurePublicImagePolicy();
  }

  /**
   * Browsers load profile/office/avatar images directly from the bucket URL,
   * so those prefixes need anonymous read. Sensitive prefixes (certificates,
   * ID cards, property docs, generated documents) stay private — they are
   * served only through authenticated backend proxies. Idempotent; failure is
   * non-fatal (images just won't render until the policy is applied).
   */
  private policyApplied = false;
  private async ensurePublicImagePolicy(): Promise<void> {
    if (this.policyApplied) return;
    const publicPrefixes = ['profiles/*', 'offices/*', 'avatars/*'];
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: publicPrefixes.map(
            (p) => `arn:aws:s3:::${this.bucket}/${p}`,
          ),
        },
      ],
    };
    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
      this.policyApplied = true;
      this.logger.log(
        'Public-read policy applied for image prefixes (profiles/, offices/, avatars/)',
      );
    } catch (err) {
      this.logger.warn(
        `Could not set public-read policy for image prefixes: ${(err as Error).message}`,
      );
    }
  }

  async upload(file: Express.Multer.File, keyPrefix: string): Promise<string> {
    await this.ensureBucket();
    const key = `${keyPrefix}/${randomUUID()}-${file.originalname}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      this.logger.error(`Upload failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not store the uploaded document — please try again',
      );
    }
    return `${this.publicBaseUrl}/${key}`;
  }
  /** Store raw bytes at an explicit key (used for generated PDFs). Returns the key. */
  async putBytes(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.ensureBucket();
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      this.logger.error(`putBytes failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Could not store the generated document',
      );
    }
    return key;
  }

  /** Fetch an object's bytes by key (backend-proxied private download). */
  async getBytes(key: string): Promise<Buffer> {
    await this.ensureBucket();
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const chunks: Buffer[] = [];
    const stream = res.Body as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  /**
   * Object key from a stored URL (or pass through if already a key). Handles
   * every form we may have persisted: the configured public base, a legacy
   * direct bucket URL (…/lawmitran-documents/<key>), a relative /storage/<key>,
   * or a bare key.
   */
  keyFromUrl(urlOrKey: string): string {
    if (this.publicBaseUrl && urlOrKey.startsWith(`${this.publicBaseUrl}/`)) {
      return urlOrKey.slice(this.publicBaseUrl.length + 1);
    }
    for (const marker of [`/${this.bucket}/`, '/storage/']) {
      const i = urlOrKey.indexOf(marker);
      if (i !== -1) return urlOrKey.slice(i + marker.length);
    }
    return urlOrKey.replace(/^\/+/, '');
  }

  /** Fetch an object's bytes + content type by key (backend-proxied download). */
  async getObject(key: string): Promise<{ body: Buffer; contentType: string }> {
    await this.ensureBucket();
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const chunks: Buffer[] = [];
    const stream = res.Body as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return {
      body: Buffer.concat(chunks),
      contentType: res.ContentType ?? 'application/octet-stream',
    };
  }
}
