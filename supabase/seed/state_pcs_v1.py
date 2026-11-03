"""State civil services templates: UPPCS, BPSC and JKPSC CCE (v1).

Each tree follows the commission's current notified scheme (papers and marks) and its published
syllabus headings. Where a state paper covers the same ground as UPSC (national history, polity,
economy, CSAT, the UPSC-pattern Mains GS papers), the UPSC topics and their starter subtopics are
reused, so a student moving between exams keeps the same units. State-specific areas (Uttar
Pradesh, Bihar, Jammu and Kashmir) get their own topics and subtopics, broken down the way standard
state-PCS preparation and coaching syllabus guides split them. Titles are our own short wording.

PYQ frequency is left empty on purpose: we have not measured it for these exams and will not guess.

Run: python3 supabase/seed/state_pcs_v1.py > supabase/migrations/202611080002_prep_state_templates.sql
"""
import copy
import upsc_cse_v1 as U
from upsc_cse_v1_subtopics import S

P, M, I = ['prelims'], ['mains'], ['interview']


def upsc_paper(stage, paper):
    """Subjects of a UPSC paper, with topics keeping their UPSC codes (so subtopics carry over)."""
    for sc, _, _, _, papers in U.TREE:
        if sc != stage: continue
        for pc, _, _, _, subjects in papers:
            if pc == paper:
                return [(jc, jt, [(t[0], t[1], None, f'{sc}.{pc}.{t[0]}') for t in topics]) for jc, jt, topics in subjects]
    raise KeyError(stage + '.' + paper)


def subjects_of(stage, paper, keep):
    return [s for s in upsc_paper(stage, paper) if s[0] in keep]


def csat(keep=None):
    s = upsc_paper('PRE', 'CSAT')[0]
    return [(s[0], s[1], [t for t in s[2] if keep is None or t[0] in keep])]


GEN_ENGLISH_X = ('ENG', 'General English (up to Class X)', [('CSAT.ENG', 'General English', None, [
    'Comprehension of short passages', 'Grammar: tenses, articles, prepositions', 'Voice and narration',
    'Synonyms, antonyms and one-word substitution', 'Spotting errors and sentence improvement', 'Idioms and phrases'])])
GEN_HINDI_X = ('HIN', 'General Hindi (up to Class X)', [('CSAT.HIN', 'General Hindi', None, [
    'अपठित गद्यांश (unseen passage)', 'संधि और समास', 'तत्सम, तद्भव और देशज शब्द', 'पर्यायवाची और विलोम शब्द',
    'वाक्य शुद्धि और वर्तनी', 'मुहावरे और लोकोक्तियाँ'])])

HINDI_MAINS = [
    ('HIN.PAS', 'Unseen passage and its summary (अपठित गद्यांश)', None, ['Reading for the central idea', 'Summary (सारांश) writing', 'Answering questions from the passage', 'Giving a suitable title']),
    ('HIN.LET', 'Official letters and drafting (पत्र लेखन)', None, ['Official letter (शासकीय पत्र)', 'Semi-official letter (अर्धशासकीय पत्र)', 'Office order, circular and notification', 'Office memorandum and endorsement', 'Application and complaint letters']),
    ('HIN.WRD', 'Vocabulary and usage (शब्द ज्ञान)', None, ['उपसर्ग और प्रत्यय', 'विलोम और पर्यायवाची शब्द', 'वाक्यांश के लिए एक शब्द', 'वर्तनी और वाक्य शुद्धि', 'तत्सम-तद्भव और अनेकार्थी शब्द']),
    ('HIN.IDI', 'Idioms and proverbs (मुहावरे और लोकोक्तियाँ)', None, ['Common मुहावरे with meaning and use', 'Common लोकोक्तियाँ with meaning and use']),
]


def interview():
    return ('INT', 'Interview / personality test', I, [], [])


def ncert():
    return copy.deepcopy(U.NCERT)


