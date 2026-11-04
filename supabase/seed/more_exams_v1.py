"""SSC CGL, Bank PO (IBPS/SBI), CTET and UPTET templates, v1.

Patterns as notified for 2026: SSC CGL Tier 1 (Reasoning, General Awareness, Quant, English) and Tier 2
Paper I modules, with Papers II and III (Statistics; Finance and Economics) as post-specific options;
IBPS PO Prelims (English, Quant, Reasoning) and Mains (Reasoning, Data Analysis, English, General /
Banking / Financial Awareness, Descriptive); CTET and UPTET Paper 1 (classes 1-5) and Paper 2 (classes
6-8, with Maths and Science or Social Studies). Topics and subtopics follow the standard chapter lists
used by coaching guides for these exams. Titles are our own wording. No PYQ frequency (not measured).

Run: python3 supabase/seed/more_exams_v1.py > supabase/migrations/202611100006_prep_more_exams.sql
"""
from state_pcs_v1 import emit, P, M, I

T = lambda code, title, subs: (code, title, None, subs)

# ---------------------------------------------------------------- shared chapter lists
REASONING_BASIC = [
    T('AN', 'Analogy, classification and series', ['Analogy (words, numbers, figures)', 'Classification (odd one out)', 'Number and letter series', 'Figure series and missing figures']),
    T('CD', 'Coding, relations and directions', ['Coding-decoding', 'Blood relations', 'Direction and distance', 'Order and ranking']),
    T('LG', 'Logic and statements', ['Syllogism', 'Venn diagrams', 'Statement and conclusion', 'Mathematical operations and symbols']),
    T('VS', 'Visual reasoning', ['Mirror and water images', 'Paper folding and cutting', 'Embedded and counting figures', 'Dice and cubes']),
    T('AR', 'Arrangements', ['Seating arrangement', 'Matrix and missing numbers', 'Dictionary order and word arrangement']),
]
QUANT = [
    T('NS', 'Number system and simplification', ['Number system and divisibility', 'HCF and LCM', 'Simplification and surds', 'Fractions and decimals']),
    T('PC', 'Percentages and commerce', ['Percentages', 'Profit, loss and discount', 'Simple and compound interest', 'Ratio, proportion and partnership', 'Averages and ages', 'Mixtures and alligation']),
    T('TW', 'Time, work and distance', ['Time and work, pipes and cisterns', 'Time, speed and distance', 'Trains, boats and streams']),
    T('AL', 'Algebra', ['Algebraic identities', 'Linear equations', 'Surds and indices in algebra']),
    T('GM', 'Geometry and mensuration', ['Lines, angles and triangles', 'Circles and quadrilaterals', 'Mensuration 2D', 'Mensuration 3D']),
    T('TR', 'Trigonometry', ['Trigonometric ratios and identities', 'Heights and distances']),
    T('DI', 'Data interpretation and statistics', ['Tables and bar graphs', 'Pie charts and line graphs', 'Mean, median and mode']),
]
ENGLISH = [
    T('RC', 'Reading comprehension and cloze', ['Reading comprehension', 'Cloze test', 'Para jumbles']),
    T('GR', 'Grammar', ['Error spotting', 'Sentence improvement', 'Fill in the blanks', 'Active and passive voice', 'Direct and indirect speech']),
    T('VO', 'Vocabulary', ['Synonyms and antonyms', 'One-word substitution', 'Idioms and phrases', 'Spelling errors']),
]
GA = [
    T('HI', 'History and culture', ['Ancient India', 'Medieval India', 'Modern India and the freedom struggle', 'Art and culture']),
    T('GE', 'Geography', ['Physical geography', 'Indian geography', 'World geography']),
    T('PO', 'Polity', ['Constitution and fundamental rights', 'Parliament, executive and judiciary', 'Local government and constitutional bodies']),
    T('EC', 'Economy', ['Basic economic concepts', 'Banking, budget and taxation', 'Government schemes']),
    T('SC', 'General science', ['Physics', 'Chemistry', 'Biology']),
    T('ST', 'Static GK and current affairs', ['Books, authors and awards', 'Sports and important days', 'Current affairs (last 6-8 months)']),
]

def tier(prefix, topics):
    """Same chapters under a new code (Tier 2 goes deeper into the Tier 1 subjects)."""
    return [(f'{prefix}.{c}', t, None, s) for c, t, _, s in topics]

