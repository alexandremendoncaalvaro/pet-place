import imageCompression from 'browser-image-compression';

export async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    });
  } catch (error) {
    console.error('Compression error', error);
    return file;
  }
}