# ------------------------------------------------------------------------------------------- UPPCS
UP_PRE = ('UP', 'Uttar Pradesh: special knowledge', [
    ('UP.HIS', 'History and culture of Uttar Pradesh', None, ['Ancient UP: Mahajanapadas, Kosala, Kashi, Panchala', 'Medieval UP: Delhi Sultanate, Jaunpur Sharqi kingdom, Mughals', 'UP in 1857 and the freedom struggle', 'Archaeological and heritage sites of UP', 'Fairs, festivals and Kumbh', 'Folk music, dance, art and crafts (Kathak, Chikankari, Banarasi)', 'Literature and personalities of UP']),
    ('UP.GEO', 'Geography of Uttar Pradesh', None, ['Location, physiography and regions', 'Rivers and drainage', 'Climate, soils and natural vegetation', 'Forests, wildlife sanctuaries and national parks', 'Minerals and energy resources', 'Agriculture and cropping pattern', 'Population, census data and urbanisation']),
    ('UP.ECO', 'Economy of Uttar Pradesh', None, ['State budget and economic survey highlights', 'Agriculture, horticulture and dairy', 'Industry, MSMEs and One District One Product', 'Infrastructure: expressways, airports, power', 'State welfare and development schemes']),
    ('UP.POL', 'Polity and administration of Uttar Pradesh', None, ['Governor, Chief Minister and state legislature', 'High Court and subordinate judiciary', 'Divisions, districts and revenue administration', 'Panchayati Raj and urban local bodies in UP', 'State commissions and bodies (UPPSC, State Election Commission)']),
    ('UP.CA', 'Uttar Pradesh current affairs', None, ['State government decisions and policies', 'Awards, events and personalities', 'Rankings and indices featuring UP']),
])

UP_GS5 = [('UP5', 'Uttar Pradesh: history, polity and administration', [
    ('GS5.HIS', 'History, civilisation and culture of UP', None, ['Prehistoric and ancient UP', 'Medieval kingdoms and the Sharqi dynasty', 'Contribution of UP to the freedom struggle (1857 to 1947)', 'Architecture, painting and heritage sites', 'Folk traditions, dialects and literature', 'Music, dance and handicrafts']),
    ('GS5.POL', 'Political system of UP', None, ['Governor, Chief Minister and Council of Ministers', 'Legislative Assembly and Council', 'High Court and judiciary', 'Special constitutional and statutory bodies of the state']),
    ('GS5.ADM', 'Public administration and revenue', None, ['State secretariat and directorates', 'Divisional and district administration', 'Revenue system, land records and tehsil', 'Land reforms in UP and their impact']),
    ('GS5.LOC', 'Local self-government in UP', None, ['Panchayati Raj structure and finances', 'Urban local bodies and municipal finance', 'Decentralisation challenges']),
    ('GS5.GOV', 'Good governance and e-governance', None, ['Citizen charters and public service guarantee', 'E-governance initiatives (e-District, Jansunwai)', 'Lokayukta, transparency and anti-corruption']),
    ('GS5.LAW', 'Law and order and civil defence', None, ['Police organisation and police reforms', 'Law and order challenges', 'Civil defence and disaster response']),
    ('GS5.SOC', 'Education, health and social welfare', None, ['School and higher education in UP', 'Health infrastructure and indicators', 'Welfare of women, children, SC/ST and minorities', 'Role of NGOs and self-help groups']),
    ('GS5.CUR', 'Current affairs and issues of UP', None, ['Recent state policies and acts', 'Tourism circuits and heritage promotion', 'Contemporary social issues']),
])]

UP_GS6 = [('UP6', 'Uttar Pradesh: economy, geography and environment', [
    ('GS6.ECO', 'Economy of UP', None, ['Structure of the state economy and GSDP', 'State budget and fiscal position', 'Trade, exports and investment summits', 'Economic survey highlights']),
    ('GS6.IND', 'Industry and MSMEs', None, ['Industrial policy and corridors', 'One District One Product (ODOP)', 'MSMEs and handloom sector', 'Ease of doing business reforms']),
    ('GS6.AGR', 'Agriculture and allied sectors', None, ['Agro-climatic zones and cropping pattern', 'Irrigation and water management', 'Horticulture and food processing', 'Animal husbandry, dairy and fisheries', 'Agricultural marketing and farmer schemes']),
    ('GS6.GEO', 'Geography of UP', None, ['Physiography and regions', 'Rivers, canals and drainage', 'Climate and soils', 'Mineral and energy resources', 'Demography, census and human development indices']),
    ('GS6.ENV', 'Environment and natural resources', None, ['Forests, wildlife and protected areas', 'Pollution: air, water (Ganga) and land', 'Climate change action plan and renewable energy', 'Eco-tourism']),
    ('GS6.INF', 'Infrastructure and development', None, ['Expressways, roads and railways', 'Airports and connectivity', 'Power sector', 'Urban development and smart cities', 'Public-private partnership projects']),
    ('GS6.SCH', 'Schemes and development programmes of UP', None, ['Rural development and employment schemes', 'Social security and welfare schemes', 'Skill development and start-up policy']),
])]

