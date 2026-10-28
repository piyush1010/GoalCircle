'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

/** Batch check-in photos and videos live in a private bucket; check-ins store "batch-proof:<path>". */
export const PROOF_PREFIX = 'batch-proof:'
const BUCKET = 'batch-proof'

/** Upload a batch check-in file privately. Falls back to the old public bucket only if the private one doesn't exist yet. */
export async function uploadBatchProof(userId: string, circleId: string, file: File): Promise<{ ref: string } | { error: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (file.type.startsWith('video/') ? 'mp4' : 'jpg')
  const path = `${userId}/circle-${circleId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '3600' })
  if (!error) return { ref: `${PROOF_PREFIX}${path}` }
  if (/bucket not found/i.test(error.message)) {
    const { error: fallbackError } = await supabase.storage.from('goal-media').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
    if (!fallbackError) return { ref: supabase.storage.from('goal-media').getPublicUrl(path).data.publicUrl }
  }
  return { error: 'Your photo or video could not be uploaded.' }
}

const cache = new Map<string, { url: string; expires: number }>()

/** A viewable link for a proof reference: a 1-hour signed link for private files, the URL itself for old public ones. */
export async function proofUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null
  if (!ref.startsWith(PROOF_PREFIX)) return ref
  const hit = cache.get(ref)
  if (hit && hit.expires > Date.now()) return hit.url
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ref.slice(PROOF_PREFIX.length), 60 * 60)
  if (!data?.signedUrl) return null
  cache.set(ref, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 })
  return data.signedUrl
}

export function useProofUrl(ref: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(ref && !ref.startsWith(PROOF_PREFIX) ? ref : null)
  useEffect(() => {
    let active = true
    void proofUrl(ref).then((next) => { if (active) setUrl(next) })
    return () => { active = false }
  }, [ref])
  return url
}
