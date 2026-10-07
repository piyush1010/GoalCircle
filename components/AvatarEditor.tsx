'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCw, Upload } from 'lucide-react'
import { AVATAR_PRESETS, default as ProfileAvatar } from '@/components/ProfileAvatar'
import { supabase } from '@/utils/supabase'

export default function AvatarEditor({ userId, value, name, onSaved }: { userId: string; value?: string | null; name: string; onSaved: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [source, setSource] = useState<HTMLImageElement | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl) }, [sourceUrl])
  useEffect(() => {
    if (!source || !canvasRef.current) return
    const canvas = canvasRef.current, ctx = canvas.getContext('2d'); if (!ctx) return
    const size = 512; canvas.width = size; canvas.height = size; ctx.clearRect(0, 0, size, size)
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(rotation * Math.PI / 180)
    const rotated = rotation % 180 !== 0
    const base = Math.max(size / (rotated ? source.height : source.width), size / (rotated ? source.width : source.height))
    const width = source.width * base * zoom, height = source.height * base * zoom
    ctx.drawImage(source, -width / 2, -height / 2, width, height); ctx.restore()
  }, [rotation, source, zoom])

  const chooseFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP image smaller than 10 MB.'); return }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const url = URL.createObjectURL(file), image = new Image()
    image.onload = () => { setSource(image); setSourceUrl(url); setZoom(1); setRotation(0); setError(null) }
    image.onerror = () => { URL.revokeObjectURL(url); setError('This image could not be opened.') }
    image.src = url
  }

  const saveUpload = async () => {
    const canvas = canvasRef.current; if (!canvas) return
    setSaving(true); setError(null)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88))
    if (!blob) { setError('The adjusted image could not be prepared.'); setSaving(false); return }
    const path = `${userId}/avatar-${Date.now()}.webp`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
    if (uploadError) setError('Photo upload is not available yet. Please try a preset avatar.')
    else { const { data } = supabase.storage.from('avatars').getPublicUrl(path); onSaved(data.publicUrl); setSource(null) }
    setSaving(false)
  }

  return <div className="space-y-4">
    <div className="flex items-center gap-3"><ProfileAvatar value={value} name={name} size={64} className="rounded-2xl" /><div><p className="text-sm font-black">Profile picture</p><p className="text-[10px] text-slate-500">Choose an abstract avatar or upload your own photo.</p></div></div>
    <div><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Inclusive avatar presets</p><div className="grid grid-cols-4 gap-2">{AVATAR_PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => { setSource(null); onSaved(`preset:${preset.id}`) }} aria-label={`Use ${preset.label} avatar`} aria-pressed={value === `preset:${preset.id}`} className={`rounded-2xl p-1.5 ${value === `preset:${preset.id}` ? 'ring-2 ring-amber-500' : 'ring-1 ring-slate-200 dark:ring-slate-700'}`}><ProfileAvatar value={`preset:${preset.id}`} size={48} className="mx-auto rounded-xl" /><span className="mt-1 block text-[9px] font-bold text-slate-500">{preset.label}</span></button>)}</div></div>
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs font-bold hover:border-amber-500 dark:border-slate-700"><Upload className="h-4 w-4" />Upload and adjust photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
    {source && <div className="space-y-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-950"><canvas ref={canvasRef} className="mx-auto h-48 w-48 rounded-full bg-slate-200 object-cover shadow-inner dark:bg-slate-800" /><label className="block text-[10px] font-bold text-slate-500">Zoom<input aria-label="Photo zoom" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-1 w-full accent-amber-500" /></label><div className="flex gap-2"><button type="button" onClick={() => setRotation((rotation + 90) % 360)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white py-2 text-xs font-bold dark:bg-slate-800"><RotateCw className="h-4 w-4" />Rotate</button><button type="button" onClick={() => void saveUpload()} disabled={saving} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-500 py-2 text-xs font-black text-slate-950 disabled:opacity-60"><Camera className="h-4 w-4" />{saving ? 'Uploading…' : 'Use photo'}</button></div></div>}
    {error && <p role="alert" className="text-xs font-semibold text-rose-500">{error}</p>}
  </div>
}
