"""Haryana Civil Services (HCS, Executive Branch) template v1, on the pattern revised in January 2026.

Prelims: General Studies and the Civil Service Aptitude Test (100 questions each, +2 / -0.25, five options).
Mains: English (with essay), Hindi (with essay), GS I-IV, 100 marks each; interview 75.
The GS papers follow the UPSC-pattern headings, each with "related issues of Haryana". Shared areas reuse
the UPSC topics and starter subtopics; Haryana areas are broken down the way state-PCS coaching guides
split them. Titles are our own wording. No PYQ frequency (not measured).

Run: python3 supabase/seed/hpsc_hcs_v1.py > supabase/migrations/202611100002_prep_haryana_template.sql
"""
from state_pcs_v1 import emit, upsc_paper, csat, interview, P, M

T = lambda code, title, subs: (code, title, None, subs)

HR_PRE = ('HR', 'Haryana: special knowledge', [
    T('HR.HIS', 'History of Haryana', ['Harappan sites: Rakhigarhi, Banawali, Bhirrana, Kunal', 'Vedic age, Kurukshetra and the Mahabharata tradition', 'Thanesar and Harshavardhana', 'Battles of Tarain and Panipat', 'Haryana in 1857: Rao Tula Ram and others', 'Freedom movement in Haryana: Lala Lajpat Rai, Sir Chhotu Ram', 'Formation of Haryana (1966)']),
    T('HR.CUL', 'Culture of Haryana', ['Folk dances: Phag, Ghoomar, Loor, Khoria', 'Saang, folk music and Pt. Lakhmi Chand', 'Fairs and festivals: Surajkund Crafts Mela, Gita Jayanti, Teej', 'Dialects: Haryanvi, Bagri, Ahirwati, Mewati', 'Heritage sites, museums and tourism circuits', 'Sports culture and achievers']),
    T('HR.GEO', 'Geography of Haryana', ['Location, divisions and districts', 'Physiography: Shivaliks, plains, Aravallis, sandy tracts', 'Rivers: Yamuna, Ghaggar, Markanda, Sahibi', 'Climate and soils', 'Forests, wildlife sanctuaries and national parks (Sultanpur, Kalesar)', 'Minerals and energy']),
    T('HR.ECO', 'Economy of Haryana', ['State budget and economic survey highlights', 'Agriculture, the Green Revolution and crop diversification', 'Animal husbandry and dairy (Murrah buffalo)', 'Industry: Gurugram, Faridabad, Panipat, Sonipat clusters', 'Infrastructure: expressways, KMP, freight corridors', 'Major state schemes (Parivar Pehchan Patra and others)']),
    T('HR.POL', 'Polity and administration of Haryana', ['Governor, Chief Minister and Vidhan Sabha', 'Punjab and Haryana High Court', 'Panchayati Raj and urban local bodies in Haryana', 'State bodies: HPSC, Lokayukta, State Election Commission', 'Inter-state issues: SYL canal, Chandigarh, river waters']),
    T('HR.CA', 'Haryana current affairs', ['State government decisions and policies', 'Events, awards and personalities', 'Haryana in national rankings and reports']),
])

HR_GS1 = ('HR', 'Related issues of Haryana', [
    T('HR.SOC', 'Society and culture of Haryana', ['Sex ratio, Beti Bachao Beti Padhao and women\'s empowerment', 'Migration and urbanisation in the NCR districts', 'Caste, community institutions and social change', 'Heritage and cultural preservation']),
    T('HR.GEOM', 'Geography and resources of Haryana', ['Groundwater depletion and the dark zones', 'Aravalli degradation and mining', 'Floods, droughts and land use change']),
])
HR_GS2 = ('HR', 'Related issues of Haryana', [
    T('HR.GOV', 'Governance in Haryana', ['Parivar Pehchan Patra and targeted welfare', 'E-governance: Antyodaya Saral and service delivery', 'Panchayat education criteria and local democracy', 'Police and administrative reforms']),
    T('HR.ISS', 'Centre-state and inter-state issues', ['SYL canal and river-water disputes', 'Chandigarh and shared institutions', 'Reservation and representation debates']),
])
HR_GS3 = ('HR', 'Related issues of Haryana', [
    T('HR.AGR', 'Agriculture and environment in Haryana', ['Wheat-paddy cycle and crop diversification (Mera Pani Meri Virasat)', 'Stubble burning and air pollution', 'MSP, procurement and farm incomes', 'Micro-irrigation and water conservation']),
    T('HR.IND', 'Industry, infrastructure and security', ['Industrial policy, MSMEs and Gurugram\'s services economy', 'Unemployment and skilling', 'Drug abuse and cyber fraud', 'Disaster management in Haryana']),
])

HCS = ('hpsc_hcs_v1', 'HCS (Haryana Civil Services)', [
    ('PRE', 'Preliminary Examination', P, [], [
        ('GS', 'Paper I: General Studies', P, ['PRE_GS'], upsc_paper('PRE', 'GS') + [HR_PRE]),
        ('CSAT', 'Paper II: Civil Service Aptitude Test', P, ['CSAT'], csat()),
    ]),
    ('MAI', 'Main Examination', M, [], [
        ('ENG', 'English and English essay', M, ['ENGLISH'], [('ENG', 'English', [
            T('ENG.PRE', 'Précis and comprehension', ['Précis writing', 'Comprehension of passages']),
            T('ENG.USE', 'Usage, vocabulary and grammar', ['Usage and vocabulary', 'Grammar and composition']),
            T('ENG.ESS', 'English essay', ['Essay structure and practice']),
        ])]),
        ('HIN', 'Hindi and Hindi essay', M, ['HINDI'], [('HIN', 'Hindi', [
            T('HIN.TRN', 'Translation and letters', ['अनुवाद: अंग्रेज़ी से हिंदी', 'पत्र लेखन और संक्षेपण']),
            T('HIN.EXP', 'Prose, poetry and composition', ['गद्य और पद्य की व्याख्या', 'मुहावरे, लोकोक्तियाँ और वाक्य शुद्धि']),
            T('HIN.ESS', 'Hindi essay', ['निबंध की रचना और अभ्यास']),
        ])]),
        ('GS1', 'GS I: Culture, history, society and geography', M, ['GS1'], upsc_paper('MAI', 'GS1') + [HR_GS1]),
        ('GS2', 'GS II: Polity, governance, social justice and international relations', M, ['GS2'], upsc_paper('MAI', 'GS2') + [HR_GS2]),
        ('GS3', 'GS III: Economy, science and technology, environment and security', M, ['GS3'], upsc_paper('MAI', 'GS3') + [HR_GS3]),
        ('GS4', 'GS IV: Ethics, integrity and aptitude', M, ['GS4'], upsc_paper('MAI', 'GS4')),
    ]),
    interview(),
])


def main():
    code, name, tree = HCS
    sql, topics, subs = emit(code, name, tree, optionals=False)
    print('-- Preparation tracker: Haryana Civil Services (HCS) template v1. Generated by supabase/seed/hpsc_hcs_v1.py. Safe to rerun.')
    print('begin;')
    print(sql)
    print('commit;')


if __name__ == '__main__':
    main()
