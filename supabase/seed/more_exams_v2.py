"""UPSC IFoS, UPSC EPFO (EO/AO and APFC), SSC CHSL and RRB NTPC templates, v1.

Patterns as last notified:
- IFoS: Prelims is the Civil Services Prelims (same two papers), so its topics and subtopics are the
  UPSC CSE ones. Mains: General English (300), General Knowledge (300) and two optional subjects of
  two papers each (200 per paper), then a 300-mark interview. UPSC does not allow these pairs:
  Agriculture with Agricultural Engineering or with Animal Husbandry; Chemistry with Chemical
  Engineering; Mathematics with Statistics; and more than one engineering subject.
- EPFO: one Recruitment Test (120 questions, 2.5 marks each, a third off for a wrong answer, two hours)
  with the ten syllabus heads UPSC notifies for EO/AO and APFC, then an interview (75:25 weightage).
- SSC CHSL: Tier 1 (four subjects, 25 questions each, +2/-0.5) and Tier 2 Session I (Maths and
  Reasoning; English and General Awareness; Computer Knowledge, qualifying; +3/-1) and Session II
  (skill or typing test, qualifying).
- RRB NTPC: CBT 1 (100 questions: General Awareness 40, Maths 30, Reasoning 30) and CBT 2 (120
  questions: 50, 35, 35), a third off for a wrong answer. The 2026 graduate notice (CEN 06/2026)
  dropped the typing test, and has no CBAT post, so neither is a stage here.

Topics follow each exam's published syllabus heads; subtopics follow standard chapter lists. Titles are
our own wording. No PYQ frequency (not measured). IFoS optional subjects are listed by paper, as the
CSE optionals are.

Run: python3 supabase/seed/more_exams_v2.py > supabase/migrations/202611180001_prep_ifos_epfo_chsl_ntpc.sql
"""
from state_pcs_v1 import emit, upsc_paper, csat, P, M, I
from more_exams_v1 import REASONING_BASIC, QUANT, ENGLISH, GA, tier

T = lambda code, title, subs: (code, title, None, subs)

# ---------------------------------------------------------------- UPSC IFoS
IFOS_OPTIONALS = ['Agriculture', 'Agricultural Engineering', 'Animal Husbandry and Veterinary Science', 'Botany', 'Chemistry',
                  'Chemical Engineering', 'Civil Engineering', 'Forestry', 'Geology', 'Mathematics', 'Mechanical Engineering',
                  'Physics', 'Statistics', 'Zoology']
FORESTRY = (
    ['Silviculture: general principles', 'Silvicultural systems', 'Silviculture of mangroves and cold deserts', 'Silviculture of important Indian trees',
     'Agroforestry, social forestry and joint forest management', 'Forest soils, soil conservation and watershed management',
     'Environmental conservation and biodiversity', 'Tree improvement and seed technology'],
    ['Forest management and management systems', 'Forest working plans', 'Forest mensuration and remote sensing', 'Surveying and forest engineering',
     'Forest ecology and ethnobotany', 'Forest resources and utilisation', 'Forest protection and wildlife biology', 'Forest economics and legislation'],
)


def ifos_optionals():
    subjects = []
    for i, name in enumerate(IFOS_OPTIONALS):
        p1, p2 = FORESTRY if name == 'Forestry' else ([], [])
        subjects.append((f'O{i + 1:02d}', name, [T(f'O{i + 1:02d}.P1', f'{name}: Paper I', p1), T(f'O{i + 1:02d}.P2', f'{name}: Paper II', p2)]))
    return subjects