UPPCS = ('uppcs_v1', 'UPPCS (UPPSC Combined State/Upper Subordinate Services)', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('GS', 'Paper I: General Studies', P, ['PRE_GS'], upsc_paper('PRE', 'GS') + [UP_PRE]),
        ('CSAT', 'Paper II: General Studies II (CSAT, qualifying 33%)', P, ['CSAT'], csat() + [GEN_ENGLISH_X, GEN_HINDI_X]),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('HIN', 'General Hindi', M, ['HINDI'], [('HIN', 'General Hindi', HINDI_MAINS)]),
        ('ESS', 'Essay', M, ['ESSAY'], [('ESS', 'Essay', [
            ('ESS.LIT', 'Section A: literature, culture, social and political sphere', None, ['Literature and culture', 'Social sphere', 'Political sphere']),
            ('ESS.SCI', 'Section B: science, environment, economy and agriculture', None, ['Science, environment and technology', 'Economic sphere', 'Agriculture, industry and trade']),
            ('ESS.NAT', 'Section C: national and international events, disasters, development', None, ['National and international events', 'Natural calamities and disaster management', 'National development programmes and projects']),
        ])]),
        ('GS1', 'GS I: History, culture, society and geography', M, ['GS1'], upsc_paper('MAI', 'GS1')),
        ('GS2', 'GS II: Polity, governance, social justice and international relations', M, ['GS2'], upsc_paper('MAI', 'GS2')),
        ('GS3', 'GS III: Economy, science and technology, environment and security', M, ['GS3'], upsc_paper('MAI', 'GS3')),
        ('GS4', 'GS IV: Ethics, integrity and aptitude', M, ['GS4'], upsc_paper('MAI', 'GS4')),
        ('GS5', 'GS V: Uttar Pradesh specific (history, polity, administration)', M, ['GS5'], UP_GS5),
        ('GS6', 'GS VI: Uttar Pradesh specific (economy, geography, environment)', M, ['GS6'], UP_GS6),
    ]),
    interview(),
])

# -------------------------------------------------------------------------------------------- BPSC
BIHAR_HIS = ('BH.HIS', 'History of Bihar', None, ['Ancient Bihar: Magadha, Mauryas and Guptas', 'Nalanda, Vikramshila and centres of learning', 'Buddhism and Jainism in Bihar', 'Medieval Bihar: Sher Shah Suri and the Afghans', 'Bihar under British rule', 'Art, culture and festivals of Bihar (Madhubani, Chhath)'])
BIHAR_MOV = ('BH.MOV', "Bihar's role in the national movement", None, ['1857 in Bihar: Kunwar Singh', 'Champaran Satyagraha', 'Non-Cooperation and Civil Disobedience in Bihar', 'Quit India movement in Bihar', 'Tribal and peasant movements (Santhal, Birsa Munda, Kisan Sabha)', 'Personalities: Rajendra Prasad, Jayaprakash Narayan and others'])
BIHAR_GEO = ('BH.GEO', 'Geography of Bihar', None, ['Location and physiographic divisions', 'Rivers and the flood problem', 'Climate and soils', 'Agriculture and cropping pattern', 'Minerals, energy and industries', 'Population and urbanisation'])
BIHAR_ECO = ('BH.ECO', 'Economy of Bihar', None, ['Structure of the Bihar economy and the economic survey', 'Agriculture, agriculture road maps and allied sectors', 'Industry and investment policy', 'Poverty, migration and employment', 'State schemes (Saat Nischay, Jeevika)'])
BIHAR_POL = ('BH.POL', 'Polity and administration of Bihar', None, ['Governor, Chief Minister and legislature', 'Panchayati Raj in Bihar and reservation for women', 'District and block administration', 'State commissions and bodies'])
BIHAR_CA = ('BH.CA', 'Bihar current affairs', None, ['State government decisions and policies', 'Events, awards and personalities', 'Bihar in national indices and reports'])

