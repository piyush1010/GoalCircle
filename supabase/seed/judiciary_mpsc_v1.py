"""UP PCS-J, MP Civil Judge (Junior Division) and MPSC Rajyaseva templates, v1.

UP PCS-J: UPPSC scheme. Prelims Paper I General Knowledge (150) and Paper II Law (300); Mains General
Knowledge (200), English (100), Hindi (100), Law I Substantive (200), Law II Procedure and Evidence (200),
Law III Penal, Revenue and Local Laws (200); interview (100).
MP Civil Judge: MP High Court scheme. Prelims of 150 one-mark questions across the listed Acts, general
knowledge, computers and English; Mains four papers of 100 (civil law, writing and translation, criminal
and local law, framing issues and charges with judgment writing); interview (50).
MPSC Rajyaseva: the descriptive pattern from 2025. Prelims GS (200) and CSAT (200, qualifying 33%);
Mains Marathi and English (qualifying), Essay, GS I-IV and two optional papers; interview (275).

Criminal law: the Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha Sanhita and Bharatiya Sakshya
Adhiniyam (2023) replaced the IPC, CrPC and Evidence Act from 1 July 2024. Titles name both, because
notifications and coaching material still use either. Students should follow their own notification.

Subtopics follow the usual chapter-wise split of each Act used in judiciary preparation. Titles are our
own wording. No PYQ frequency (not measured).

Run: python3 supabase/seed/judiciary_mpsc_v1.py > supabase/migrations/202611110003_prep_judiciary_mpsc.sql
"""
from state_pcs_v1 import emit, upsc_paper, csat, P, M, I

T = lambda code, title, subs: (code, title, None, subs)

# ------------------------------------------------------------------------------- law topics
CONSTITUTION = T('CON', 'Constitution of India', [
    'Preamble, Union and its territory, citizenship', 'Fundamental Rights (Articles 12 to 35) and writs',
    'Directive Principles and Fundamental Duties', 'Union executive and Parliament', 'State executive and legislature',
    'Supreme Court, High Courts and subordinate courts (Articles 233 to 237)', 'Centre-state relations and emergency provisions',
    'Amendment and the basic structure doctrine'])
CPC = T('CPC', 'Code of Civil Procedure, 1908', [
    'Jurisdiction, res sub judice and res judicata (sections 9 to 12)', 'Parties, frame and institution of suits (Orders 1 to 4)',
    'Summons, pleadings, plaint and written statement (Orders 5 to 8)', 'Appearance, ex parte decrees, discovery and admissions (Orders 9 to 13)',
    'Issues, hearing, judgment and decree (Orders 14 to 20)', 'Execution of decrees (sections 36 to 74, Order 21)',
    'Suits by or against the government, minors, indigent persons; summary suits', 'Interim orders: temporary injunctions and receivers (Orders 38 to 40)',
    'Appeals, reference, review and revision (sections 96 to 115)', 'Inherent powers and miscellaneous (sections 148 to 153A)'])
TPA = T('TPA', 'Transfer of Property Act, 1882', [
    'Definitions and what may be transferred (sections 1 to 11)', 'Conditional transfers, vested and contingent interest, election (sections 12 to 35)',
    'Ostensible owner, part performance and lis pendens (sections 41, 52, 53A)', 'Sale (sections 54 to 57)',
    'Mortgages and charges (sections 58 to 104)', 'Leases (sections 105 to 117)', 'Exchange, gifts and actionable claims (sections 118 to 137)'])
CONTRACT = T('ICA', 'Indian Contract Act, 1872', [
    'Proposal, acceptance and revocation', 'Consideration and capacity to contract', 'Free consent: coercion, undue influence, fraud, misrepresentation, mistake',
    'Void agreements and contingent contracts', 'Performance and discharge of contracts', 'Quasi-contracts (sections 68 to 72)',
    'Breach and damages (sections 73 to 75)', 'Indemnity and guarantee', 'Bailment and pledge', 'Agency'])
SRA = T('SRA', 'Specific Relief Act, 1963', [
    'Recovery of possession (sections 5 to 8)', 'Specific performance of contracts and the 2018 amendment (sections 9 to 25)',
    'Rectification, rescission and cancellation (sections 26 to 33)', 'Declaratory decrees (sections 34 and 35)', 'Temporary and perpetual injunctions (sections 36 to 42)'])
