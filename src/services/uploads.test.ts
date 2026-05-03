import { describe, expect, it } from 'vitest';
import { classifyUploadMedia, getUploadMimeType, normalizeUploadFile, validateVideoForUpload } from './uploads';

describe('upload media classification', () => {
  it('treats mp4 files as videos even when the browser leaves the MIME type empty', () => {
    const file = new File(['sample'], 'iphone-clip.mp4', { type: '' });

    expect(classifyUploadMedia(file)).toBe('video');
    expect(getUploadMimeType(file)).toBe('video/mp4');
    expect(normalizeUploadFile(file, 'video').type).toBe('video/mp4');
  });

  it('does not rely only on MIME type to classify images', () => {
    const file = new File(['sample'], 'pet-place.webp', { type: '' });

    expect(classifyUploadMedia(file)).toBe('image');
  });

  it('rejects unsupported video containers before trying browser metadata parsing', async () => {
    const file = new File(['sample'], 'desktop-clip.avi', { type: 'video/x-msvideo' });

    await expect(validateVideoForUpload(file)).resolves.toContain('MP4 ou MOV');
  });

  it('accepts native iPhone QuickTime video files for mobile uploads', async () => {
    const file = new File(['sample'], 'video-2294_singular_display.mov', { type: 'video/quicktime' });

    expect(classifyUploadMedia(file)).toBe('video');
    expect(getUploadMimeType(file)).toBe('video/quicktime');
    await expect(validateVideoForUpload(file)).resolves.toBeNull();
  });

  it('infers QuickTime MIME type when iOS leaves the selected MOV type empty', () => {
    const file = new File(['sample'], 'video-2294_singular_display.mov', { type: '' });

    expect(classifyUploadMedia(file)).toBe('video');
    expect(getUploadMimeType(file)).toBe('video/quicktime');
    expect(normalizeUploadFile(file, 'video').type).toBe('video/quicktime');
  });
});