BPSC = ('bpsc_v1', 'BPSC Combined Competitive Examination', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('GS', 'General Studies (single paper)', P, ['PRE_GS'], [
            ('SCI', 'General science', [('SCI.GEN', 'General science', None, 'PRE.GS.SCI.GEN'), ('SCI.TEC', 'Science and technology developments', None, 'PRE.GS.SCI.TEC')]),
            ('CA', 'Current events of national and international importance', [('CA.NAT', 'National current events', None, 'PRE.GS.CA.NAT'), ('CA.INT', 'International current events', None, 'PRE.GS.CA.INT'), BIHAR_CA]),
            ('HIS', 'History of India and Bihar', [('HIS.ANC', 'Ancient India', None, 'PRE.GS.HIS.ANC'), ('HIS.MED', 'Medieval India', None, 'PRE.GS.HIS.MED'), ('HIS.ART', 'Art and culture', None, 'PRE.GS.HIS.ART'), BIHAR_HIS]),
            ('MOV', 'Indian national movement and the role of Bihar', [('HIS.MOD', 'Modern India and the national movement', None, 'PRE.GS.HIS.MOD'), BIHAR_MOV]),
            ('GEO', 'Geography of India and Bihar', [('GEO.PHY', 'Physical geography', None, 'PRE.GS.GEO.PHY'), ('GEO.IND', 'Geography of India', None, 'PRE.GS.GEO.IND'), ('GEO.WLD', 'World geography and mapping', None, 'PRE.GS.GEO.WLD'), BIHAR_GEO]),
            ('POL', 'Indian polity and economy', [('POL.CON', 'Constitution: making, features and amendments', None, 'PRE.GS.POL.CON'), ('POL.SYS', 'Political system: Union, states and Parliament', None, 'PRE.GS.POL.SYS'), ('POL.PRI', 'Panchayati Raj and local government', None, 'PRE.GS.POL.PRI'), BIHAR_POL, ('ECO.MAC', 'Indian economy', None, 'PRE.GS.ECO.MAC'), ('ECO.PLN', 'Economic planning and development since independence', None, ['Five-year plans and NITI Aayog', 'Agriculture and land reforms after independence', 'Industrial development and reforms']), BIHAR_ECO]),
            ('ENV', 'Environment and ecology', [('ENV.ECO', 'Ecology and ecosystems', None, 'PRE.GS.ENV.ECO'), ('ENV.BIO', 'Biodiversity and conservation', None, 'PRE.GS.ENV.BIO'), ('ENV.CC', 'Climate change', None, 'PRE.GS.ENV.CC')]),
            ('GMA', 'General mental ability', [('GMA.LR', 'Logical reasoning', None, 'PRE.CSAT.CSAT.LR'), ('GMA.MA', 'Mental ability and series', None, 'PRE.CSAT.CSAT.MA'), ('GMA.NUM', 'Basic numeracy', None, 'PRE.CSAT.CSAT.NUM'), ('GMA.DI', 'Data interpretation', None, 'PRE.CSAT.CSAT.DI')]),
        ]),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('HIN', 'General Hindi (qualifying)', M, ['HINDI'], [('HIN', 'General Hindi', [
            ('HIN.ESS', 'Essay in Hindi (निबंध)', None, ['Structure of a Hindi essay', 'Social and current topics practice']),
            ('HIN.GRM', 'Grammar (व्याकरण)', None, ['संधि, समास और कारक', 'उपसर्ग, प्रत्यय और शब्द भेद', 'वाक्य शुद्धि और वाक्य रचना', 'मुहावरे और लोकोक्तियाँ']),
            ('HIN.PRE', 'Précis and comprehension (संक्षेपण और अपठित)', None, ['संक्षेपण (précis) writing', 'अपठित गद्यांश']),
        ])]),
        ('ESS', 'Essay', M, ['ESSAY'], [('ESS', 'Essay', [
            ('ESS.PHI', 'Philosophical and abstract essays', None, 'MAI.ESS.ESS.PHI'), ('ESS.SOC', 'Social and governance essays', None, 'MAI.ESS.ESS.SOC'), ('ESS.ECO', 'Economy, science and environment essays', None, 'MAI.ESS.ESS.ECO'),
            ('ESS.BH', 'Bihar-focused essays', None, ['Development and migration in Bihar', 'Floods, agriculture and rural Bihar', 'Heritage, education and culture of Bihar']),
        ])]),
        ('GS1', 'GS Paper I', M, ['GS1'], [
            ('HIS', 'Modern history of India and Indian culture', [('GS1.MOD', 'Modern Indian history from the mid-18th century', None, 'MAI.GS1.GS1.MOD'), ('GS1.FS', 'The freedom struggle: stages and contributors', None, 'MAI.GS1.GS1.FS'), ('GS1.ART', 'Indian culture: art, literature and architecture', None, 'MAI.GS1.GS1.ART'), ('BH.MOV', "Bihar's role in the freedom struggle", None, BIHAR_MOV[3]), ('BH.HIS', 'Bihar history and culture', None, BIHAR_HIS[3])]),
            ('CA', 'Current events of national and international importance', [('CA.NAT', 'National current events', None, 'PRE.GS.CA.NAT'), ('CA.INT', 'International current events', None, 'PRE.GS.CA.INT'), BIHAR_CA]),
            ('STA', 'Statistical analysis, graphs and diagrams', [('STA.DI', 'Statistics and data interpretation', None, ['Mean, median, mode and averages', 'Percentages, ratios and growth rates', 'Tables, bar and pie charts, line graphs', 'Drawing conclusions from data'])]),
        ]),
        ('GS2', 'GS Paper II', M, ['GS2'], [
            ('POL', 'Indian polity', [('GS2.CON', 'Constitution: evolution, features, amendments and basic structure', None, 'MAI.GS2.GS2.CON'), ('GS2.FED', 'Union and states: federal structure and devolution', None, 'MAI.GS2.GS2.FED'), ('GS2.PAR', 'Parliament and state legislatures', None, 'MAI.GS2.GS2.PAR'), ('GS2.GOV', 'Governance, transparency and accountability', None, 'MAI.GS2.GS2.GOV'), BIHAR_POL]),
            ('ECO', 'Indian economy and geography of India', [('GS3.PLAN', 'Planning, growth and employment', None, 'MAI.GS3.GS3.PLAN'), ('GS3.BUD', 'Government budgeting', None, 'MAI.GS3.GS3.BUD'), ('GS3.CROP', 'Agriculture, irrigation and food security', None, 'MAI.GS3.GS3.CROP'), ('GEO.IND', 'Geography of India', None, 'PRE.GS.GEO.IND'), BIHAR_ECO, BIHAR_GEO]),
            ('ST', 'Role and impact of science and technology in India and Bihar', [('GS3.ST', 'Science and technology developments and applications', None, 'MAI.GS3.GS3.ST'), ('GS3.AWR', 'IT, space, biotech and IPR', None, 'MAI.GS3.GS3.AWR'), ('BH.ST', 'Science and technology in Bihar', None, ['Agriculture technology and research in Bihar', 'Energy and digital initiatives in Bihar'])]),
        ]),
        ('OPT', 'Optional subject (qualifying MCQ)', M, ['OPT'], [('OPT', 'Optional subject', [('OPT.SUB', 'Your optional subject (qualifying)', None, [])])]),
    ]),
    interview(),
])