LIMITATION = T('LIM', 'Limitation Act, 1963', [
    'Bar of limitation and condonation of delay (sections 3 to 5)', 'Legal disability, computation and exclusion of time (sections 6 to 24)',
    'Acquisition of easements and ownership by possession (sections 25 to 27)', 'Important articles of the Schedule'])
EVIDENCE = T('EVI', 'Bharatiya Sakshya Adhiniyam, 2023 (formerly Indian Evidence Act)', [
    'Relevancy of facts and res gestae', 'Admissions and confessions', 'Dying declarations and statements of persons who cannot be called',
    'Expert opinion and character evidence', 'Oral, documentary and electronic evidence', 'Burden of proof and presumptions',
    'Estoppel', 'Witnesses: competency, privilege and accomplices', 'Examination of witnesses and leading questions'])
PENAL = T('BNS', 'Bharatiya Nyaya Sanhita, 2023 (formerly IPC)', [
    'General explanations and punishments', 'General exceptions and the right of private defence', 'Abetment, criminal conspiracy and attempt',
    'Offences against the State and public tranquillity', 'Offences affecting the human body: murder, culpable homicide, hurt',
    'Offences against women and children', 'Offences against property: theft, extortion, robbery, dacoity',
    'Cheating, criminal breach of trust and forgery', 'Defamation, criminal intimidation and other offences',
    'New offences: organised crime, terrorism, mob lynching'])
PROCEDURE = T('BNSS', 'Bharatiya Nagarik Suraksha Sanhita, 2023 (formerly CrPC)', [
    'Criminal courts and their powers', 'Arrest and processes to compel appearance', 'FIR, zero FIR, investigation and police report',
    'Bail and bonds', 'Maintenance of wives, children and parents', 'Charge and trials: sessions, warrant, summons, summary',
    'Judgment, sentence and plea bargaining', 'Appeals, reference and revision', 'Inherent powers, timelines and electronic procedure'])
NI_ACT = T('NIA', 'Negotiable Instruments Act, 1881', [
    'Notes, bills, cheques; holder and holder in due course', 'Negotiation, endorsement and presentment',
    'Presumptions (sections 118 and 139)', 'Dishonour of cheques (section 138 to 148, Chapter 17)'])
JURISPRUDENCE = T('JUR', 'Jurisprudence', [
    'Nature and schools of jurisprudence', 'Sources of law: legislation, precedent, custom', 'Rights and duties',
    'Ownership and possession', 'Legal persons, liability and obligations'])
INTL = T('INT', 'International organisations and current international legal affairs', [
    'United Nations: organs and the Charter', 'International Court of Justice and specialised agencies',
    'Regional organisations and treaties', 'Current international legal affairs'])
HINDU = T('HL', 'Hindu law', [
    'Sources and schools of Hindu law', 'Marriage and divorce (Hindu Marriage Act, 1955)', 'Adoption and maintenance (Act of 1956)',
    'Minority and guardianship', 'Succession (Hindu Succession Act, 1956, and 2005 amendment)', 'Joint family, coparcenary and partition'])
MUSLIM = T('ML', 'Muslim law', [
    'Sources and schools of Muslim law', 'Marriage, mahr and dissolution of marriage', 'Maintenance, including the 1986 and 2019 Acts',
    'Gift (hiba) and wakf', 'Inheritance and wills', 'Parentage and guardianship'])
TORTS = T('TOR', 'Law of torts and easements', [
    'General principles and defences', 'Negligence, nuisance and defamation', 'Vicarious, strict and absolute liability',
    'Remedies in tort', 'Indian Easements Act, 1882'])
EQUITY = T('EQ', 'Equity, trusts and partnership', [
    'Maxims and principles of equity', 'Indian Trusts Act, 1882', 'Indian Partnership Act, 1932'])
JUDGMENT = [
    T('ISS', 'Framing of issues', ['Reading pleadings for points in dispute', 'Issues of fact and of law', 'Burden and order of issues']),
    T('CHG', 'Framing of charges', ['Ingredients of the offence', 'Form and content of a charge', 'Joinder of charges']),
    T('CJW', 'Civil judgment writing', ['Structure of a civil judgment', 'Findings on each issue with reasons', 'Relief, decree and costs']),
    T('KJW', 'Criminal judgment writing', ['Structure of a criminal judgment', 'Appreciating evidence and benefit of doubt', 'Conviction, acquittal and sentencing']),
]

