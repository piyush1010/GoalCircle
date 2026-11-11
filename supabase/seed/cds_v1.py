"""UPSC CDS (Combined Defence Services) template v1.

Pattern as notified by UPSC (CDS I and II, 2026): IMA, INA and AFA candidates write English (120 questions),
General Knowledge (120) and Elementary Mathematics (100), each of 100 marks and two hours; OTA candidates
write only English and General Knowledge. A wrong answer loses a third of the question's marks. Those who
qualify go on to the SSB interview (300 marks; 200 for OTA).

Mathematics follows the UPSC syllabus headings (arithmetic, elementary number theory, algebra,
trigonometry, geometry, mensuration, statistics). English and GK follow the question types and areas
the papers have used in recent years. The second stage covers the five-day SSB procedure. Titles are
our own wording. No PYQ frequency (not measured).

Run: python3 supabase/seed/cds_v1.py > supabase/migrations/202611130001_prep_cds.sql
"""
from state_pcs_v1 import emit, P, I

T = lambda code, title, subs: (code, title, None, subs)

CDS = ('cds_v1', 'UPSC CDS (Combined Defence Services)', [
    ('PRE', 'Written exam', P, [], [
        ('ENG', 'English (120 questions, 100 marks)', P, ['CDS_ENG'], [
            ('ENG', 'English', [
                T('ENG.GR', 'Grammar', ['Spotting errors', 'Sentence improvement', 'Fill in the blanks: articles, prepositions, tenses', 'Active and passive voice', 'Direct and indirect speech']),
                T('ENG.VO', 'Vocabulary', ['Synonyms', 'Antonyms', 'Idioms and phrases', 'One-word substitution']),
                T('ENG.RC', 'Comprehension and sentence order', ['Reading comprehension passages', 'Ordering of words in a sentence', 'Ordering of sentences in a passage', 'Cloze test']),
            ]),
        ]),
        ('GK', 'General Knowledge (120 questions, 100 marks)', P, ['CDS_GK'], [
            ('GK', 'General Knowledge', [
                T('GK.HIS', 'History', ['Ancient India', 'Medieval India', 'Modern India and the freedom struggle', 'Art and culture', 'World history: major revolutions and the world wars']),
                T('GK.GEO', 'Geography', ['Physical geography: earth, atmosphere and oceans', 'Indian geography: rivers, climate, soils, resources', 'World geography', 'Environment and ecology']),
                T('GK.POL', 'Polity', ['Constitution: features, rights and duties', 'Union and state government', 'Judiciary and constitutional bodies', 'Local government']),
                T('GK.ECO', 'Economy', ['Basic economic concepts', 'Banking, budget and taxation', 'Five-year plans, NITI Aayog and schemes']),
                T('GK.SCI', 'General science', ['Physics: motion, energy, light, sound, electricity', 'Chemistry: matter, elements, acids, everyday chemistry', 'Biology: human body, diseases, nutrition, plants', 'Science and technology in news']),
                T('GK.DEF', 'Defence', ['Army, Navy and Air Force: ranks, commands and training establishments', 'Weapons, missiles, aircraft and ships', 'Military exercises with other countries', 'Wars and operations since independence', 'Gallantry awards']),
                T('GK.CA', 'Current affairs and static GK', ['National and international current affairs (last 6-8 months)', 'Awards, books and authors', 'Sports and important days', 'International organisations and summits']),
            ]),
        ]),
        ('MATH', 'Elementary Mathematics (100 questions, 100 marks; not for OTA)', P, ['CDS_MATH'], [
            ('MATH', 'Elementary Mathematics', [
                T('MATH.AR', 'Arithmetic', ['Number system: natural, integers, rational and real numbers', 'Unitary method and ratio and proportion', 'Percentages, profit and loss', 'Simple and compound interest', 'Time and distance', 'Time and work', 'Variation']),
                T('MATH.NT', 'Elementary number theory', ['Division algorithm, prime and composite numbers', 'Tests of divisibility', 'HCF and LCM, Euclidean algorithm', 'Logarithms and their use']),
                T('MATH.AL', 'Algebra', ['Basic operations and simple factors', 'Remainder theorem, HCF and LCM of polynomials', 'Linear equations in two unknowns', 'Quadratic equations: roots and coefficients', 'Simultaneous linear inequations', 'Set language and notation']),
                T('MATH.TR', 'Trigonometry', ['Trigonometric ratios and values for standard angles', 'Simple trigonometric identities', 'Heights and distances']),
                T('MATH.GE', 'Geometry', ['Lines and angles', 'Triangles: congruence and similarity', 'Parallelograms, rectangles and squares', 'Circles, tangents and chords', 'Loci']),
                T('MATH.MN', 'Mensuration', ['Areas: squares, rectangles, triangles, parallelograms, circles', 'Surface area and volume: cuboids, cylinders, cones, spheres']),
                T('MATH.ST', 'Statistics', ['Collection and tabulation of data', 'Bar charts, pie charts, histograms and frequency polygons', 'Mean, median and mode']),
            ]),
        ]),
    ]),
    ('INT', 'SSB interview', I, [], [
        ('SCR', 'Day 1: Screening', I, ['SSB_SCR'], [('SCR', 'Screening', [
            T('SCR.OIR', 'Officer Intelligence Rating test', ['Verbal reasoning', 'Non-verbal reasoning']),
            T('SCR.PPDT', 'Picture Perception and Discussion Test', ['Writing a story from a hazy picture', 'Narrating your story', 'Group discussion on the picture']),
        ])]),
        ('PSY', 'Psychology tests', I, ['SSB_PSY'], [('PSY', 'Psychology tests', [
            T('PSY.TAT', 'Thematic Apperception Test', ['Writing 12 stories in time', 'A clear hero, action and outcome']),
            T('PSY.WAT', 'Word Association Test', ['60 words, 15 seconds each', 'Positive, natural sentences']),
            T('PSY.SRT', 'Situation Reaction Test', ['60 situations in 30 minutes', 'Practical, complete reactions']),
            T('PSY.SD', 'Self description', ['What parents, teachers, friends and you think of you', 'Strengths and areas to improve']),
        ])]),
        ('GTO', 'Group testing (GTO)', I, ['SSB_GTO'], [('GTO', 'Group tasks', [
            T('GTO.TALK', 'Speaking tasks', ['Group discussion', 'Group planning exercise', 'Lecturette']),
            T('GTO.OUT', 'Outdoor tasks', ['Progressive group task', 'Half group task', 'Individual obstacles', 'Command task', 'Snake race and final group task']),
        ])]),
        ('PI', 'Personal interview and conference', I, ['SSB_PI'], [('PI', 'Interview', [
            T('PI.SELF', 'About you', ['Your PIQ form: know every line', 'Family, education and hobbies', 'Why the armed forces, why this service']),
            T('PI.DEF', 'Defence and current affairs', ['Service knowledge: ranks, regiments, bases', 'National and international current affairs', 'Your state and hometown']),
            T('PI.CONF', 'Conference', ['Final conference with the board', 'Fitness and medical preparation']),
        ])]),
    ]),
])


def main():
    code, name, tree = CDS
    sql, topics, subs = emit(code, name, tree, optionals=False, ncert_path=False, exam='upsc')
    print('-- Preparation tracker: UPSC CDS template v1. Generated by supabase/seed/cds_v1.py. Safe to rerun.')
    print('begin;')
    print(sql)
    print('commit;')


if __name__ == '__main__':
    main()