# ------------------------------------------------------------------------------------------- JKPSC
JK_HIS = ('JK.HIS', 'History and culture of Jammu and Kashmir', None, ['Ancient Kashmir: Rajatarangini and early dynasties', 'Medieval Kashmir: Sultanate, Zain-ul-Abidin', 'Mughal, Afghan and Sikh rule', 'Dogra rule and the princely state', 'Political movements and accession (1931 to 1947)', 'Art, crafts, languages and literature (Kashmiri, Dogri)', 'Sufi and Rishi traditions, shrines and festivals'])
JK_GEO = ('JK.GEO', 'Geography of Jammu and Kashmir', None, ['Physiographic divisions: Jammu, Kashmir valley, Pir Panjal', 'Rivers, lakes and glaciers', 'Climate and natural vegetation', 'Agriculture, horticulture and saffron', 'Wildlife and protected areas', 'Natural hazards: earthquakes, floods, avalanches'])
JK_ECO = ('JK.ECO', 'Economy of Jammu and Kashmir', None, ['Structure of the economy and budget', 'Horticulture, handicrafts and handloom', 'Tourism', 'Hydropower and industry', 'UT development schemes and industrial policy'])
JK_GOV = ('JK.GOV', 'Polity and governance of Jammu and Kashmir', None, ['Constitutional history: Article 370 and its abrogation', 'J&K Reorganisation Act, 2019', 'Lieutenant Governor, legislature and administration of the UT', 'Panchayati Raj and local bodies in J&K', 'Delimitation and elections'])
JK_CA = ('JK.CA', 'Jammu and Kashmir current affairs', None, ['UT government decisions and schemes', 'Events, awards and personalities'])

