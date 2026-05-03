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
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-poster.jpg`, { type: 'image/jpeg' }) : null;
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
