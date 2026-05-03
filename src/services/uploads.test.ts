import { describe, expect, it } from 'vitest';
import { classifyUploadMedia, normalizeUploadFile, validateVideoForUpload } from './uploads';

describe('upload media classification', () => {
  it('treats mp4 files as videos even when the browser leaves the MIME type empty', () => {
    const file = new File(['sample'], 'iphone-clip.mp4', { type: '' });

    expect(classifyUploadMedia(file)).toBe('video');
    expect(normalizeUploadFile(file, 'video').type).toBe('video/mp4');
  });

  it('does not rely only on MIME type to classify images', () => {
    const file = new File(['sample'], 'pet-place.webp', { type: '' });

    expect(classifyUploadMedia(file)).toBe('image');
  });

  it('rejects non-MP4 video containers before trying browser metadata parsing', async () => {
    const file = new File(['sample'], 'iphone-clip.mov', { type: 'video/quicktime' });

    await expect(validateVideoForUpload(file)).resolves.toContain('MP4');
  });
});