# -------------------------------------------------------------------------------------- UP PCS-J
UP_LOCAL = [
    T('UPRC', 'UP Revenue Code, 2006', ['Revenue courts and officers', 'Land records and boundaries', 'Tenure holders, rights and succession', 'Declaratory suits, partition and ejectment']),
    T('UPRENT', 'UP rent laws', ['UP Urban Buildings (Regulation of Letting, Rent and Eviction) Act, 1972', 'UP Regulation of Urban Premises Tenancy Act, 2021']),
    T('UPMUN', 'UP Municipalities Act, 1916', ['Constitution of municipal boards', 'Powers, duties and taxation', 'Control by the state government']),
    T('UPPR', 'UP Panchayat Raj Act, 1947', ['Gram Sabha and Gram Panchayat', 'Powers, functions and finances', 'Nyaya panchayats and control']),
    T('UPCH', 'UP Consolidation of Holdings Act, 1953', ['Objects and stages of consolidation', 'Objections, appeals and revision', 'Bar of civil court jurisdiction']),
    T('UPUPD', 'UP Urban Planning and Development Act, 1973', ['Development authorities and master plans', 'Permission, demolition and penalties']),
]
LANG_EN = [T('ENG.W', 'English', ['Essay writing', 'Precis writing', 'Translation: Hindi to English'])]
LANG_HI = [T('HIN.W', 'हिंदी', ['निबंध लेखन', 'सारांश लेखन', 'अनुवाद: अंग्रेज़ी से हिंदी'])]


def gk_from_upsc():
    """Prelims GK covers the same ground as UPSC GS I, so reuse those topics and subtopics."""
    return upsc_paper('PRE', 'GS')


def law(*topics):
    return [('LAW', 'Law', list(topics))]


UPPCSJ = ('up_pcsj_v1', 'UP PCS-J (Civil Judge, Junior Division)', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('GK', 'Paper I: General Knowledge', P, ['PCSJ_GK'], gk_from_upsc() + [('SOC', 'Social welfare laws', [
            T('SOC.DIS', 'Rights of Persons with Disabilities Act, 2016', ['Rights and entitlements', 'Authorities and offences']),
            T('SOC.SEN', 'Maintenance and Welfare of Parents and Senior Citizens Act, 2007', ['Maintenance tribunals', 'Protection of life and property']),
        ])]),
        ('LAW', 'Paper II: Law', P, ['PCSJ_LAW'], law(JURISPRUDENCE, INTL, CONSTITUTION, TPA, EVIDENCE, PENAL, CPC, PROCEDURE, CONTRACT)),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('GK', 'General Knowledge', M, ['PCSJ_MGK'], gk_from_upsc()),
        ('ENG', 'English Language', M, ['PCSJ_ENG'], [('ENG', 'English Language', LANG_EN)]),
        ('HIN', 'Hindi Language', M, ['PCSJ_HIN'], [('HIN', 'Hindi Language', LANG_HI)]),
        ('L1', 'Law I: Substantive Law', M, ['PCSJ_L1'], law(CONTRACT, EQUITY, TORTS, TPA, HINDU, MUSLIM, CONSTITUTION)),
        ('L2', 'Law II: Procedure and Evidence', M, ['PCSJ_L2'], law(EVIDENCE, PROCEDURE, CPC, *JUDGMENT)),
        ('L3', 'Law III: Penal, Revenue and Local Laws', M, ['PCSJ_L3'], law(PENAL, *UP_LOCAL)),
    ]),
    ('INT', 'Interview', I, [], []),
])

