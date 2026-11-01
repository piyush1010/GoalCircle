"""Generates supabase/migrations/202611070002_prep_upsc_template.sql from the official UPSC CSE syllabus
(Civil Services Examination notification), at notification level: stages -> papers -> subjects -> topics.
Run: python3 supabase/seed/upsc_cse_v1.py > supabase/migrations/202611070002_prep_upsc_template.sql"""

# (code, title, stages, papers, children) ; topics are (code, title[, pyq_frequency 0-5])
P, M = ['prelims'], ['mains']
TREE = [
 ('PRE', 'Preliminary Examination', P, [], [
  ('GS', 'General Studies Paper I', P, ['PRE_GS'], [
   ('CA', 'Current events of national and international importance', [('CA.NAT', 'National current events', 5), ('CA.INT', 'International current events', 4)]),
   ('HIS', 'History of India and Indian National Movement', [('HIS.ANC', 'Ancient India', 3), ('HIS.MED', 'Medieval India', 2), ('HIS.ART', 'Art and culture', 4), ('HIS.MOD', 'Modern India and the national movement', 5)]),
   ('GEO', 'Indian and World Geography', [('GEO.PHY', 'Physical geography', 4), ('GEO.IND', 'Geography of India', 4), ('GEO.SOC', 'Social and economic geography', 3), ('GEO.WLD', 'World geography and mapping', 3)]),
   ('POL', 'Indian Polity and Governance', [('POL.CON', 'Constitution: making, features and amendments', 4), ('POL.SYS', 'Political system: Union, states and Parliament', 5), ('POL.PRI', 'Panchayati Raj and local government', 3), ('POL.PUB', 'Public policy', 2), ('POL.RTS', 'Rights issues', 4)]),
   ('ECO', 'Economic and Social Development', [('ECO.SD', 'Sustainable development', 3), ('ECO.POV', 'Poverty and inclusion', 3), ('ECO.DEM', 'Demographics', 2), ('ECO.SSI', 'Social sector initiatives', 3), ('ECO.MAC', 'Macroeconomics: growth, money, banking, fiscal and external sector', 5)]),
   ('ENV', 'Environmental ecology, biodiversity and climate change', [('ENV.ECO', 'Ecology and ecosystems', 4), ('ENV.BIO', 'Biodiversity and conservation', 5), ('ENV.CC', 'Climate change', 4)]),
   ('SCI', 'General Science', [('SCI.GEN', 'General science', 3), ('SCI.TEC', 'Science and technology developments', 4)]),
  ]),
  ('CSAT', 'General Studies Paper II (CSAT)', P, ['CSAT'], [
   ('CSAT', 'CSAT', [('CSAT.COMP', 'Comprehension', 5), ('CSAT.INT', 'Interpersonal and communication skills', 1), ('CSAT.LR', 'Logical reasoning and analytical ability', 5), ('CSAT.DM', 'Decision making and problem solving', 2), ('CSAT.MA', 'General mental ability', 4), ('CSAT.NUM', 'Basic numeracy (Class X level)', 5), ('CSAT.DI', 'Data interpretation (Class X level)', 4)]),
  ]),
 ]),
 ('MAI', 'Main Examination', M, [], [
  ('QL', 'Qualifying papers', M, ['QUAL_A', 'QUAL_B'], [
   ('LANG', 'Indian language and English (qualifying)', [('QL.A', 'Paper A: Indian language', None), ('QL.B', 'Paper B: English', None)]),
  ]),
  ('ESS', 'Paper I: Essay', M, ['ESSAY'], [
   ('ESS', 'Essay', [('ESS.PHI', 'Philosophical and abstract essays', 4), ('ESS.SOC', 'Social and governance essays', 4), ('ESS.ECO', 'Economy, science and environment essays', 3)]),
  ]),
  ('GS1', 'Paper II: GS I (Heritage, culture, history, geography, society)', M, ['GS1'], [
   ('ART', 'Indian culture', [('GS1.ART', 'Art forms, literature and architecture from ancient to modern times', 4)]),
   ('HIS', 'History', [('GS1.MOD', 'Modern Indian history from the mid-18th century', 4), ('GS1.FS', 'The freedom struggle: stages and contributors', 4), ('GS1.POST', 'Post-independence consolidation and reorganisation', 3), ('GS1.WH', 'World history from the 18th century', 3)]),
   ('SOC', 'Indian society', [('GS1.SOC', 'Salient features of Indian society and diversity', 3), ('GS1.WOM', 'Role of women and women\'s organisations', 4), ('GS1.POP', 'Population, poverty and developmental issues', 3), ('GS1.URB', 'Urbanisation: problems and remedies', 3), ('GS1.GLO', 'Effects of globalisation on Indian society', 3), ('GS1.SEC', 'Social empowerment, communalism, regionalism and secularism', 4)]),
   ('GEO', 'Geography', [('GS1.WPG', 'Salient features of world physical geography', 4), ('GS1.RES', 'Distribution of key natural resources', 3), ('GS1.IND', 'Factors for location of industries', 3), ('GS1.PHE', 'Geophysical phenomena: earthquakes, tsunami, volcanoes, cyclones', 4), ('GS1.GCH', 'Changes in geographical features, water bodies and ice caps', 3)]),
  ]),
  ('GS2', 'Paper III: GS II (Governance, constitution, polity, social justice, international relations)', M, ['GS2'], [
   ('POL', 'Constitution and polity', [('GS2.CON', 'Constitution: evolution, features, amendments and basic structure', 5), ('GS2.FED', 'Union and states: federal structure and devolution', 4), ('GS2.SOP', 'Separation of powers and dispute redressal', 3), ('GS2.CMP', 'Comparison with other constitutions', 2), ('GS2.PAR', 'Parliament and state legislatures', 4), ('GS2.EXE', 'Executive, judiciary, ministries and pressure groups', 4), ('GS2.RPA', 'Representation of People\'s Act', 3), ('GS2.CB', 'Constitutional bodies', 4), ('GS2.SB', 'Statutory, regulatory and quasi-judicial bodies', 4)]),
   ('GOV', 'Governance', [('GS2.POL', 'Government policies and interventions', 5), ('GS2.DEV', 'Development processes: NGOs, SHGs and civil society', 3), ('GS2.WEL', 'Welfare schemes for vulnerable sections', 4), ('GS2.HEA', 'Health, education and human resources', 4), ('GS2.POV', 'Poverty and hunger', 3), ('GS2.GOV', 'Governance, transparency, accountability and e-governance', 4), ('GS2.CS', 'Role of civil services in a democracy', 3)]),
   ('IR', 'International relations', [('GS2.NEI', 'India and its neighbourhood', 4), ('GS2.GRP', 'Bilateral, regional and global groupings', 4), ('GS2.POLD', 'Effect of other countries\' policies on India; diaspora', 3), ('GS2.INST', 'Important international institutions and agencies', 3)]),
  ]),
  ('GS3', 'Paper IV: GS III (Technology, economy, environment, biodiversity, security, disaster management)', M, ['GS3'], [
   ('ECO', 'Economy', [('GS3.PLAN', 'Planning, resource mobilisation, growth and employment', 4), ('GS3.INC', 'Inclusive growth', 3), ('GS3.BUD', 'Government budgeting', 4), ('GS3.CROP', 'Cropping patterns, irrigation and farm technology', 3), ('GS3.SUB', 'Farm subsidies, MSP, PDS and food security', 4), ('GS3.FPI', 'Food processing industries', 2), ('GS3.LAND', 'Land reforms', 2), ('GS3.LIB', 'Liberalisation and industrial policy', 3), ('GS3.INF', 'Infrastructure: energy, ports, roads, airports, railways', 4), ('GS3.INV', 'Investment models', 3)]),
   ('ST', 'Science and technology', [('GS3.ST', 'Science and technology developments and applications', 4), ('GS3.IND', 'Indian achievements and indigenisation', 3), ('GS3.AWR', 'Awareness: IT, space, computers, robotics, nanotech, biotech, IPR', 4)]),
   ('ENV', 'Environment and disaster management', [('GS3.ENV', 'Conservation, pollution, degradation and EIA', 5), ('GS3.DM', 'Disaster and disaster management', 4)]),
   ('SEC', 'Internal security', [('GS3.EXT', 'Development and the spread of extremism', 3), ('GS3.ISC', 'External state and non-state actors in internal security', 3), ('GS3.CYB', 'Communication networks, media, social networking and cyber security', 4), ('GS3.BOR', 'Border management, organised crime and terrorism', 3), ('GS3.AGN', 'Security forces and agencies and their mandate', 3)]),
  ]),
  ('GS4', 'Paper V: GS IV (Ethics, integrity and aptitude)', M, ['GS4'], [
   ('ETH', 'Ethics, integrity and aptitude', [('GS4.ETH', 'Ethics and human interface', 4), ('GS4.ATT', 'Attitude: content, structure and influence', 3), ('GS4.APT', 'Aptitude and foundational values for civil service', 4), ('GS4.EI', 'Emotional intelligence', 3), ('GS4.THK', 'Contributions of moral thinkers and philosophers', 4), ('GS4.PAV', 'Public and civil service values; ethics in public administration', 4), ('GS4.PRO', 'Probity in governance', 4), ('GS4.CASE', 'Case studies', 5)]),
  ]),
  ('OPT', 'Papers VI and VII: Optional subject', M, ['OPT1', 'OPT2'], []),
 ]),
 ('INT', 'Personality Test', ['interview'], [], []),
]