IFOS = ('ifos_v1', 'UPSC IFoS (Indian Forest Service)', [
    ('PRE', 'Preliminary Examination (same as Civil Services Prelims)', P, [], [
        ('GS', 'General Studies Paper I', P, ['PRE_GS'], upsc_paper('PRE', 'GS')),
        ('CSAT', 'General Studies Paper II (CSAT, qualifying 33%)', P, ['CSAT'], csat()),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('ENG', 'Paper I: General English (300 marks)', M, ['IFOS_ENG'], [('ENG', 'General English', [
            T('ENG.ESS', 'Essay', ['Choosing a topic and planning', 'Structure: introduction, body and conclusion', 'Practice essays on environment and society']),
            T('ENG.COMP', 'Comprehension and précis', ['Reading comprehension', 'Précis writing', 'Summary of a passage']),
            T('ENG.USE', 'Usage and vocabulary', ['Grammar and sentence correction', 'Word usage and vocabulary', 'Idioms and phrases']),
        ])]),
        ('GK', 'Paper II: General Knowledge (300 marks)', M, ['IFOS_GK'], [('GK', 'General Knowledge', [
            T('GK.CA', 'Current events', ['National current events', 'International current events', 'Environment, forests and wildlife in the news']),
            T('GK.POL', 'Indian polity and the Constitution', ['Constitution: features, rights and duties', 'Union and state government', 'Judiciary and constitutional bodies']),
            T('GK.HIS', 'History of India', ['Ancient and medieval India', 'Modern India and the national movement', 'Art and culture']),
            T('GK.GEO', 'Geography', ['Physical geography', 'Geography of India', 'World geography']),
            T('GK.SCI', 'Everyday science', ['General science', 'Science and technology developments']),
        ])]),
        ('OPT', 'Papers III to VI: two optional subjects (two papers each, 200 marks per paper)', M, ['OPT1', 'OPT2'], ifos_optionals()),
    ]),
    ('INT', 'Interview / personality test (300 marks)', I, [], []),
])

# ---------------------------------------------------------------- UPSC EPFO
EPFO = ('epfo_v1', 'UPSC EPFO (EO/AO and APFC)', [
    ('PRE', 'Recruitment Test', P, [], [
        ('RT', 'Recruitment Test (120 questions, 300 marks)', P, ['EPFO_RT'], [
            ('ENG', 'General English', [
                T('ENG.GR', 'Grammar', ['Error spotting', 'Sentence improvement', 'Tenses, articles and prepositions', 'Active and passive voice', 'Direct and indirect speech']),
                T('ENG.VO', 'Vocabulary', ['Synonyms and antonyms', 'One-word substitution', 'Idioms and phrases']),
                T('ENG.RC', 'Comprehension', ['Reading comprehension', 'Sentence rearrangement', 'Cloze test']),
            ]),
            ('HIS', 'Indian Freedom Struggle', [
                T('HIS.MOD', 'Freedom struggle', ['Decline of the Mughals and coming of the Europeans', 'Revolt of 1857', 'Rise of nationalism and the Congress', 'Gandhian movements', 'Independence and partition']),
                T('HIS.CUL', 'Culture and heritage', ['Socio-religious reform movements', 'Indian art, music, dance and architecture']),
            ]),
            ('CA', 'Current Events and Developmental Issues', [
                T('CA.NAT', 'Current events', ['National current affairs', 'International organisations and summits', 'Awards, appointments, books and important days']),
                T('CA.DEV', 'Developmental issues', ['Government schemes', 'Environment and climate change', 'Health, education and employment']),
            ]),
            ('POL', 'Indian Polity and Economy', [
                T('POL.CON', 'Indian polity', ['Preamble, fundamental rights and duties', 'Directive principles', 'Union and state executive, Parliament', 'Judiciary, local government and constitutional bodies']),
                T('POL.ECO', 'Indian economy', ['National income, inflation and demand and supply', 'Fiscal and monetary policy', 'Poverty, employment and economic reforms', 'International economic institutions']),
            ]),
            ('ACC', 'General Accounting Principles', [
                T('ACC.BAS', 'Accounting', ['Accounting concepts and standards', 'Journal, ledger and trial balance', 'Final accounts', 'Depreciation and reserves', 'Ratio analysis']),
                T('ACC.AUD', 'Auditing', ['Principles of auditing', 'Internal control and internal audit', 'Company audit']),
            ]),
            ('LAB', 'Industrial Relations and Labour Laws', [
                T('LAB.IR', 'Industrial relations', ['Trade unions and collective bargaining', 'Industrial disputes and their settlement', 'Workers’ participation in management', 'Labour welfare, wages and safety']),
                T('LAB.LAW', 'Labour laws and codes', ['Code on Wages', 'Industrial Relations Code', 'Occupational Safety, Health and Working Conditions Code', 'Code on Social Security', 'Older acts: Factories, Minimum Wages, Payment of Wages, Trade Unions, Maternity Benefit']),
            ]),
            ('SCI', 'General Science and Computer Applications', [
                T('SCI.GEN', 'General science', ['Physics in everyday life', 'Chemistry in everyday life', 'Biology and health', 'Space and technology']),
                T('SCI.COM', 'Computer applications', ['Hardware, software and operating systems', 'MS Office: Word, Excel, PowerPoint', 'Internet, networking and cyber security']),
            ]),
            ('APT', 'General Mental Ability and Quantitative Aptitude', [
                T('APT.QA', 'Quantitative aptitude', ['Number system and simplification', 'Percentages, ratio and averages', 'Profit and loss, interest', 'Time and work, time and distance', 'Data interpretation and probability']),
                T('APT.MA', 'Mental ability', ['Series, analogy and coding-decoding', 'Blood relations and directions', 'Syllogism and statements']),
            ]),
            ('SS', 'Social Security in India', [
                T('SS.EPF', 'EPFO and provident fund', ['EPF and Miscellaneous Provisions Act, 1952', 'EPF, EPS and EDLI schemes', 'Structure and working of EPFO']),
                T('SS.OTH', 'Other social security', ['ESI Act, 1948 and ESIC', 'Payment of Gratuity Act, 1972', 'Employees’ Compensation Act, 1923', 'Atal Pension Yojana, NPS and unorganised workers’ schemes']),
            ]),
        ]),
    ]),
    ('INT', 'Interview (100 marks)', I, [], []),
])

