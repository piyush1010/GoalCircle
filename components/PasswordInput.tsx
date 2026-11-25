'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** A password field with a Show / Hide button, so people can check what they typed. */
export default function PasswordInput({ className = '', wrapperClassName = '', ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { wrapperClassName?: string }) {
  const [shown, setShown] = useState(false)
  return <span className={`relative block ${wrapperClassName}`}>
    <input {...props} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${className} pr-11`} />
    <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-slate-900 dark:hover:text-white">
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </span>
}