OPTIONALS = ['Agriculture', 'Animal Husbandry and Veterinary Science', 'Anthropology', 'Botany', 'Chemistry', 'Civil Engineering', 'Commerce and Accountancy', 'Economics', 'Electrical Engineering', 'Geography', 'Geology', 'History', 'Law', 'Management', 'Mathematics', 'Mechanical Engineering', 'Medical Science', 'Philosophy', 'Physics', 'Political Science and International Relations', 'Psychology', 'Public Administration', 'Sociology', 'Statistics', 'Zoology', 'Literature of a language']

NCERT = [  # Class 12 -> 5, as the configurable starting path
 (12, ['Indian History (Themes in Indian History I-III)', 'Fundamentals of Human Geography', 'India: People and Economy', 'Contemporary World Politics', 'Politics in India since Independence', 'Introductory Macroeconomics', 'Indian Economic Development', 'Indian Society', 'Biology', 'Fine Arts (An Introduction to Indian Art)']),
 (11, ['Themes in World History', 'Fundamentals of Physical Geography', 'India: Physical Environment', 'Indian Constitution at Work', 'Political Theory', 'Indian Economic Development', 'An Introduction to Indian Art', 'Biology']),
 (10, ['India and the Contemporary World II', 'Contemporary India II', 'Democratic Politics II', 'Understanding Economic Development', 'Science']),
 (9, ['India and the Contemporary World I', 'Contemporary India I', 'Democratic Politics I', 'Economics', 'Science']),
 (8, ['Our Pasts III', 'Resources and Development', 'Social and Political Life III', 'Science']),
 (7, ['Our Pasts II', 'Our Environment', 'Social and Political Life II', 'Science']),
 (6, ['Our Pasts I', 'The Earth: Our Habitat', 'Social and Political Life I', 'Science']),
 (5, ['Looking Around (EVS)']),
]

