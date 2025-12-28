/**
 * Image Optimizer Utility
 * Standardizes profile photos to a consistent size and converts them to WebP format
 * for optimal performance and file size reduction.
 */

export interface ImageOptimizationOptions {
  /**
   * Target width and height for the output image (square)
   * @default 512
   */
  targetSize?: number;

  /**
   * Quality for WebP conversion (0-1)
   * @default 0.85
   */
  quality?: number;

  /**
   * Maximum file size in bytes before optimization
   * @default 10MB
   */
  maxInputSize?: number;

  /**
   * Output format
   * @default 'webp'
   */
  format?: 'webp' | 'jpeg';
}

export interface OptimizedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  targetSize: 512,
  quality: 0.85,
  maxInputSize: 10 * 1024 * 1024, // 10MB
  format: 'webp',
};

/**
 * Optimizes an image by resizing and converting to WebP format
 * @param input - File, Blob, or base64 data URL
 * @param options - Optimization options
 * @returns Promise with optimized image result
 */
export async function optimizeProfileImage(
  input: File | Blob | string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Convert input to blob if needed
  let sourceBlob: Blob;
  let originalSize: number;

  if (typeof input === 'string') {
    // Handle base64 data URL
    if (!input.startsWith('data:image')) {
      throw new Error('Invalid data URL. Must start with "data:image"');
    }
    const response = await fetch(input);
    sourceBlob = await response.blob();
    originalSize = sourceBlob.size;
  } else {
    sourceBlob = input;
    originalSize = input.size;
  }

  // Check file size
  if (originalSize > opts.maxInputSize) {
    throw new Error(
      `Image size (${(originalSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${(opts.maxInputSize / 1024 / 1024).toFixed(1)}MB)`
    );
  }

  // Create image element
  const imageUrl = URL.createObjectURL(sourceBlob);
  
  try {
    const img = await loadImage(imageUrl);
    
    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Calculate dimensions (maintain aspect ratio, then crop to square)
    const size = Math.min(img.width, img.height);
    const sx = (img.width - size) / 2;
    const sy = (img.height - size) / 2;

    // Set canvas to target size
    canvas.width = opts.targetSize;
    canvas.height = opts.targetSize;

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw and resize image
    ctx.drawImage(
      img,
      sx, sy, size, size,  // Source rectangle (crop to square)
      0, 0, opts.targetSize, opts.targetSize  // Destination rectangle
    );

    // Convert to blob
    const mimeType = opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        mimeType,
        opts.quality
      );
    });

    // Convert to data URL for preview
    const dataUrl = await blobToDataUrl(optimizedBlob);

    // Calculate compression ratio
    const optimizedSize = optimizedBlob.size;
    const compressionRatio = originalSize / optimizedSize;

    return {
      blob: optimizedBlob,
      dataUrl,
      width: opts.targetSize,
      height: opts.targetSize,
      originalSize,
      optimizedSize,
      compressionRatio,
    };
  } finally {
    // Cleanup
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Load an image from a URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Convert a Blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read blob as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const img = new Image();
    img.onload = () => resolve(img.width === 1);
    img.onerror = () => resolve(false);
    img.src = webpData;
  });
}

/**
 * Get optimal format - always returns WebP for consistency
 * All profile pictures are saved as WebP format in Firebase Storage
 */
export async function getOptimalFormat(): Promise<'webp' | 'jpeg'> {
  // Force WebP format for all profile uploads
  // Modern browsers can encode WebP even if they can't display it natively
  const format = 'webp';
  console.log(`🖼️ [ImageOptimizer] Format: WEBP (forced - always WebP)`);
  return format;
}

/**
 * Get file extension for the format
 */
export function getFileExtension(format: 'webp' | 'jpeg'): string {
  return format === 'webp' ? '.webp' : '.jpg';
}

