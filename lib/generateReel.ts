import { toPng } from 'html-to-image'

export async function exportElementAsImage(elementId: string, filename: string = 'goalcircle-reel.png') {
  const node = document.getElementById(elementId)
  if (!node) return

  try {
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Error generating memory reel image:', error)
  }
}