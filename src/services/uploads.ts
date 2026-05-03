import imageCompression from 'browser-image-compression';

export const VIDEO_UPLOAD_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
  maxDurationSeconds: 60,
  supportedTypes: ['video/mp4', 'video/webm'],
};

export async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1600,
      initialQuality: 0.82,
      fileType: 'image/webp',
      useWebWorker: false,
    });
    return withExtension(compressed, file.name, 'webp', 'image/webp');
  } catch (error) {
    console.error('Compression error', error);
    return file;
  }
}

export async function validateVideoForUpload(file: File): Promise<string | null> {
  if (!file.type.startsWith('video/')) return null;
  if (!VIDEO_UPLOAD_LIMITS.supportedTypes.includes(file.type)) {
    return 'Use vídeo MP4 ou WebM. Arquivos MOV/QuickTime precisam ser convertidos antes do envio.';
  }
  if (file.size > VIDEO_UPLOAD_LIMITS.maxBytes) {
    return 'O vídeo não pode passar de 50MB.';
  }

  try {
    const { duration } = await readVideoMetadata(file);
    if (Number.isFinite(duration) && duration > VIDEO_UPLOAD_LIMITS.maxDurationSeconds) {
      return 'O vídeo não pode passar de 60 segundos.';
    }
  } catch {
    return 'Não consegui ler este vídeo. Tente exportar como MP4 e enviar novamente.';
  }

  return null;
}

export async function createVideoPoster(file: File): Promise<File | null> {
  if (!file.type.startsWith('video/')) return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    await waitForVideoEvent(video, 'loadedmetadata');
    const targetTime = Number.isFinite(video.duration) && video.duration > 1 ? Math.min(1, video.duration / 3) : 0;
    if (targetTime > 0) {
      video.currentTime = targetTime;
      await waitForVideoEvent(video, 'seeked');
    } else {
      await waitForVideoEvent(video, 'loadeddata');
    }

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    return blob ? new File([blob], `${stripExtension(file.name)}-poster.webp`, { type: 'image/webp' }) : null;
  } catch (error) {
    console.warn('Video poster generation failed:', error);
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: keyof HTMLMediaElementEventMap) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video metadata unavailable.'));
    };
    video.addEventListener(eventName, onReady, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function readVideoMetadata(file: File) {
  const objectUrl = URL.createObjectURL(file);
  return new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
    const video = document.createElement('video');
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    const onLoaded = () => {
      const result = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      cleanup();
      resolve(result);
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video metadata unavailable.'));
    };
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.src = objectUrl;
  });
}

function withExtension(file: File, originalName: string, extension: string, type: string) {
  const targetName = `${stripExtension(originalName)}.${extension}`;
  if (file.name === targetName && file.type === type) return file;
  return new File([file], targetName, { type, lastModified: file.lastModified });
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '') || 'media';
}
