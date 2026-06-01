interface CaptureOptions {
  width: number;
  height: number;
  quality: number;
}

export function captureVideoFrameBase64(video: HTMLVideoElement, options: CaptureOptions) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  canvas.getContext('2d')?.drawImage(video, 0, 0, options.width, options.height);

  return canvas.toDataURL('image/jpeg', options.quality).split(',')[1] ?? '';
}
