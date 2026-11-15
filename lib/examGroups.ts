/** Exams, grouped the way students and teachers think of them. State services ask for the state first. */
export const GROUPS: { name: string; line: string; ask?: string; exams: { code: string; name: string; line: string }[] }[] = [
  { name: 'Civil services', line: 'UPSC Civil Services Examination', exams: [{ code: 'upsc_cse_v1', name: 'UPSC CSE', line: 'Prelims, Mains and interview' }] },
  { name: 'State services', line: 'UPPCS, BPSC, MPSC and more', ask: 'Which state?', exams: [
    { code: 'uppcs_v1', name: 'Uttar Pradesh', line: 'UPPCS' }, { code: 'bpsc_v1', name: 'Bihar', line: 'BPSC' }, { code: 'mpsc_rajyaseva_v1', name: 'Maharashtra', line: 'MPSC Rajyaseva' },
    { code: 'hpsc_hcs_v1', name: 'Haryana', line: 'HCS' }, { code: 'jkpsc_cce_v1', name: 'Jammu and Kashmir', line: 'JKPSC CCE' },
  ] },
  { name: 'Staff Selection Commission', line: 'SSC CGL', exams: [{ code: 'ssc_cgl_v1', name: 'SSC CGL', line: 'Tier 1 and Tier 2' }] },
  { name: 'Banking', line: 'IBPS PO and SBI PO', exams: [{ code: 'bank_po_v1', name: 'Bank PO', line: 'Prelims and Mains' }] },
  { name: 'Teaching', line: 'CTET and UPTET', exams: [{ code: 'ctet_v1', name: 'CTET', line: 'Central teacher eligibility' }, { code: 'uptet_v1', name: 'UPTET', line: 'Uttar Pradesh teacher eligibility' }] },
  { name: 'Judiciary', line: 'Civil judge examinations', exams: [{ code: 'up_pcsj_v1', name: 'UP PCS-J', line: 'Uttar Pradesh' }, { code: 'mp_civil_judge_v1', name: 'MP Civil Judge', line: 'Madhya Pradesh' }] },
  { name: 'Defence', line: 'UPSC CDS', exams: [{ code: 'cds_v1', name: 'UPSC CDS', line: 'IMA, INA, AFA and OTA' }] },
  { name: 'MBA entrance', line: 'CAT', exams: [{ code: 'cat_v1', name: 'CAT', line: 'For the IIMs and other business schools' }] },
]
export const ALL_EXAMS = GROUPS.flatMap((g) => g.exams.map((e) => ({ ...e, group: g.name, label: g.ask ? e.line : e.name })))
export const SEARCH_WORDS: Record<string, string> = {
  upsc_cse_v1: 'upsc cse ias ips civil services', uppcs_v1: 'uppcs uppsc ro aro uttar pradesh up', bpsc_v1: 'bpsc bihar', mpsc_rajyaseva_v1: 'mpsc maharashtra rajyaseva',
  hpsc_hcs_v1: 'hcs hpsc haryana', jkpsc_cce_v1: 'jkpsc jammu kashmir kas', ssc_cgl_v1: 'ssc cgl staff selection', bank_po_v1: 'bank po ibps sbi banking',
  ctet_v1: 'ctet teacher tet', uptet_v1: 'uptet teacher tet uttar pradesh', up_pcsj_v1: 'up pcs-j pcsj judiciary judge law', mp_civil_judge_v1: 'mp civil judge judiciary madhya pradesh',
  cds_v1: 'cds defence army navy air force ssb', cat_v1: 'cat mba iim',
}

/** The broad exam tag batches have always used (circles.exam), from an exact exam. */
export function batchExamTag(code: string): string {
  if (code === 'upsc_cse_v1' || code === 'cds_v1') return 'upsc'
  if (['uppcs_v1', 'bpsc_v1', 'mpsc_rajyaseva_v1', 'hpsc_hcs_v1', 'jkpsc_cce_v1'].includes(code)) return 'state_psc'
  if (code === 'ssc_cgl_v1') return 'ssc'
  if (code === 'bank_po_v1') return 'banking'
  if (code === 'cat_v1') return 'cat'
  return 'other'
}
