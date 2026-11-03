"""Official starter subtopics for the UPSC CSE v1 template.

Each list breaks one notification-level topic into the units that standard UPSC preparation
(NCERTs, standard reference books and coaching-institute syllabus breakdowns) treats as one study
sitting. Titles are our own short wording of public syllabus areas.
Run: python3 supabase/seed/upsc_cse_v1_subtopics.py > supabase/migrations/202611080001_prep_upsc_subtopics.sql
"""

S = {
# ---------------------------------------------------------------- Prelims GS: History
'PRE.GS.HIS.ANC': ['Prehistoric India: Palaeolithic, Mesolithic, Neolithic, Chalcolithic', 'Indus Valley Civilisation', 'Vedic age: early and later Vedic society, polity, religion', 'Mahajanapadas and the rise of Magadha', 'Buddhism and Jainism', 'Mauryan empire and Ashoka\'s dhamma', 'Post-Mauryan period: Shungas, Kushanas, Satavahanas, Indo-Greeks', 'Sangam age', 'Gupta empire', 'Harshavardhana and post-Gupta kingdoms', 'Early medieval south India: Pallavas, Chalukyas, Rashtrakutas', 'Ancient literature, science and inscriptions', 'Foreign travellers in ancient India'],
'PRE.GS.HIS.MED': ['Rajputs and early medieval north India', 'Cholas and south Indian kingdoms', 'Arab and Turkish invasions', 'Delhi Sultanate: dynasties and administration', 'Vijayanagara and Bahmani kingdoms', 'Bhakti movement', 'Sufi movement', 'Mughal empire: rulers and expansion', 'Mughal administration: mansabdari, revenue, economy', 'Marathas and Shivaji', 'Regional kingdoms after the Mughals', 'Medieval literature, travellers and sources'],
'PRE.GS.HIS.ART': ['Indian architecture: Harappan to early historic', 'Temple architecture: Nagara, Dravida, Vesara', 'Buddhist and Jain architecture: stupas, chaityas, viharas', 'Indo-Islamic architecture', 'Sculpture: schools of Gandhara, Mathura, Amaravati', 'Indian painting: murals and miniatures', 'Classical dance forms', 'Folk dances and folk art', 'Music: Hindustani and Carnatic', 'Theatre and puppetry', 'Indian languages, scripts and literature', 'Religion and philosophy: six schools, other traditions', 'Fairs, festivals and calendars', 'UNESCO heritage: sites and intangible heritage', 'Handicrafts and GI-tagged crafts'],
'PRE.GS.HIS.MOD': ['Advent of Europeans and the Carnatic wars', 'Expansion of British power: Bengal, Mysore, Marathas, Punjab', 'British economic policies and land revenue systems', 'Socio-religious reform movements', 'Peasant and tribal movements', 'Revolt of 1857', 'Rise of nationalism and the early Congress (Moderates)', 'Extremists, partition of Bengal and Swadeshi', 'Revolutionary nationalism', 'Gandhian era: Champaran to Non-Cooperation', 'Civil Disobedience and the Round Table Conferences', 'Quit India, INA and the road to independence', 'Constitutional developments 1773-1947', 'Governors-general and viceroys', 'Press, education and civil services under the British', 'Partition and independence'],
# ---------------------------------------------------------------- Prelims GS: Geography
'PRE.GS.GEO.PHY': ['The universe and the solar system', 'Earth\'s interior, rocks and minerals', 'Plate tectonics, continental drift, earthquakes and volcanoes', 'Landforms: fluvial, glacial, aeolian, coastal, karst', 'Atmosphere: composition and structure', 'Insolation, heat budget and temperature', 'Pressure belts and winds; jet streams', 'Humidity, clouds and precipitation', 'Air masses, fronts and cyclones', 'Climatic regions of the world', 'Oceans: relief, temperature and salinity', 'Ocean currents, tides and waves', 'Soils and natural vegetation (biomes)'],
'PRE.GS.GEO.IND': ['Location, extent and physiographic divisions', 'Himalayan and peninsular drainage systems', 'Indian climate and the monsoon', 'Soils of India', 'Natural vegetation and forests', 'Mineral and energy resources', 'Agriculture: crops, seasons, irrigation', 'Industries and industrial regions', 'Transport and communication', 'Population and settlements', 'Water resources and multipurpose projects', 'Islands, coasts and mapping of India'],
'PRE.GS.GEO.SOC': ['Population distribution and demographic transition', 'Migration', 'Human settlements and urbanisation', 'Economic activities: primary, secondary, tertiary', 'World agriculture and food crops', 'World resources: minerals and energy', 'World industries and industrial regions', 'International trade and transport routes'],
'PRE.GS.GEO.WLD': ['Continents: physical features', 'Major rivers, lakes and waterfalls', 'Mountains, plateaus and deserts', 'Straits, channels, gulfs and seas', 'Important islands and archipelagos', 'Countries, capitals and borders in the news', 'Places in the news: map practice'],
# ---------------------------------------------------------------- Prelims GS: Polity
'PRE.GS.POL.CON': ['Historical background and the making of the Constitution', 'Salient features of the Constitution', 'Preamble', 'Union and its territory; citizenship', 'Fundamental Rights', 'Directive Principles of State Policy', 'Fundamental Duties', 'Amendment of the Constitution', 'Basic structure doctrine', 'Schedules and important articles'],
'PRE.GS.POL.SYS': ['Parliamentary and federal system', 'Centre-state relations; inter-state relations', 'Emergency provisions', 'President and Vice-President', 'Prime Minister and Council of Ministers', 'Parliament: structure, sessions, procedures', 'Parliamentary committees', 'Governor, Chief Minister and state legislature', 'Supreme Court and High Courts', 'Subordinate courts, tribunals and judicial review', 'Union territories and special provisions (Schedules 5 and 6)', 'Elections and the Election Commission', 'Political parties and anti-defection law', 'Official language'],
'PRE.GS.POL.PRI': ['Evolution of local government in India', '73rd Amendment: Panchayati Raj', '74th Amendment: urban local bodies', 'PESA and local government in scheduled areas', 'State finance and election commissions for local bodies'],
'PRE.GS.POL.PUB': ['Policy making in India: NITI Aayog and ministries', 'Constitutional and statutory bodies (CAG, Finance Commission, UPSC, NHRC)', 'Regulatory bodies', 'Major government schemes and flagship missions', 'Good governance, RTI and citizen charters'],
'PRE.GS.POL.RTS': ['Human rights framework and NHRC', 'Rights of women and children', 'Rights of SCs, STs and minorities', 'Rights of persons with disabilities', 'Right to information and right to education', 'Consumer rights and legal aid', 'Landmark Supreme Court judgments on rights'],
# ---------------------------------------------------------------- Prelims GS: Economy
'PRE.GS.ECO.MAC': ['Basic concepts: GDP, GNP, national income', 'Growth versus development; measures of development', 'Inflation: types, measures and control', 'Money and the money supply', 'RBI and monetary policy', 'Banking system and NPAs', 'Financial markets: money and capital markets, SEBI', 'Insurance and pension sector', 'Government budget and fiscal policy', 'Taxation and GST', 'Fiscal deficit and public debt', 'Balance of payments and exchange rate', 'Foreign trade, WTO and trade agreements', 'Economic reforms since 1991', 'Planning and NITI Aayog'],
'PRE.GS.ECO.SD': ['Concept and SDGs', 'Green economy and circular economy', 'Sustainable agriculture', 'Energy transition and renewables'],
'PRE.GS.ECO.POV': ['Poverty: measurement and committees', 'Unemployment: types and measurement', 'Inclusion and financial inclusion', 'Inequality measures and the Human Development Index'],
'PRE.GS.ECO.DEM': ['Census: features and trends', 'Population policy and demographic dividend', 'Sex ratio, literacy and health indicators'],
'PRE.GS.ECO.SSI': ['Health sector schemes', 'Education sector schemes', 'Skill development and employment schemes', 'Social security and welfare schemes', 'Rural development schemes'],
# ---------------------------------------------------------------- Prelims GS: Environment and science
'PRE.GS.ENV.ECO': ['Ecology: concepts and levels of organisation', 'Ecosystem structure and functions', 'Food chains, food webs and ecological pyramids', 'Biogeochemical cycles', 'Ecological succession', 'Terrestrial and aquatic ecosystems', 'Wetlands, mangroves and coral reefs'],
'PRE.GS.ENV.BIO': ['Biodiversity: levels and values', 'Biodiversity hotspots and megadiverse regions', 'In-situ conservation: national parks, sanctuaries, biosphere reserves', 'Ex-situ conservation', 'IUCN Red List and endangered species', 'Wildlife protection laws and institutions', 'International conventions: CBD, CITES, Ramsar, CMS', 'Invasive species and project-based conservation (tiger, elephant)'],
'PRE.GS.ENV.CC': ['Greenhouse effect and global warming', 'Climate change impacts on India', 'Ozone depletion and the Montreal Protocol', 'UNFCCC, Kyoto Protocol and Paris Agreement', 'India\'s climate commitments and NAPCC', 'Carbon markets and climate finance', 'Air, water and soil pollution', 'Waste management rules'],
'PRE.GS.SCI.GEN': ['Physics: basics in everyday life', 'Chemistry: basics in everyday life', 'Human body and physiology', 'Diseases: causes, vectors and prevention', 'Nutrition and vitamins', 'Plant and animal kingdoms', 'Genetics and heredity'],
'PRE.GS.SCI.TEC': ['Space technology and ISRO missions', 'Defence technology and missiles', 'Biotechnology and genetic engineering', 'Nanotechnology', 'IT, AI and emerging technologies', 'Nuclear technology and energy', 'Health technology and vaccines', 'Intellectual property rights'],
'PRE.GS.CA.NAT': ['Polity and governance in the news', 'Economy in the news', 'Environment in the news', 'Science and technology in the news', 'Government schemes and reports in the news', 'Awards, persons and places in the news'],
'PRE.GS.CA.INT': ['India\'s bilateral relations in the news', 'International organisations and summits', 'Global events and conflicts', 'International reports and indices'],
# ---------------------------------------------------------------- CSAT
'PRE.CSAT.CSAT.COMP': ['Reading speed and passage strategy', 'Main idea and inference questions', 'Assumption and conclusion questions', 'Vocabulary and tone in passages'],
'PRE.CSAT.CSAT.INT': ['Interpersonal skills and communication scenarios'],
'PRE.CSAT.CSAT.LR': ['Syllogisms', 'Statements: assumptions, conclusions, arguments', 'Coding-decoding', 'Blood relations', 'Direction sense', 'Seating arrangements and puzzles', 'Series: number and letter', 'Clocks and calendars'],
'PRE.CSAT.CSAT.DM': ['Decision making and problem-solving situations'],
'PRE.CSAT.CSAT.MA': ['Analogies and classification', 'Cubes, dice and figures', 'Venn diagrams', 'Ranking and order'],
'PRE.CSAT.CSAT.NUM': ['Number system and divisibility', 'HCF, LCM and simplification', 'Percentages', 'Profit, loss and discount', 'Ratio, proportion and partnership', 'Averages and mixtures', 'Simple and compound interest', 'Time and work', 'Time, speed and distance', 'Permutations, combinations and probability', 'Geometry and mensuration'],
'PRE.CSAT.CSAT.DI': ['Tables', 'Bar and line graphs', 'Pie charts', 'Data sufficiency'],
# ---------------------------------------------------------------- Mains: Essay
'MAI.ESS.ESS.PHI': ['Essay structure: introduction, body, conclusion', 'Interpreting philosophical quotes', 'Practice essays: abstract themes'],
'MAI.ESS.ESS.SOC': ['Social issues essays', 'Polity and governance essays', 'Practice essays: society and governance'],
'MAI.ESS.ESS.ECO': ['Economy essays', 'Science, technology and environment essays', 'Practice essays: economy and environment'],
# ---------------------------------------------------------------- Mains GS I
'MAI.GS1.GS1.ART': ['Architecture: ancient, medieval and modern', 'Sculpture and painting', 'Performing arts: dance, music, theatre', 'Literature: classical and regional', 'Religion, philosophy and Bhakti-Sufi traditions', 'Heritage conservation'],
'MAI.GS1.GS1.MOD': ['British expansion and colonial economy', 'Social and religious reforms', 'Early uprisings and the 1857 revolt', 'Personalities of modern India'],
'MAI.GS1.GS1.FS': ['Moderates and extremists', 'Gandhian movements', 'Revolutionaries and the left', 'Contributions from different regions', 'Role of women, peasants, workers and tribals in the freedom struggle'],
'MAI.GS1.GS1.POST': ['Integration of princely states', 'Linguistic reorganisation of states', 'Nehruvian era: planning and foreign policy', 'Wars and internal challenges 1947-1991', 'Land reforms, Green Revolution and social movements'],
'MAI.GS1.GS1.WH': ['Industrial Revolution', 'American and French revolutions', 'World Wars I and II', 'Colonisation and decolonisation', 'Nationalism and redrawal of boundaries', 'Political philosophies: communism, capitalism, socialism', 'Cold War'],
'MAI.GS1.GS1.SOC': ['Diversity: caste, religion, language, region', 'Family, marriage and kinship', 'Tribal society', 'Social change in India'],
'MAI.GS1.GS1.WOM': ['Status of women: issues and trends', 'Women\'s movements and organisations', 'Gender-based violence and laws'],
'MAI.GS1.GS1.POP': ['Population trends and issues', 'Poverty and development issues', 'Ageing, youth and demographic dividend'],
'MAI.GS1.GS1.URB': ['Urbanisation trends', 'Urban problems: housing, slums, waste, transport', 'Remedies and urban missions'],
'MAI.GS1.GS1.GLO': ['Globalisation and culture', 'Globalisation and the economy, work and family', 'Effects on women, youth and marginalised groups'],
'MAI.GS1.GS1.SEC': ['Social empowerment', 'Communalism', 'Regionalism', 'Secularism'],
'MAI.GS1.GS1.WPG': ['Geomorphology', 'Climatology', 'Oceanography', 'Biogeography'],
'MAI.GS1.GS1.RES': ['Mineral and energy resources: world and India', 'Water resources', 'Forest and land resources'],
'MAI.GS1.GS1.IND': ['Location factors: primary industries', 'Location factors: secondary industries', 'Location factors: tertiary sector'],
'MAI.GS1.GS1.PHE': ['Earthquakes and tsunamis', 'Volcanoes', 'Cyclones'],
'MAI.GS1.GS1.GCH': ['Changes in water bodies and ice caps', 'Changes in flora and fauna', 'Effects of these changes'],
# ---------------------------------------------------------------- Mains GS II
'MAI.GS2.GS2.CON': ['Historical underpinnings and evolution', 'Features and significant provisions', 'Amendments', 'Basic structure doctrine', 'Fundamental Rights and Directive Principles in practice'],
'MAI.GS2.GS2.FED': ['Functions and responsibilities of Union and states', 'Issues of the federal structure', 'Devolution of powers and finances to local levels', 'Inter-state relations and councils'],
'MAI.GS2.GS2.SOP': ['Separation of powers between organs', 'Dispute redressal mechanisms and institutions', 'Judicial activism and judicial review'],
'MAI.GS2.GS2.CMP': ['Comparison with other democracies\' constitutions'],
'MAI.GS2.GS2.PAR': ['Parliament: structure and functioning', 'Conduct of business and parliamentary committees', 'Powers and privileges', 'State legislatures', 'Issues arising out of these'],
'MAI.GS2.GS2.EXE': ['Executive: structure and functioning', 'Judiciary: structure and functioning', 'Ministries and departments', 'Pressure groups and associations'],
'MAI.GS2.GS2.RPA': ['Salient features of the Representation of People\'s Act', 'Electoral reforms'],
'MAI.GS2.GS2.CB': ['Election Commission', 'CAG', 'UPSC and state PSCs', 'Finance Commission', 'National commissions for SCs, STs and backward classes'],
'MAI.GS2.GS2.SB': ['Statutory bodies: NHRC, CIC, CVC, Lokpal', 'Regulatory bodies: SEBI, TRAI and others', 'Quasi-judicial bodies and tribunals'],
'MAI.GS2.GS2.POL': ['Policy design and implementation issues', 'Government interventions in various sectors'],
'MAI.GS2.GS2.DEV': ['NGOs and civil society', 'Self-help groups', 'Donors, charities and other stakeholders', 'Development industry'],
'MAI.GS2.GS2.WEL': ['Schemes for vulnerable sections', 'Performance of these schemes', 'Mechanisms, laws and institutions for vulnerable sections'],
'MAI.GS2.GS2.HEA': ['Health: policy and issues', 'Education: policy and issues', 'Human resource development'],
'MAI.GS2.GS2.POV': ['Poverty issues', 'Hunger and malnutrition'],
'MAI.GS2.GS2.GOV': ['Transparency and accountability', 'E-governance', 'Citizen charters', 'Institutional measures'],
'MAI.GS2.GS2.CS': ['Role of civil services in a democracy', 'Civil service reforms'],
'MAI.GS2.GS2.NEI': ['India-Pakistan', 'India-China', 'India-Bangladesh, Nepal, Bhutan', 'India-Sri Lanka, Maldives', 'India-Afghanistan and Myanmar'],
'MAI.GS2.GS2.GRP': ['Regional groupings: SAARC, BIMSTEC, ASEAN, SCO', 'Global groupings: G20, BRICS, Quad', 'India\'s bilateral relations with major powers', 'Agreements involving or affecting India'],
'MAI.GS2.GS2.POLD': ['Policies and politics of developed and developing countries', 'Indian diaspora'],
'MAI.GS2.GS2.INST': ['UN and its agencies', 'WTO, IMF and World Bank', 'Other international institutions: structure and mandate'],
# ---------------------------------------------------------------- Mains GS III
'MAI.GS3.GS3.PLAN': ['Planning in India', 'Resource mobilisation', 'Growth and development', 'Employment and unemployment'],
'MAI.GS3.GS3.INC': ['Inclusive growth and issues arising from it'],
'MAI.GS3.GS3.BUD': ['Government budgeting: process and components', 'Fiscal federalism and Finance Commission transfers'],
'MAI.GS3.GS3.CROP': ['Major crops and cropping patterns', 'Irrigation systems', 'Storage, transport and marketing of produce', 'E-technology for farmers'],
'MAI.GS3.GS3.SUB': ['Direct and indirect farm subsidies; MSP', 'Public distribution system', 'Buffer stocks and food security', 'Technology missions and animal rearing economics'],
'MAI.GS3.GS3.FPI': ['Food processing: scope and significance', 'Location, upstream and downstream requirements', 'Supply chain management'],
'MAI.GS3.GS3.LAND': ['Land reforms in India'],
'MAI.GS3.GS3.LIB': ['Effects of liberalisation on the economy', 'Changes in industrial policy and industrial growth'],
'MAI.GS3.GS3.INF': ['Energy', 'Ports, roads and airports', 'Railways', 'Urban infrastructure'],
'MAI.GS3.GS3.INV': ['Investment models: PPP, HAM, BOT', 'FDI and FPI'],
'MAI.GS3.GS3.ST': ['Science and technology developments', 'Applications in everyday life'],
'MAI.GS3.GS3.IND': ['Achievements of Indians in science and technology', 'Indigenisation of technology'],
'MAI.GS3.GS3.AWR': ['IT and computers', 'Space', 'Robotics and nanotechnology', 'Biotechnology', 'Intellectual property rights'],
'MAI.GS3.GS3.ENV': ['Conservation', 'Environmental pollution and degradation', 'Environmental impact assessment'],
'MAI.GS3.GS3.DM': ['Disaster types and vulnerability', 'Disaster management framework: NDMA, Sendai', 'Case studies of disasters'],
'MAI.GS3.GS3.EXT': ['Left-wing extremism and development', 'Insurgency in the north-east'],
'MAI.GS3.GS3.ISC': ['Role of external state and non-state actors'],
'MAI.GS3.GS3.CYB': ['Communication networks and security', 'Role of media and social networking', 'Cyber security basics', 'Money laundering and its prevention'],
'MAI.GS3.GS3.BOR': ['Border management', 'Organised crime', 'Terrorism'],
'MAI.GS3.GS3.AGN': ['Security forces and agencies and their mandate'],
# ---------------------------------------------------------------- Mains GS IV
'MAI.GS4.GS4.ETH': ['Essence, determinants and consequences of ethics', 'Dimensions of ethics', 'Ethics in private and public relationships', 'Human values: lessons from leaders, reformers and administrators', 'Role of family, society and education in values'],
'MAI.GS4.GS4.ATT': ['Attitude: content, structure, function', 'Moral and political attitudes', 'Social influence and persuasion'],
'MAI.GS4.GS4.APT': ['Integrity, impartiality and non-partisanship', 'Objectivity and dedication to public service', 'Empathy, tolerance and compassion for weaker sections'],
'MAI.GS4.GS4.EI': ['Emotional intelligence: concepts', 'Utility and application in administration'],
'MAI.GS4.GS4.THK': ['Indian moral thinkers', 'Western moral thinkers and philosophers'],
'MAI.GS4.GS4.PAV': ['Status and problems of public service values', 'Ethical dilemmas in government and private institutions', 'Laws, rules and conscience as sources of guidance', 'Accountability and ethical governance', 'Ethics in international relations and funding', 'Corporate governance'],
'MAI.GS4.GS4.PRO': ['Concept of public service and probity', 'Philosophical basis of governance', 'Information sharing, transparency and RTI', 'Codes of ethics and codes of conduct', 'Citizen charters and work culture', 'Utilisation of public funds and corruption'],
'MAI.GS4.GS4.CASE': ['Case study method and structure', 'Practice: administrative dilemmas', 'Practice: personal and professional conflicts'],
}

