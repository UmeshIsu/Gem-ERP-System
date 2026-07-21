import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

export interface StoredFile {
  url: string;
  thumbUrl?: string;
  originalName: string;
  size: number;
  mimeType: string;
}

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const DOC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];
const MAX_SIZE = 50 * 1024 * 1024;

/**
 * Storage abstraction. Driver `disk` writes to UPLOAD_DIR and serves via /uploads.
 * Driver `s3` targets AWS S3 or a Supabase Storage S3-compatible endpoint — the
 * upload path is identical; only `persist()` differs. S3 uses the AWS SDK v3 if
 * configured (left as the integration point for production credentials).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver = process.env.STORAGE_DRIVER ?? "disk";
  private readonly uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

  async store(file: Express.Multer.File, folder: string): Promise<StoredFile> {
    if (!file) throw new BadRequestException("No file provided");
    if (file.size > MAX_SIZE)
      throw new BadRequestException("File exceeds 50 MB limit");

    const isImage = IMAGE_TYPES.includes(file.mimetype);
    const isVideo = VIDEO_TYPES.includes(file.mimetype);
    const isDoc = DOC_TYPES.includes(file.mimetype);
    if (!isImage && !isVideo && !isDoc) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    const id = randomUUID();
    let mainBuffer = file.buffer;
    let thumbBuffer: Buffer | null = null;
    let ext = extname(file.originalname).toLowerCase() || ".bin";

    if (isImage && file.mimetype !== "image/gif") {
      // Compress to WebP (max 2000px) + generate a 400px thumbnail
      mainBuffer = await sharp(file.buffer)
        .rotate()
        .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      thumbBuffer = await sharp(file.buffer)
        .rotate()
        .resize(400, 400, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();
      ext = ".webp";
    }

    const mainKey = `${folder}/${id}${ext}`;
    const thumbKey = thumbBuffer ? `${folder}/${id}_thumb.webp` : undefined;

    const url = await this.persist(
      mainKey,
      mainBuffer,
      isImage ? "image/webp" : file.mimetype,
    );
    const thumbUrl =
      thumbBuffer && thumbKey
        ? await this.persist(thumbKey, thumbBuffer, "image/webp")
        : undefined;

    return {
      url,
      thumbUrl,
      originalName: file.originalname,
      size: mainBuffer.length,
      mimeType:
        isImage && file.mimetype !== "image/gif" ? "image/webp" : file.mimetype,
    };
  }

  private async persist(
    key: string,
    buffer: Buffer,
    _contentType: string,
  ): Promise<string> {
    void _contentType;
    if (this.driver === "s3") {
      // Production: plug AWS SDK v3 / Supabase client here using S3_* env vars.
      this.logger.warn(
        "S3 driver configured but SDK integration not wired — falling back to disk",
      );
    }
    const filePath = join(this.uploadDir, key);
    await mkdir(join(this.uploadDir, key.split("/").slice(0, -1).join("/")), {
      recursive: true,
    });
    await writeFile(filePath, buffer);
    return `/uploads/${key}`;
  }
}
