'use client'
// Hindi for the daily screens (Today card, plan, setup). Syllabus titles stay as published.
import { useCallback, useEffect, useState } from 'react'

export type Lang = 'en' | 'hi'
const KEY = 'goalyaar-prep-lang'

const HI: Record<string, string> = {
  'Preparation': 'तैयारी',
  "Today's target": 'आज का लक्ष्य',
  'subtopics': 'उप-विषय',
  'Revise today': 'आज दोहराएँ',
  'Revised': 'दोहरा लिया',
  'Due today': 'आज देय',
  'days overdue': 'दिन से बाकी',
  'Suggested next': 'आगे क्या पढ़ें',
  'Quick log': 'जल्दी दर्ज करें',
  'Syllabus': 'पाठ्यक्रम',
  'My plan': 'मेरी योजना',
  'Set your exam date': 'परीक्षा की तारीख चुनें',
  'Get a daily target and a day-by-day plan.': 'रोज़ का लक्ष्य और दिन-ब-दिन योजना पाएँ।',
  'Done for today. Anything extra lowers tomorrow\'s target.': 'आज का काम पूरा। ज़्यादा करेंगे तो कल का लक्ष्य घटेगा।',
  'day study streak': 'दिन की लगातार पढ़ाई',
  'log today to keep it': 'जारी रखने के लिए आज दर्ज करें',
  'Newspaper': 'अख़बार',
  'Daily reading': 'रोज़ का पठन',
  'Answer written': 'उत्तर लिखा',
  'Mistake': 'गलती',
  'to revisit': 'दोबारा देखनी हैं',
  'days to exam': 'दिन परीक्षा में',
  'points lost to overdue revisions': 'अंक बाकी दोहराव से घटे',
  'subtopics a day': 'उप-विषय रोज़',
  'days left': 'दिन बाकी',
  'Today': 'आज',
  'done': 'पूरे',
  'How is this worked out?': 'यह कैसे निकाला गया?',
  'Next few days': 'अगले कुछ दिन',
  'Daily reminder': 'रोज़ का रिमाइंडर',
  'Start fresh from today': 'आज से नई शुरुआत',
  'Fell behind? It happens to everyone. Start fresh and spread what is left evenly over the days remaining.': 'पीछे रह गए? सबके साथ होता है। आज से नई शुरुआत करें, बचा हुआ बाकी दिनों में बराबर बँट जाएगा।',
  'Plan your preparation': 'अपनी तैयारी की योजना बनाएँ',
  'Exam': 'परीक्षा',
  'Preparing for': 'किसकी तैयारी',
  'Finish by (exam date)': 'कब तक (परीक्षा की तारीख)',
  'Study hours a day': 'रोज़ पढ़ाई के घंटे',
  'Daily study reminder': 'रोज़ पढ़ाई का रिमाइंडर',
  'Make my plan': 'मेरी योजना बनाएँ',
  'Language': 'भाषा',
  'On track': 'सही राह पर',
  'Slightly behind': 'थोड़ा पीछे',
  'Behind': 'पीछे',
  'Revision window': 'दोहराव का समय',
  'Syllabus covered': 'पाठ्यक्रम पूरा',
  'behind schedule, so the target is a little higher.': 'योजना से पीछे, इसलिए लक्ष्य थोड़ा बढ़ा है।',
  'Plus': 'साथ में',
  'revisions due': 'दोहराव बाकी',
}

/** Translate a fixed English string; falls back to English. */
export const tr = (lang: Lang, s: string) => (lang === 'hi' ? HI[s] ?? s : s)

export function usePrepLang(): [Lang, (l: Lang) => void, (s: string) => string] {
  const [lang, setLangState] = useState<Lang>('en')
  useEffect(() => {
    const read = () => { try { setLangState(window.localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en') } catch { /* default English */ } }
    const t = window.setTimeout(read, 0)
    window.addEventListener('goalyaar-prep-lang', read)
    return () => { window.clearTimeout(t); window.removeEventListener('goalyaar-prep-lang', read) }
  }, [])
  const setLang = useCallback((l: Lang) => {
    try { window.localStorage.setItem(KEY, l) } catch { /* not remembered */ }
    setLangState(l)
    window.dispatchEvent(new Event('goalyaar-prep-lang'))
  }, [])
  const t = useCallback((s: string) => tr(lang, s), [lang])
  return [lang, setLang, t]
}