TRIGGER_SQL = r'''
-- Ledger trigger v1.1: ticking a subtopic marks it studied without its own revision schedule (revision runs per topic);
-- "studied" with details {"undo": true} un-ticks it. Revision history is never erased.
create or replace function public.prep_apply_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare st public.prep_topic_state; day date := new.occurred_on; node_kind text;
begin
  if new.node_id is null or not new.confirmed then return new; end if;
  select kind into node_kind from public.prep_syllabus_nodes where id = new.node_id;
  insert into public.prep_topic_state (user_id, node_id) values (new.user_id, new.node_id) on conflict do nothing;
  select * into st from public.prep_topic_state where user_id = new.user_id and node_id = new.node_id for update;

  if new.kind = 'studied' and coalesce((new.details ->> 'undo')::boolean, false) then
    update public.prep_topic_state set touched_on = null, foundation = '{}'::jsonb,
      next_revision_on = case when revision_count = 0 then null else next_revision_on end,
      interval_days = case when revision_count = 0 then null else interval_days end,
      algorithm_version = 'v1', updated_at = now()
    where user_id = new.user_id and node_id = new.node_id;
    return new;
  end if;

  st.touched_on := least(coalesce(st.touched_on, day), day);
  if new.kind in ('studied', 'notes', 'foundation', 'ncert_step') then
    st.foundation := st.foundation || coalesce(new.details -> 'foundation', '{}'::jsonb)
      || case when new.kind = 'notes' then '{"notes": true}'::jsonb else '{}'::jsonb end;
    if st.next_revision_on is null and node_kind <> 'subtopic' then
      st.interval_days := public.prep_next_interval(0);
      st.next_revision_on := day + st.interval_days;
    end if;
  elsif new.kind = 'revised' then
    if st.last_revised_on is null or day > st.last_revised_on then
      st.revision_count := st.revision_count + 1;
      st.last_revised_on := day;
      st.interval_days := public.prep_next_interval(st.revision_count);
      st.next_revision_on := day + st.interval_days;
    end if;
  elsif new.kind = 'pyq' then
    st.pyq_attempted := st.pyq_attempted + new.quantity;
    st.pyq_correct := st.pyq_correct + least(new.quantity, coalesce((new.details ->> 'correct')::integer, 0));
  elsif new.kind = 'answers' then
    st.answers_written := st.answers_written + new.quantity;
  end if;

  update public.prep_topic_state set touched_on = st.touched_on, foundation = st.foundation, revision_count = st.revision_count,
    last_revised_on = st.last_revised_on, interval_days = st.interval_days, next_revision_on = st.next_revision_on,
    pyq_attempted = st.pyq_attempted, pyq_correct = st.pyq_correct, answers_written = st.answers_written,
    algorithm_version = 'v1', updated_at = now()
  where user_id = new.user_id and node_id = new.node_id;
  return new;
end;
$$;'''