# ------------------------------------------------------------------------------- MP Civil Judge
MP_LOCAL = [
    T('MPAC', 'MP Accommodation Control Act, 1961', ['Definitions and landlord-tenant relations', 'Grounds of eviction (section 12)', 'Rent Controlling Authority and procedure']),
    T('MPLRC', 'MP Land Revenue Code, 1959', ['Revenue officers and courts', 'Land records and assessment', 'Bhumiswami rights and transfer', 'Appeals, revision and review']),
]
SPECIAL = [
    T('ITA', 'Information Technology Act, 2000', ['Electronic records and signatures', 'Cyber offences and penalties']),
    T('JJA', 'Juvenile Justice Act, 2015', ['Children in conflict with law', 'Juvenile Justice Boards and procedure']),
    T('POCSO', 'POCSO Act, 2012', ['Offences and punishments', 'Special courts and child-friendly procedure']),
]
OTHER = [('GEN', 'General knowledge, computers and English', [
    T('GK', 'General knowledge', ['Indian history, polity and geography', 'Madhya Pradesh: history, geography and administration', 'Current affairs']),
    T('COMP', 'Computer knowledge', ['Hardware, software and operating systems', 'MS Office basics', 'Internet, e-courts and cyber safety']),
    T('ENGK', 'English knowledge', ['Grammar and usage', 'Vocabulary', 'Comprehension']),
])]

MPCJ = ('mp_civil_judge_v1', 'MP Civil Judge (Junior Division, Entry Level)', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('OBJ', 'Objective paper (150 questions)', P, ['MPCJ_PRE'],
         law(CONSTITUTION, CPC, TPA, CONTRACT, SRA, LIMITATION, *MP_LOCAL, EVIDENCE, PENAL, PROCEDURE, NI_ACT, *SPECIAL) + OTHER),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('P1', 'Paper I: Civil law and procedure', M, ['MPCJ_P1'], law(CONSTITUTION, CPC, TPA, CONTRACT, SRA, LIMITATION)),
        ('P2', 'Paper II: Writing skills and translation', M, ['MPCJ_P2'], [('WRT', 'Writing skills', [
            T('SOC', 'Article on a social subject', ['Structure and argument', 'Current social issues']),
            T('LEG', 'Article on a legal topic', ['Recent judgments and legal developments', 'Writing with authority and citation']),
            T('PRC', 'Legal precis writing', ['Summarising a judgment or passage']),
            T('TRN', 'Translation', ['Hindi to English', 'English to Hindi']),
        ])]),
        ('P3', 'Paper III: Criminal and local law', M, ['MPCJ_P3'], law(PENAL, PROCEDURE, EVIDENCE, NI_ACT, *MP_LOCAL)),
        ('P4', 'Paper IV: Issues, charges and judgment writing', M, ['MPCJ_P4'], law(*JUDGMENT)),
    ]),
    ('INT', 'Interview', I, [], []),
])

# --------------------------------------------------------------------------------- MPSC Rajyaseva
MH_PRE = ('MH', 'Maharashtra: special knowledge', [
    T('MH.HIS', 'History and culture of Maharashtra', ['Satavahanas, Rashtrakutas and Yadavas', 'Shivaji Maharaj and the Maratha state', 'Peshwas and the Maratha confederacy', 'Social reformers: Phule, Shahu Maharaj, Ambedkar, Agarkar', 'Samyukta Maharashtra movement', 'Forts, caves and heritage sites', 'Festivals, folk arts and literature']),
    T('MH.GEO', 'Geography of Maharashtra', ['Physiography and divisions', 'Rivers, dams and water disputes', 'Climate, soils and forests', 'Agriculture and cropping pattern', 'Minerals, energy and industry', 'Population and urbanisation']),
    T('MH.POL', 'Polity and administration of Maharashtra', ['Governor, Chief Minister and legislature', 'Divisions and districts', 'Panchayati Raj and urban bodies in Maharashtra', 'State commissions and bodies']),
    T('MH.ECO', 'Economy of Maharashtra', ['Economic survey highlights and budget', 'Industry, MIDC and investment', 'Agriculture, irrigation and cooperatives', 'State schemes']),
    T('MH.CA', 'Maharashtra current affairs', ['State decisions and policies', 'Awards, events and personalities']),
])
MH_GS1 = ('MH1', 'Maharashtra: saints, society and reform', [
    T('MH1.BHK', 'Bhakti movement and the saint tradition', ['Varkari tradition: Dnyaneshwar, Namdev, Eknath, Tukaram', 'Ramdas and the Samarth tradition', 'Mahanubhav and other sects', 'Social message of the saints']),
    T('MH1.REF', 'Social and political reform in Maharashtra', ['Satyashodhak Samaj and Mahatma Phule', 'Shahu Maharaj and reservation', 'Dr Ambedkar and the Dalit movement', 'Women reformers: Savitribai Phule, Pandita Ramabai']),
])
MH_GS3 = ('MH3', 'Maharashtra: economy and development', [
    T('MH3.AGR', 'Agriculture and water in Maharashtra', ['Drought, rain-fed farming and Jalyukta Shivar', 'Irrigation projects and water disputes', 'Cooperative movement: sugar and dairy']),
    T('MH3.DEV', 'Regional development', ['Regional imbalance: Vidarbha and Marathwada', 'Urbanisation: Mumbai, Pune and MMR', 'Industrial corridors and infrastructure']),
])
LANG_MR = [('MR', 'Marathi (qualifying)', [T('MR.LANG', 'Marathi', ['Comprehension (उतारा)', 'Precis (सारांश)', 'Usage and vocabulary', 'Short essay (निबंध)', 'Translation: English to Marathi'])])]
LANG_EN_Q = [('EN', 'English (qualifying)', [T('EN.LANG', 'English', ['Comprehension', 'Precis', 'Usage and vocabulary', 'Short essay'])])]
MPSC_OPTIONALS = ['Agriculture', 'Animal Husbandry and Veterinary Science', 'Anthropology', 'Botany', 'Chemistry', 'Civil Engineering',
                  'Commerce and Accountancy', 'Economics', 'Electrical Engineering', 'Geography', 'Geology', 'History', 'Law', 'Management',
                  'Marathi Literature', 'Mathematics', 'Mechanical Engineering', 'Medical Science', 'Philosophy', 'Physics',
                  'Political Science and International Relations', 'Psychology', 'Public Administration', 'Sociology', 'Statistics', 'Zoology']
