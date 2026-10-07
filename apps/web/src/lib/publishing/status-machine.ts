export type PostStatus =
  'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';

const VALID_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['PUBLISHING', 'CANCELLED', 'DRAFT'],
  PUBLISHING: ['PUBLISHED', 'FAILED'],
  FAILED: ['PUBLISHING', 'SCHEDULED', 'CANCELLED'],
  PUBLISHED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Enforces valid SRDS 5.5 status transitions in a single authoritative function.
 * Rejects any illegal state change with an informative error.
 */
export function transitionPostStatus(current: PostStatus, next: PostStatus): PostStatus {
  if (current === next) {
    return next;
  }

  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new Error(`Illegal post status transition: cannot transition from ${current} to ${next}`);
  }

  return next;
}

/**
 * Validates media uploads per Decision D9:
 * Validates magic bytes, size limits, and ensures safe file formats.
 */
export interface MediaValidationResult {
  valid: boolean;
  mimeType: string;
  sizeBytes: number;
  error?: string;
}

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function validateMediaUpload(buffer: Buffer, filename: string): MediaValidationResult {
  const size = buffer.length;

  if (size === 0) {
    return { valid: false, mimeType: 'unknown', sizeBytes: 0, error: 'File is empty' };
  }

  // Check magic bytes
  let mimeType = 'unknown';
  let isImage = false;
  let isVideo = false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    mimeType = 'image/jpeg';
    isImage = true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    mimeType = 'image/png';
    isImage = true;
  }
  // MP4: ... ftyp
  else if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    mimeType = 'video/mp4';
    isVideo = true;
  }
  // WebP: RIFF ... WEBP
  else if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    mimeType = 'image/webp';
    isImage = true;
  }

  if (mimeType === 'unknown') {
    return {
      valid: false,
      mimeType,
      sizeBytes: size,
      error: `Unsupported file header / magic bytes for ${filename}`,
    };
  }

  if (isImage && size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      mimeType,
      sizeBytes: size,
      error: `Image exceeds maximum allowed size of 8MB (${Math.round(size / 1024 / 1024)}MB)`,
    };
  }

  if (isVideo && size > MAX_VIDEO_SIZE) {
    return {
      valid: false,
      mimeType,
      sizeBytes: size,
      error: `Video exceeds maximum allowed size of 50MB (${Math.round(size / 1024 / 1024)}MB)`,
    };
  }

  return {
    valid: true,
    mimeType,
    sizeBytes: size,
  };
}