SSC_CGL = ('ssc_cgl_v1', 'SSC CGL', [
    ('PRE', 'Tier 1', P, [], [
        ('T1', 'Tier 1 (4 subjects, 25 questions each)', P, ['TIER1'], [
            ('REA', 'General Intelligence and Reasoning', tier('REA', REASONING_BASIC)),
            ('GA', 'General Awareness', tier('GA', GA)),
            ('QA', 'Quantitative Aptitude', tier('QA', QUANT)),
            ('ENG', 'English Comprehension', tier('ENG', ENGLISH)),
        ]),
    ]),
    ('MAI', 'Tier 2', M, [], [
        ('P1', 'Paper I (all posts)', M, ['TIER2_P1'], [
            ('MAT', 'Module I: Mathematical Abilities', tier('MAT', QUANT)),
            ('REA', 'Module II: Reasoning and General Intelligence', tier('REA', REASONING_BASIC)),
            ('ENG', 'Module III: English Language and Comprehension', tier('ENG', ENGLISH)),
            ('GA', 'Module IV: General Awareness', tier('GA', GA)),
            ('CK', 'Computer Knowledge and Data Entry', [
                T('CK.BAS', 'Computer knowledge', ['Computer basics: hardware and software', 'MS Word, Excel and PowerPoint', 'Internet, email and networking', 'Cyber security basics']),
                T('CK.DEST', 'Data Entry Speed Test', ['Typing practice: 2000 key depressions in 15 minutes']),
            ]),
        ]),
        ('OPT', 'Paper II or III (only for some posts)', M, ['TIER2_P2', 'TIER2_P3'], [
            ('STA', 'Paper II: Statistics (JSO and Statistical Investigator)', [
                T('STA.DES', 'Descriptive statistics', ['Collection and presentation of data', 'Measures of central tendency', 'Dispersion, moments and skewness']),
                T('STA.INF', 'Probability and inference', ['Correlation and regression', 'Probability and distributions', 'Sampling and statistical inference', 'Analysis of variance', 'Time series and index numbers']),
            ]),
            ('FIN', 'Paper III: Finance and Economics (AAO)', [
                T('FIN.ACC', 'Finance and accounts', ['Financial accounting fundamentals', 'Basic concepts of accounting standards']),
                T('FIN.ECO', 'Economics and governance', ['Essential concepts of economics', 'Indian economy and planning', 'Money, banking and public finance', 'Economic reforms and governance']),
            ]),
        ]),
    ]),
])

BANK_PO = ('bank_po_v1', 'Bank PO (IBPS / SBI)', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('PR', 'Prelims (English, Quant, Reasoning)', P, ['PRELIMS'], [
            ('ENG', 'English Language', [
                T('ENG.RC', 'Reading comprehension', ['Reading comprehension', 'Vocabulary in context']),
                T('ENG.GR', 'Grammar and usage', ['Error detection', 'Fillers and word usage', 'Sentence rearrangement and para jumbles', 'Cloze test']),
            ]),
            ('QA', 'Quantitative Aptitude', [
                T('QA.SIM', 'Calculation', ['Simplification and approximation', 'Number series (missing and wrong)', 'Quadratic equations']),
                T('QA.ARI', 'Arithmetic', ['Percentages, profit and loss', 'Simple and compound interest', 'Ratio, averages and ages', 'Time and work, time and distance', 'Mixtures, partnership', 'Permutation, combination and probability']),
                T('QA.DI', 'Data interpretation', ['Tables and bar graphs', 'Pie and line charts', 'Caselet DI']),
            ]),
            ('REA', 'Reasoning Ability', [
                T('REA.PUZ', 'Puzzles and seating arrangement', ['Linear and circular seating', 'Floor, box and scheduling puzzles']),
                T('REA.LOG', 'Logical reasoning', ['Syllogism', 'Inequalities', 'Coding-decoding', 'Blood relations', 'Direction and distance', 'Order, ranking and alphanumeric series']),
            ]),
        ]),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('MN', 'Mains (objective and descriptive)', M, ['MAINS'], [
            ('REA', 'Reasoning', [
                T('REA.ADV', 'Advanced puzzles', ['Complex seating and floor puzzles', 'Input-output']),
                T('REA.CRT', 'Critical reasoning', ['Assumptions, inferences and conclusions', 'Courses of action and arguments', 'Data sufficiency (reasoning)']),
            ]),
            ('DAI', 'Data Analysis and Interpretation', [
                T('DAI.DI', 'Advanced data interpretation', ['Mixed and missing DI', 'Arithmetic-based DI', 'Data sufficiency and quantity comparison']),
            ]),
            ('ENG', 'English Language', [
                T('ENG.ADV', 'Advanced English', ['Long reading comprehension', 'Para summary and odd sentence', 'Connectors and phrase replacement']),
            ]),
            ('GA', 'General, Economy and Banking Awareness', [
                T('GA.BNK', 'Banking awareness', ['RBI, monetary policy and banking terms', 'Types of banks and financial institutions', 'Digital payments and fintech']),
                T('GA.FIN', 'Financial and economic awareness', ['Union budget and economic survey', 'Markets, insurance and regulators (SEBI, IRDAI)', 'Government economic schemes']),
                T('GA.CA', 'Current affairs and static GK', ['Current affairs (last 6 months)', 'Static GK: capitals, currencies, headquarters']),
            ]),
            ('DES', 'Descriptive (English)', [
                T('DES.WRT', 'Descriptive writing', ['Essay writing', 'Letter writing', 'Precis and comprehension']),
            ]),
        ]),
    ]),
    ('INT', 'Interview', I, [], []),
])


