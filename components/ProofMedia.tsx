'use client'

import Image from 'next/image'
import { useProofUrl } from '@/lib/proof'

/** Shows a batch check-in photo or video, opening private files through a short-lived link. */
export default function ProofMedia({ src, type, alt, className = '', fill = false }: { src: string; type: 'image' | 'video' | null; alt: string; className?: string; fill?: boolean }) {
  const url = useProofUrl(src)
  if (!url) return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${fill ? 'absolute inset-0' : ''} ${className}`} />
  if (type === 'video') return <video src={url} controls playsInline className={className} />
  return <Image src={url} alt={alt} fill unoptimized className={className} />
}