def with_extra(subjects, extra):
    return subjects + [extra]

JKPSC = ('jkpsc_cce_v1', 'JKPSC Combined Competitive Examination', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('GS', 'Paper I: General Studies', P, ['PRE_GS'], upsc_paper('PRE', 'GS') + [('JK', 'Jammu and Kashmir: special knowledge', [JK_HIS, JK_GEO, JK_ECO, JK_GOV, JK_CA])]),
        ('CSAT', 'Paper II: General Studies II (CSAT, qualifying 33%)', P, ['CSAT'], csat()),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('ENG', 'General English (qualifying)', M, ['ENGLISH'], [('ENG', 'General English', [
            ('ENG.ESS', 'Essay and comprehension', None, ['Short essay', 'Comprehension of given passages', 'Précis writing']),
            ('ENG.GRM', 'Usage and vocabulary', None, ['Grammar and sentence correction', 'Vocabulary and word usage', 'Letter and report writing']),
        ])]),
        ('ESS', 'Essay', M, ['ESSAY'], upsc_paper('MAI', 'ESS')),
        ('GS1', 'GS I: Heritage, culture, history, geography and society', M, ['GS1'], with_extra(upsc_paper('MAI', 'GS1'), ('JK', 'Jammu and Kashmir', [('JK.HIS', JK_HIS[1], None, JK_HIS[3]), ('JK.GEO', JK_GEO[1], None, JK_GEO[3])]))),
        ('GS2', 'GS II: Governance, constitution, polity, social justice and IR', M, ['GS2'], with_extra(upsc_paper('MAI', 'GS2'), ('JK', 'Jammu and Kashmir', [JK_GOV]))),
        ('GS3', 'GS III: Technology, economy, environment, security and disaster management', M, ['GS3'], with_extra(upsc_paper('MAI', 'GS3'), ('JK', 'Jammu and Kashmir', [JK_ECO, ('JK.SEC', 'Security and disaster management in J&K', None, ['Cross-border terrorism and infiltration', 'Border management and the Line of Control', 'Disaster risks and preparedness in J&K'])]))),
        ('GS4', 'GS IV: Ethics, integrity and aptitude', M, ['GS4'], upsc_paper('MAI', 'GS4')),
        ('OPT', 'Optional subject: Papers I and II', M, ['OPT1', 'OPT2'], []),
    ]),
    interview(),
])