def tet(code, name, lang1, lang2):
    cdp = [
        T('CDP.DEV', 'Child development', ['Concept of development and its relation with learning', 'Principles of development', 'Heredity and environment', 'Socialisation processes', 'Piaget, Kohlberg and Vygotsky', 'Gender and individual differences']),
        T('CDP.INC', 'Inclusive education', ['Children from diverse backgrounds', 'Children with learning difficulties', 'Talented and specially abled learners']),
        T('CDP.LRN', 'Learning and pedagogy', ['How children think and learn', 'Motivation and learning', 'Teaching-learning processes', 'Assessment: continuous and comprehensive evaluation']),
    ]
    lang = lambda which, title: [
        T(f'{which}.COMP', f'{title}: comprehension', ['Unseen prose passage', 'Unseen poem']),
        T(f'{which}.PED', f'{title}: pedagogy', ['Language acquisition and learning', 'Listening, speaking, reading and writing', 'Teaching-learning materials and remedial teaching', 'Grammar in context and evaluation']),
    ]
    maths1 = [T('MAT.CON', 'Mathematics content (classes 1-5)', ['Geometry and shapes', 'Numbers and place value', 'Addition, subtraction, multiplication and division', 'Measurement, weight, time and volume', 'Data handling and patterns', 'Money']),
              T('MAT.PED', 'Mathematics pedagogy', ['Nature of mathematics and logical thinking', 'Place of mathematics in the curriculum', 'Language of mathematics', 'Evaluation, errors and remedial teaching'])]
    evs = [T('EVS.CON', 'EVS content', ['Family and friends', 'Food, shelter and water', 'Travel', 'Things we make and do']),
           T('EVS.PED', 'EVS pedagogy', ['Concept and scope of EVS', 'Learning principles and approaches', 'Activities, experimentation and discussion', 'Continuous and comprehensive evaluation'])]
    msc = [T('MS.MAT', 'Mathematics (classes 6-8)', ['Number system and algebra', 'Geometry and mensuration', 'Data handling']),
           T('MS.SCI', 'Science (classes 6-8)', ['Food and materials', 'The world of the living', 'Moving things, people and ideas', 'How things work and natural phenomena', 'Natural resources']),
           T('MS.PED', 'Maths and science pedagogy', ['Nature of maths and science', 'Approaches, innovation and text material', 'Evaluation and remedial teaching'])]
    sst = [T('SS.HIS', 'History', ['Sources and early societies', 'Kingdoms, empires and the medieval world', 'Colonialism, revolt and the national movement']),
           T('SS.GEO', 'Geography', ['The earth, its structure and resources', 'Agriculture and human environment']),
           T('SS.POL', 'Social and political life', ['Diversity and government', 'Democracy, the Constitution and the judiciary', 'Social justice and the marginalised']),
           T('SS.PED', 'Social studies pedagogy', ['Concept and nature of social science', 'Classroom processes and project work', 'Evaluation'])]
    return (code, name, [
        ('PRE', 'Paper 1 (classes 1-5)', P, [], [
            ('P1', 'Paper 1: 150 questions, no negative marking', P, ['PAPER1'], [
                ('CDP', 'Child Development and Pedagogy', cdp),
                ('L1', f'Language I: {lang1}', lang('L1', lang1)),
                ('L2', f'Language II: {lang2}', lang('L2', lang2)),
                ('MAT', 'Mathematics', maths1),
                ('EVS', 'Environmental Studies', evs),
            ]),
        ]),
        ('MAI', 'Paper 2 (classes 6-8)', M, [], [
            ('P2', 'Paper 2: common sections', M, ['PAPER2'], [
                ('CDP', 'Child Development and Pedagogy', cdp),
                ('L1', f'Language I: {lang1}', lang('L1', lang1)),
                ('L2', f'Language II: {lang2}', lang('L2', lang2)),
            ]),
            ('OPT', 'Paper 2: your subject', M, ['PAPER2'], [
                ('MSC', 'Mathematics and Science', msc),
                ('SST', 'Social Studies', sst),
            ]),
        ]),
    ])

CTET = tet('ctet_v1', 'CTET', 'your chosen language', 'your second language')
UPTET = tet('uptet_v1', 'UPTET', 'Hindi', 'English, Urdu or Sanskrit')


def main():
    print('-- Preparation tracker: SSC CGL, Bank PO, CTET and UPTET templates v1. Generated by supabase/seed/more_exams_v1.py. Safe to rerun.')
    print('begin;')
    for (code, name, tree), exam in ((SSC_CGL, 'ssc'), (BANK_PO, 'banking'), (CTET, 'teaching'), (UPTET, 'teaching')):
        sql, *_ = emit(code, name, tree, optionals=False, ncert_path=False, exam=exam)
        print(sql)
        print()
    print('commit;')


if __name__ == '__main__':
    main()
