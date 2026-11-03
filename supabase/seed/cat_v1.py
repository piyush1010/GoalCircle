"""CAT (Common Admission Test, for IIM/MBA admission) template v1.

Sections follow the current CAT pattern: VARC, DILR and Quantitative Ability, each timed separately.
Topics and subtopics follow the areas CAT papers have covered in recent years, split the way standard
CAT preparation material and coaching syllabus guides split them. A second stage covers the
post-CAT WAT, GD and PI rounds. Titles are our own wording. No PYQ frequency (not measured).

Run: python3 supabase/seed/cat_v1.py > supabase/migrations/202611090003_prep_cat_template.sql
"""
from state_pcs_v1 import emit, P, I

T = lambda code, title, subs: (code, title, None, subs)

CAT = ('cat_v1', 'CAT (MBA entrance)', [
    ('PRE', 'CAT exam', P, [], [
        ('VARC', 'Verbal Ability and Reading Comprehension', P, ['VARC'], [
            ('RC', 'Reading comprehension', [
                T('RC.TYP', 'RC question types', ['Main idea and central theme', 'Inference questions', "Author's tone and attitude", 'Specific detail and fact-based questions', 'Strengthen, weaken and assumption questions', 'Title and purpose of the passage']),
                T('RC.GEN', 'RC passage areas', ['Philosophy and abstract ideas', 'Economics and business', 'Science and technology', 'History, art and culture', 'Society, psychology and politics']),
                T('RC.SKL', 'Reading speed and habit', ['Daily reading routine (editorials, long-form essays)', 'Summarising a passage in one line', 'Reading speed with comprehension']),
            ]),
            ('VA', 'Verbal ability', [
                T('VA.SUM', 'Para summary', ['Identifying the core argument', 'Eliminating too-narrow and too-broad options']),
                T('VA.PJ', 'Para jumbles', ['Opening and closing sentences', 'Linking pairs and connectors', 'Four- and five-sentence jumbles (TITA)']),
                T('VA.OOO', 'Odd sentence out', ['Theme mismatch', 'Tone and scope mismatch']),
                T('VA.PC', 'Para completion', ['Completing the flow of an argument', 'Avoiding new information in the answer']),
            ]),
        ]),
        ('DILR', 'Data Interpretation and Logical Reasoning', P, ['DILR'], [
            ('DI', 'Data interpretation', [
                T('DI.TAB', 'Tables and charts', ['Tables', 'Bar and line graphs', 'Pie charts', 'Mixed and multiple graphs', 'Caselets (data in text)']),
                T('DI.CALC', 'Calculation speed', ['Percentages and fractions for DI', 'Approximation and comparison of ratios', 'Growth rates and averages in sets']),
            ]),
            ('LR', 'Logical reasoning', [
                T('LR.ARR', 'Arrangements', ['Linear arrangement', 'Circular arrangement', 'Matrix and grid arrangement', 'Scheduling and calendars']),
                T('LR.DIS', 'Distribution and selection', ['Distribution and matching', 'Selection with conditions', 'Venn-diagram based sets']),
                T('LR.GAM', 'Games, tournaments and puzzles', ['Tournaments and round robins', 'Games and scoring', 'Cubes and dice', 'Truth-tellers and liars', 'Binary logic']),
                T('LR.NET', 'Networks and quantitative reasoning', ['Routes and networks', 'Quant-based reasoning sets', 'Ranking and ordering with numbers']),
            ]),
            ('STR', 'Exam strategy', [
                T('DILR.SEL', 'Set selection and time management', ['Scanning all sets in the first five minutes', 'Picking doable sets', 'When to leave a set']),
            ]),
        ]),
        ('QA', 'Quantitative Ability', P, ['QA'], [
            ('ARI', 'Arithmetic', [
                T('ARI.PCT', 'Percentages, profit and loss', ['Percentages and successive change', 'Profit, loss and discount', 'Simple and compound interest']),
                T('ARI.RAT', 'Ratio, proportion and averages', ['Ratio and proportion', 'Variation', 'Averages', 'Mixtures and alligation', 'Partnership']),
                T('ARI.TW', 'Time, work and distance', ['Time and work', 'Pipes and cisterns', 'Time, speed and distance', 'Trains, boats and streams', 'Races and circular tracks']),
            ]),
            ('ALG', 'Algebra', [
                T('ALG.EQ', 'Equations and inequalities', ['Linear equations', 'Quadratic equations', 'Inequalities', 'Modulus']),
                T('ALG.FN', 'Functions, logs and progressions', ['Functions and graphs', 'Logarithms', 'Arithmetic and geometric progressions', 'Sequences and series', 'Polynomials and maxima-minima']),
            ]),
            ('NUM', 'Number system', [
                T('NUM.ALL', 'Number system', ['Divisibility and factors', 'HCF and LCM', 'Remainders and modular arithmetic', 'Unit digit and last two digits', 'Base systems', 'Factorials and trailing zeros']),
            ]),
            ('GEO', 'Geometry and mensuration', [
                T('GEO.PL', 'Plane geometry', ['Lines, angles and triangles', 'Similarity and congruence', 'Circles', 'Quadrilaterals and polygons']),
                T('GEO.CO', 'Coordinate geometry and trigonometry', ['Coordinate geometry', 'Basic trigonometry: heights and distances']),
                T('GEO.MEN', 'Mensuration', ['Areas of 2D figures', 'Surface area and volume of 3D solids']),
            ]),
            ('MOD', 'Modern math', [
                T('MOD.PNC', 'Permutation, combination and probability', ['Permutations and combinations', 'Probability', 'Set theory and Venn diagrams']),
            ]),
        ]),
    ]),
    ('INT', 'After CAT: WAT, GD and PI', I, [], [
        ('WAT', 'Written ability test', I, ['WAT'], [('WAT', 'Written ability test', [
            T('WAT.STR', 'Writing a WAT essay', ['Structure: introduction, two sides, conclusion', 'Writing 300 words in 30 minutes', 'Practice on business and social topics']),
        ])]),
        ('GD', 'Group discussion', I, ['GD'], [('GD', 'Group discussion', [
            T('GD.SKL', 'GD skills', ['Opening and summarising a discussion', 'Abstract topics', 'Business and economy topics', 'Current affairs topics']),
        ])]),
        ('PI', 'Personal interview', I, ['PI'], [('PI', 'Personal interview', [
            T('PI.SELF', 'About you', ['Tell me about yourself', 'Why MBA, why now, why this institute', 'Strengths, weaknesses and short-term goals', 'Hobbies and extracurriculars']),
            T('PI.ACA', 'Academics and work', ['Graduation subjects revision', 'Work experience and projects', 'Hometown and state']),
            T('PI.BIZ', 'Business and current affairs', ['Economy and budget basics', 'Business news and companies', 'National and international current affairs']),
        ])]),
    ]),
])


def main():
    code, name, tree = CAT
    sql, topics, subs = emit(code, name, tree, optionals=False, ncert_path=False, exam='cat')
    print('-- Preparation tracker: CAT (MBA) template v1. Generated by supabase/seed/cat_v1.py. Safe to rerun.')
    print('begin;')
    print(sql)
    print('commit;')


if __name__ == '__main__':
    main()