def q(s): return "'" + s.replace("'", "''") + "'"
def arr(xs): return "'{" + ",".join(xs) + "}'"

rows = []  # (code, parent_code, kind, title, stages, papers, sort, pyq)
for si, (sc, st, sst, sp, papers) in enumerate(TREE):
  rows.append((sc, None, 'stage', st, sst, sp, si, None))
  for pi, (pc, pt, pst, pp, subjects) in enumerate(papers):
    pcode = f'{sc}.{pc}'
    rows.append((pcode, sc, 'paper', pt, pst, pp, pi, None))
    for ji, (jc, jt, topics) in enumerate(subjects):
      jcode = f'{pcode}.{jc}'
      rows.append((jcode, pcode, 'subject', jt, pst, pp, ji, None))
      for ti, t in enumerate(topics):
        rows.append((f'{pcode}.{t[0]}', jcode, 'topic', t[1], pst, pp, ti, t[2]))
for oi, name in enumerate(OPTIONALS):
  ocode = f'MAI.OPT.{oi + 1:02d}'
  rows.append((ocode, 'MAI.OPT', 'subject', name, M, ['OPT1', 'OPT2'], oi, None))
  rows.append((ocode + '.P1', ocode, 'topic', f'{name}: Paper I', M, ['OPT1'], 0, None))
  rows.append((ocode + '.P2', ocode, 'topic', f'{name}: Paper II', M, ['OPT2'], 1, None))
rows.append(('NCERT', None, 'stage', 'NCERT foundation path', P + M, [], 9, None))
for gi, (cls, books) in enumerate(NCERT):
  for bi, book in enumerate(books):
    rows.append((f'NCERT.C{cls}.{bi + 1:02d}', 'NCERT', 'ncert_book', f'Class {cls}: {book}', P + M, [], gi * 20 + bi, None))

topics = sum(1 for r in rows if r[2] == 'topic')
print(f'-- Preparation tracker: UPSC CSE template v1, official-notification level ({topics} topics incl. optional papers).')
print('-- Generated by supabase/seed/upsc_cse_v1.py. Safe to rerun: rows are matched on (template, code).')
print("insert into public.prep_exam_templates (code, name, exam, version) values ('upsc_cse_v1', 'UPSC Civil Services', 'upsc', 1) on conflict (code) do nothing;")
print('with t as (select id from public.prep_exam_templates where code = \'upsc_cse_v1\')')
print('insert into public.prep_syllabus_nodes (template_id, code, kind, title, stages, papers, sort, pyq_frequency) select t.id, v.code, v.kind, v.title, v.stages::text[], v.papers::text[], v.sort, v.pyq from t, (values')
print(',\n'.join(f"  ({q(c)}, {q(k)}, {q(ti)}, {arr(s)}, {arr(p)}, {so}, {('null::smallint' if y is None else str(y))})" for c, _, k, ti, s, p, so, y in rows))
print(') as v(code, kind, title, stages, papers, sort, pyq)')
print('on conflict (template_id, code) do update set title = excluded.title, kind = excluded.kind, stages = excluded.stages, papers = excluded.papers, sort = excluded.sort, pyq_frequency = excluded.pyq_frequency;')
print('-- Link parents by code.')
print('update public.prep_syllabus_nodes c set parent_id = p.id from public.prep_syllabus_nodes p, (values')
print(',\n'.join(f'  ({q(c)}, {q(pc)})' for c, pc, *_ in rows if pc))
print(") as v(code, parent_code), public.prep_exam_templates t where t.code = 'upsc_cse_v1' and c.template_id = t.id and p.template_id = t.id and c.code = v.code and p.code = v.parent_code and c.parent_id is distinct from p.id;")
print()
print('-- Beta allowlist: the product owner. Add more testers by inserting into public.prep_beta.')
print("insert into public.prep_beta (user_id, note) select id, 'product owner' from auth.users where lower(email) = 'piyush.kaushik2@gmail.com' on conflict do nothing;")