# ---------------------------------------------------------------- SSC CHSL
CHSL = ('ssc_chsl_v1', 'SSC CHSL', [
    ('PRE', 'Tier 1', P, [], [
        ('T1', 'Tier 1 (4 subjects, 25 questions each)', P, ['TIER1'], [
            ('REA', 'General Intelligence', tier('REA', REASONING_BASIC)),
            ('GA', 'General Awareness', tier('GA', GA)),
            ('QA', 'Quantitative Aptitude (basic arithmetic)', tier('QA', QUANT)),
            ('ENG', 'English Language (basic knowledge)', tier('ENG', ENGLISH)),
        ]),
    ]),
    ('MAI', 'Tier 2', M, [], [
        ('S1', 'Session I: Sections I and II', M, ['TIER2'], [
            ('MAT', 'Section I, Module 1: Mathematical Abilities', tier('MAT', QUANT)),
            ('REA', 'Section I, Module 2: Reasoning and General Intelligence', tier('REA', REASONING_BASIC)),
            ('ENG', 'Section II, Module 1: English Language and Comprehension', tier('ENG', ENGLISH)),
            ('GA', 'Section II, Module 2: General Awareness', tier('GA', GA)),
        ]),
        ('S3', 'Section III: computer and typing (qualifying)', M, ['TIER2_SKILL'], [
            ('CK', 'Computer Knowledge and skill test', [
                T('CK.BAS', 'Computer knowledge (Module 1)', ['Computer basics: hardware, memory and storage', 'Windows, MS Word, Excel and PowerPoint', 'Internet, email and e-banking', 'Networking and cyber security']),
                T('CK.TYP', 'Typing test, LDC and JSA (Module 2)', ['English typing: 35 words a minute', 'Hindi typing: 30 words a minute']),
                T('CK.DEO', 'Skill test, DEO (Module 2)', ['Data entry: 15,000 key depressions an hour', 'Data entry for C&AG posts: 15,000 key depressions an hour']),
            ]),
        ]),
    ]),
])

