/**
 * Media limits and photo shrinking. Photos are resized and re-encoded on the
 * phone before upload, so they take about a tenth of the space and data.
 */

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024
export const MAX_VIDEO_SECONDS = 30
export const MAX_PDF_BYTES = 10 * 1024 * 1024
/** Photos are shrunk, so the original may be large. */
export const MAX_PHOTO_INPUT_BYTES = 30 * 1024 * 1024

const MAX_SIDE = 1440
const QUALITY = 0.8
const SKIP_BELOW_BYTES = 250 * 1024

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo could not be read.')) }
  image.src = url
})

const toBlob = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

/**
 * Resize a photo so its longest side is at most 1440 px and re-encode it as
 * WebP (or JPEG where WebP isn't supported). Returns the original file when it
 * is already small, isn't a photo, or shrinking would not make it smaller.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const image = await loadImage(file)
    const longest = Math.max(image.naturalWidth, image.naturalHeight)
    if (file.size <= SKIP_BELOW_BYTES && longest <= MAX_SIDE) return file
    const scale = Math.min(1, MAX_SIDE / longest)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    let blob = await toBlob(canvas, 'image/webp')
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg')
    if (!blob || blob.size >= file.size) return file
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.${extension}`
    return new File([blob], name, { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  }
}

/** Check a picked file against the limits; returns an error message or null. */
export function mediaLimitError(file: File): string | null {
  if (file.type.startsWith('video/') && file.size > MAX_VIDEO_BYTES) return `Videos can be up to ${MAX_VIDEO_BYTES / 1024 / 1024} MB. Try a shorter clip.`
  if (file.type === 'application/pdf' && file.size > MAX_PDF_BYTES) return `PDFs can be up to ${MAX_PDF_BYTES / 1024 / 1024} MB.`
  if (file.type.startsWith('image/') && file.size > MAX_PHOTO_INPUT_BYTES) return 'This photo is too large.'
  return null
}

/**
 * Copy a picked file into memory right away. On Android, files picked from WhatsApp, Drive or
 * Downloads are often read lazily and the phone can withdraw access before the upload starts,
 * which shows up as a network error. Reading them now makes the upload reliable.
 */
export async function toLocalFile(file: File): Promise<File> {
  const data = await file.arrayBuffer()
  return new File([data], file.name, { type: file.type, lastModified: file.lastModified })
}


export const UNREADABLE_FILE = 'This file couldn’t be read. If it’s in WhatsApp or Google Drive, download it to your phone first, then choose it again.'