def emit(code, name, tree, optionals):
    def q(s): return "'" + s.replace("'", "''") + "'"
    def arr(xs): return "'{" + ",".join(xs) + "}'"
    rows, subs = [], []
    for si, (sc, st, sst, sp, papers) in enumerate(tree):
        rows.append((sc, None, 'stage', st, sst, sp, si))
        for pi, (pc, pt, pst, pp, subjects) in enumerate(papers):
            pcode = f'{sc}.{pc}'
            rows.append((pcode, sc, 'paper', pt, pst, pp, pi))
            for ji, (jc, jt, topics) in enumerate(subjects):
                jcode = f'{pcode}.{jc}'
                rows.append((jcode, pcode, 'subject', jt, pst, pp, ji))
                for ti, (tc, tt, _pyq, src) in enumerate(topics):
                    tcode = f'{pcode}.{tc}'
                    rows.append((tcode, jcode, 'topic', tt, pst, pp, ti))
                    items = S.get(src, []) if isinstance(src, str) else src
                    if isinstance(src, str) and src not in S: raise KeyError(f'{code}: no UPSC subtopics for {src}')
                    subs += [(f'{tcode}.{k + 1:02d}', tcode, s, k) for k, s in enumerate(items)]
    if optionals:
        for oi, oname in enumerate(U.OPTIONALS):
            ocode = f'MAI.OPT.{oi + 1:02d}'
            rows.append((ocode, 'MAI.OPT', 'subject', oname, M, ['OPT1', 'OPT2'], oi))
            rows.append((ocode + '.P1', ocode, 'topic', f'{oname}: Paper I', M, ['OPT1'], 0))
            rows.append((ocode + '.P2', ocode, 'topic', f'{oname}: Paper II', M, ['OPT2'], 1))
    rows.append(('NCERT', None, 'stage', 'NCERT foundation path', P + M, [], 9))
    for gi, (cls, books) in enumerate(ncert()):
        for bi, book in enumerate(books):
            rows.append((f'NCERT.C{cls}.{bi + 1:02d}', 'NCERT', 'ncert_book', f'Class {cls}: {book}', P + M, [], gi * 20 + bi))
    for c in [r[0] for r in rows] + [s[0] for s in subs]:
        assert sum(1 for r in rows if r[0] == c) + sum(1 for s in subs if s[0] == c) == 1, f'duplicate code {c}'

    topics = sum(1 for r in rows if r[2] == 'topic')
    out = [f'-- {name}: {topics} topics, {len(subs)} subtopics.',
           f"insert into public.prep_exam_templates (code, name, exam, version) values ({q(code)}, {q(name)}, 'state_psc', 1) on conflict (code) do update set name = excluded.name;",
           f'with t as (select id from public.prep_exam_templates where code = {q(code)})',
           'insert into public.prep_syllabus_nodes (template_id, code, kind, title, stages, papers, sort) select t.id, v.code, v.kind, v.title, v.stages::text[], v.papers::text[], v.sort from t, (values',
           ',\n'.join(f'  ({q(c)}, {q(k)}, {q(ti)}, {arr(s)}, {arr(p)}, {so})' for c, _, k, ti, s, p, so in rows),
           ') as v(code, kind, title, stages, papers, sort)',
           'on conflict (template_id, code) do update set title = excluded.title, kind = excluded.kind, stages = excluded.stages, papers = excluded.papers, sort = excluded.sort;',
           'update public.prep_syllabus_nodes c set parent_id = p.id from public.prep_syllabus_nodes p, (values',
           ',\n'.join(f'  ({q(c)}, {q(pc)})' for c, pc, *_ in rows if pc),
           f") as v(code, parent_code), public.prep_exam_templates t where t.code = {q(code)} and c.template_id = t.id and p.template_id = t.id and c.code = v.code and p.code = v.parent_code and c.parent_id is distinct from p.id;"]
    if subs:
        out += [f'with t as (select id from public.prep_exam_templates where code = {q(code)})',
                'insert into public.prep_syllabus_nodes (template_id, parent_id, kind, code, title, stages, papers, sort)',
                "select t.id, p.id, 'subtopic', v.code, v.title, p.stages, p.papers, v.sort from t, (values",
                ',\n'.join(f'  ({q(c)}, {q(p)}, {q(ti)}, {so})' for c, p, ti, so in subs),
                ') as v(code, parent_code, title, sort)',
                'join public.prep_syllabus_nodes p on p.code = v.parent_code where p.template_id = t.id',
                'on conflict (template_id, code) do update set title = excluded.title, parent_id = excluded.parent_id, sort = excluded.sort;']
    return '\n'.join(out), topics, len(subs)


def main():
    print('-- Preparation tracker: state civil services templates (UPPCS, BPSC, JKPSC CCE), v1.')
    print('-- Generated by supabase/seed/state_pcs_v1.py. Safe to rerun: rows are matched on (template, code).')
    print('-- Shared areas reuse the UPSC topics and starter subtopics; state-specific areas have their own.')
    print('begin;')
    for code, name, tree in (UPPCS, BPSC, JKPSC):
        sql, *_ = emit(code, name, tree, optionals=(code == 'jkpsc_cce_v1'))
        print(sql)
        print()
    print('commit;')


if __name__ == '__main__':
    main()