# ---------------------------------------------------------------- RRB NTPC
NTPC_GA = [
    T('CA', 'Current affairs and sports', ['National and international current events', 'Games and sports', 'Famous personalities', 'Flagship government programmes']),
    T('HIS', 'History, art and culture', ['History of India and the freedom struggle', 'Art and culture of India', 'Indian literature', 'Monuments and places of India']),
    T('GEO', 'Geography and environment', ['Physical, social and economic geography of India and the world', 'Flora and fauna of India', 'Environmental issues in India and the world']),
    T('POL', 'Polity and economy', ['Indian polity and governance', 'Indian economy', 'Important government and public sector organisations']),
    T('SCI', 'Science and technology', ['General science and life science (up to Class 10)', 'Space and nuclear programmes of India', 'Scientific and technological developments']),
    T('MISC', 'Computers and general knowledge', ['Basics of computers and computer applications', 'UN and other world organisations', 'Common abbreviations', 'Transport systems in India, including the railways']),
]
NTPC_MATH = [
    T('NS', 'Numbers', ['Number system, decimals and fractions', 'LCM and HCF', 'Simplification']),
    T('AR', 'Arithmetic', ['Ratio and proportion', 'Percentage', 'Profit and loss', 'Simple and compound interest', 'Time and work', 'Time and distance']),
    T('AG', 'Algebra, geometry and mensuration', ['Elementary algebra', 'Geometry', 'Trigonometry', 'Mensuration']),
    T('ST', 'Elementary statistics', ['Mean, median and mode', 'Reading tables and graphs']),
]
NTPC_REA = [
    T('VR', 'Series, analogy and coding', ['Analogies', 'Number and alphabet series', 'Coding and decoding', 'Similarities and differences']),
    T('LR', 'Logical reasoning', ['Relationships and blood relations', 'Syllogism', 'Venn diagrams', 'Statement and conclusion', 'Statement and courses of action']),
    T('AN', 'Analytical reasoning', ['Puzzles and seating', 'Mathematical operations', 'Jumbling', 'Data sufficiency', 'Decision making']),
    T('MG', 'Maps and graphs', ['Maps and directions', 'Interpretation of graphs']),
]
NTPC = ('rrb_ntpc_v1', 'RRB NTPC', [
    ('PRE', 'CBT 1', P, [], [
        ('C1', 'CBT 1 (100 questions, 90 minutes)', P, ['CBT1'], [
            ('GA', 'General Awareness (40)', tier('GA', NTPC_GA)),
            ('MAT', 'Mathematics (30)', tier('MAT', NTPC_MATH)),
            ('REA', 'General Intelligence and Reasoning (30)', tier('REA', NTPC_REA)),
        ]),
    ]),
    ('MAI', 'CBT 2', M, [], [
        ('C2', 'CBT 2 (120 questions, 90 minutes)', M, ['CBT2'], [
            ('GA', 'General Awareness (50)', tier('GA', NTPC_GA)),
            ('MAT', 'Mathematics (35)', tier('MAT', NTPC_MATH)),
            ('REA', 'General Intelligence and Reasoning (35)', tier('REA', NTPC_REA)),
        ]),
    ]),
])


def main():
    print('-- Preparation tracker: UPSC IFoS, UPSC EPFO, SSC CHSL and RRB NTPC templates v1.')
    print('-- Generated by supabase/seed/more_exams_v2.py. Safe to rerun: rows are matched on (template, code).')
    print('begin;')
    print('-- IFoS students pick two optional subjects; the second is kept here (null for every other exam).')
    print('alter table public.prep_plans add column if not exists optional_subject_node_id_2 uuid references public.prep_syllabus_nodes(id) on delete set null;')
    print()
    for (code, name, tree), exam, ncert in ((IFOS, 'upsc', True), (EPFO, 'upsc', False), (CHSL, 'ssc', False), (NTPC, 'railway', False)):
        sql, *_ = emit(code, name, tree, optionals=False, ncert_path=ncert, exam=exam)
        print(sql)
        print()
    print('commit;')


if __name__ == '__main__':
    main()