def main():
    def q(s): return "'" + s.replace("'", "''") + "'"

    missing = []
    rows = []
    for topic, subs in S.items():
      for i, title in enumerate(subs):
        rows.append((f'{topic}.{i + 1:02d}', topic, title, i))

    print(f'-- Preparation tracker: official starter subtopics for UPSC CSE v1 ({len(rows)} subtopics across {len(S)} topics).')
    print('-- Generated by supabase/seed/upsc_cse_v1_subtopics.py. Safe to rerun. Also adds subtopic "un-tick" support to the ledger trigger.')
    print('with t as (select id from public.prep_exam_templates where code = \'upsc_cse_v1\')')
    print('insert into public.prep_syllabus_nodes (template_id, parent_id, kind, code, title, stages, papers, sort)')
    print('select t.id, p.id, \'subtopic\', v.code, v.title, p.stages, p.papers, v.sort from t, (values')
    print(',\n'.join(f'  ({q(c)}, {q(p)}, {q(ti)}, {so})' for c, p, ti, so in rows))
    print(') as v(code, parent_code, title, sort)')
    print('join public.prep_syllabus_nodes p on p.code = v.parent_code')
    print('where p.template_id = t.id')
    print('on conflict (template_id, code) do update set title = excluded.title, parent_id = excluded.parent_id, sort = excluded.sort;')

    print(TRIGGER_SQL)


if __name__ == '__main__':
    main()
