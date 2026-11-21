/** Presigned uploads to Cloudflare R2 (S3-compatible). The browser PUTs straight to R2; no file passes through Vercel. */
import { AwsClient } from 'aws4fetch';
import { env } from './env';

export interface R2 { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }

export function r2Config(): R2 | null {
  const accountId = env('R2_ACCOUNT_ID'), accessKeyId = env('R2_ACCESS_KEY_ID'), secretAccessKey = env('R2_SECRET_ACCESS_KEY');
  const bucket = env('R2_BUCKET') ?? 'essentis-media';
  return accountId && accessKeyId && secretAccessKey ? { accountId, accessKeyId, secretAccessKey, bucket } : null;
}

/** A URL that allows one PUT of `key` with exactly this Content-Type, valid for ten minutes. */
export async function presignPut(cfg: R2, key: string, contentType: string, expires = 600): Promise<string> {
  const client = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: 's3', region: 'auto' });
  const url = new URL(`https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`);
  url.searchParams.set('X-Amz-Expires', String(expires));
  const signed = await client.sign(new Request(url, { method: 'PUT', headers: { 'content-type': contentType } }), { aws: { signQuery: true, allHeaders: true } });
  return signed.url;
}
