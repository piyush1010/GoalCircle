import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,           // Compress down to ~500KB max
    maxWidthOrHeight: 1200,   // Mobile feed optimal dimensions
    useWebWorker: true,
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Image compression failed, using original file:', error);
    return file;
  }
}