OPTIONAL_SUBJECTS = [(f'{i + 1:02d}', name, [(f'{i + 1:02d}.P1', f'{name}: Paper I', None, []), (f'{i + 1:02d}.P2', f'{name}: Paper II', None, [])])
                     for i, name in enumerate(MPSC_OPTIONALS)]

MPSC = ('mpsc_rajyaseva_v1', 'MPSC Rajyaseva (Maharashtra State Services)', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('GS', 'Paper I: General Studies', P, ['PRE_GS'], upsc_paper('PRE', 'GS') + [MH_PRE]),
        ('CSAT', 'Paper II: CSAT (qualifying 33%)', P, ['CSAT'], csat()),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('MR', 'Marathi (qualifying)', M, ['MARATHI'], LANG_MR),
        ('EN', 'English (qualifying)', M, ['ENGLISH'], LANG_EN_Q),
        ('ESS', 'Essay', M, ['ESSAY'], [('ESS', 'Essay', [T('ESS.A', 'Section A', ['Social, cultural and political themes']), T('ESS.B', 'Section B', ['Economy, science, environment and development themes'])])]),
        ('GS1', 'GS I: Heritage, history, society and geography', M, ['GS1'], upsc_paper('MAI', 'GS1') + [MH_GS1]),
        ('GS2', 'GS II: Polity, governance and international relations', M, ['GS2'], upsc_paper('MAI', 'GS2')),
        ('GS3', 'GS III: Economy, technology, environment and security', M, ['GS3'], upsc_paper('MAI', 'GS3') + [MH_GS3]),
        ('GS4', 'GS IV: Ethics, integrity and aptitude', M, ['GS4'], upsc_paper('MAI', 'GS4')),
        ('OPT', 'Optional subject (Papers I and II)', M, ['OPT1', 'OPT2'], OPTIONAL_SUBJECTS),
    ]),
    ('INT', 'Interview', I, [], []),
])


def main():
    print('-- Preparation tracker: UP PCS-J, MP Civil Judge and MPSC Rajyaseva templates v1. Generated by supabase/seed/judiciary_mpsc_v1.py. Safe to rerun.')
    print('begin;')
    for (code, name, tree), exam in ((UPPCSJ, 'other'), (MPCJ, 'other'), (MPSC, 'state_psc')):
        sql, *_ = emit(code, name, tree, optionals=False, ncert_path=False, exam=exam)
        print(sql)
        print()
    print('commit;')


if __name__ == '__main__':
    main()
