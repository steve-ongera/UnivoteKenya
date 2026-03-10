"""
Management Command: seed_data
================================================================================
Populates the UniVote Kenya database with realistic seed data for development
and demo purposes.

Usage:
    python manage.py seed_data              # Full seed (all data)
    python manage.py seed_data --flush      # Wipe DB first, then seed
    python manage.py seed_data --votes      # Also simulate random votes
    python manage.py seed_data --flush --votes  # Full fresh seed with votes

What gets created:
    • 1  Admin account
    • 2  IEBC officials
    • 60 Students  (across all schools, programmes, years)
    • 1  Active election (2024/2025 SRC Elections)
    • 1  Past election  (2023/2024 — results published)
    • 14 Candidates     (2 per presidential ticket + all other positions)
    • 60 Voter registrations (all approved for active election)
    • 5  Announcements
    • Simulated votes   (optional, --votes flag)
================================================================================
"""

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from elections.models import (
    User, Election, Candidate, Vote, VoterRegistration, Announcement,
)


# ═══════════════════════════════════════════════════════════════════
# SEED DATA TABLES
# ═══════════════════════════════════════════════════════════════════

ADMIN_ACCOUNT = {
    'full_name':           'Dr. James Kariuki Mwangi',
    'email':               'admin@univote.ac.ke',
    'registration_number': 'ADM/2024/001',
    'phone':               '0712000001',
    'role':                'admin',
    'password':            'admin123',
    'is_staff':            True,
    'is_superuser':        True,
}

IEBC_OFFICIALS = [
    {
        'full_name':           'Mrs. Grace Wanjiku Kamau',
        'email':               'iebc1@univote.ac.ke',
        'registration_number': 'IEBC/2024/001',
        'phone':               '0712000010',
        'role':                'iebc',
        'password':            'Iebc@2024',
        'is_staff':            True,
    },
    {
        'full_name':           'Mr. Peter Otieno Ochieng',
        'email':               'iebc2@univote.ac.ke',
        'registration_number': 'IEBC/2024/002',
        'phone':               '0712000011',
        'role':                'iebc',
        'password':            'Iebc@2024',
        'is_staff':            True,
    },
]

# fmt: off
STUDENTS = [
    # ── SET (School of Engineering & Technology) ──────────────────────────────
    {'full_name': 'Steve Ongera Momanyi',      'email': 'steve.ongera@student.univote.ac.ke',    'registration_number': 'CS/2022/001',  'phone': '0757790687', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022001', 'national_id': '38291047'},
    {'full_name': 'Brian Kamau Njoroge',        'email': 'brian.kamau@student.univote.ac.ke',     'registration_number': 'CS/2022/002',  'phone': '0722334455', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022002', 'national_id': '38291048'},
    {'full_name': 'Faith Akinyi Odhiambo',      'email': 'faith.akinyi@student.univote.ac.ke',   'registration_number': 'CS/2022/003',  'phone': '0733445566', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022003', 'national_id': '38291049'},
    {'full_name': 'Kevin Mutua Ndambuki',        'email': 'kevin.mutua@student.univote.ac.ke',    'registration_number': 'CS/2023/004',  'phone': '0744556677', 'programme': 'BSCS', 'school': 'SET', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023004', 'national_id': '40112233'},
    {'full_name': 'Mercy Wanjiku Githae',        'email': 'mercy.wanjiku@student.univote.ac.ke', 'registration_number': 'CS/2023/005',  'phone': '0755667788', 'programme': 'BSCS', 'school': 'SET', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023005', 'national_id': '40112234'},
    {'full_name': 'Daniel Kipchoge Rotich',      'email': 'daniel.kip@student.univote.ac.ke',     'registration_number': 'ENG/2021/006', 'phone': '0766778899', 'programme': 'BENG', 'school': 'SET', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021006', 'national_id': '36001122'},
    {'full_name': 'Sharon Nekesa Wafula',        'email': 'sharon.nekesa@student.univote.ac.ke', 'registration_number': 'ENG/2021/007', 'phone': '0777889900', 'programme': 'BENG', 'school': 'SET', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021007', 'national_id': '36001123'},
    {'full_name': 'Victor Omondi Otieno',        'email': 'victor.omondi@student.univote.ac.ke', 'registration_number': 'ENG/2022/008', 'phone': '0788990011', 'programme': 'BENG', 'school': 'SET', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022008', 'national_id': '38291050'},
    {'full_name': 'Esther Njeri Wairimu',        'email': 'esther.njeri@student.univote.ac.ke',  'registration_number': 'CS/2024/009',  'phone': '0799001122', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024009', 'national_id': '42334455'},
    {'full_name': 'Collins Odhiambo Siaya',      'email': 'collins.odhiambo@student.univote.ac.ke','registration_number': 'CS/2024/010', 'phone': '0700112233', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024010', 'national_id': '42334456'},

    # ── SBS (School of Business Studies) ──────────────────────────────────────
    {'full_name': 'Joyce Muthoni Nganga',        'email': 'joyce.muthoni@student.univote.ac.ke', 'registration_number': 'BBA/2022/011', 'phone': '0711223344', 'programme': 'BBA',   'school': 'SBS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022011', 'national_id': '38401122'},
    {'full_name': 'Emmanuel Waweru Karanja',     'email': 'emmanuel.waweru@student.univote.ac.ke','registration_number': 'BBA/2022/012','phone': '0722334466', 'programme': 'BBA',   'school': 'SBS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022012', 'national_id': '38401123'},
    {'full_name': 'Cynthia Chebet Korir',        'email': 'cynthia.chebet@student.univote.ac.ke','registration_number': 'BCOM/2022/013','phone': '0733445577', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022013', 'national_id': '38401124'},
    {'full_name': 'Michael Gacheru Gathogo',     'email': 'michael.gacheru@student.univote.ac.ke','registration_number': 'BCOM/2023/014','phone': '0744556688', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023014', 'national_id': '40223344'},
    {'full_name': 'Pauline Auma Oloo',           'email': 'pauline.auma@student.univote.ac.ke',  'registration_number': 'BBA/2023/015', 'phone': '0755667799', 'programme': 'BBA',   'school': 'SBS', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023015', 'national_id': '40223345'},
    {'full_name': 'Kelvin Mbithi Mutungi',       'email': 'kelvin.mbithi@student.univote.ac.ke', 'registration_number': 'BCOM/2021/016','phone': '0766778800', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021016', 'national_id': '36112233'},
    {'full_name': 'Lydia Anyango Wuod',          'email': 'lydia.anyango@student.univote.ac.ke', 'registration_number': 'BBA/2021/017', 'phone': '0777889911', 'programme': 'BBA',   'school': 'SBS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021017', 'national_id': '36112234'},
    {'full_name': 'Robert Kamau Thuo',           'email': 'robert.kamau@student.univote.ac.ke',  'registration_number': 'BCOM/2024/018','phone': '0788990022', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024018', 'national_id': '42445566'},
    {'full_name': 'Susan Wanjiru Mwangi',        'email': 'susan.wanjiru@student.univote.ac.ke', 'registration_number': 'BBA/2024/019', 'phone': '0799001133', 'programme': 'BBA',   'school': 'SBS', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024019', 'national_id': '42445567'},
    {'full_name': 'Dennis Onyango Ouma',         'email': 'dennis.onyango@student.univote.ac.ke','registration_number': 'BCOM/2022/020','phone': '0700112244', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022020', 'national_id': '38401125'},

    # ── SEd (School of Education) ──────────────────────────────────────────────
    {'full_name': 'Alice Wambui Muthee',         'email': 'alice.wambui@student.univote.ac.ke',  'registration_number': 'BED/2022/021', 'phone': '0711223355', 'programme': 'BED',   'school': 'SEd', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022021', 'national_id': '38501122'},
    {'full_name': 'George Maina Kiarie',         'email': 'george.maina@student.univote.ac.ke',  'registration_number': 'BED/2022/022', 'phone': '0722334477', 'programme': 'BED',   'school': 'SEd', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022022', 'national_id': '38501123'},
    {'full_name': 'Vivian Kemunto Momanyi',      'email': 'vivian.kemunto@student.univote.ac.ke','registration_number': 'BED/2023/023', 'phone': '0733445588', 'programme': 'BED',   'school': 'SEd', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023023', 'national_id': '40334455'},
    {'full_name': 'Timothy Ndiema Wekesa',       'email': 'timothy.ndiema@student.univote.ac.ke','registration_number': 'BED/2021/024', 'phone': '0744556699', 'programme': 'BED',   'school': 'SEd', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021024', 'national_id': '36223344'},
    {'full_name': 'Lilian Atieno Ogola',         'email': 'lilian.atieno@student.univote.ac.ke', 'registration_number': 'BED/2024/025', 'phone': '0755667800', 'programme': 'BED',   'school': 'SEd', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024025', 'national_id': '42556677'},

    # ── SHS (School of Health Sciences) ───────────────────────────────────────
    {'full_name': 'Diana Moraa Ondieki',         'email': 'diana.moraa@student.univote.ac.ke',   'registration_number': 'BMED/2021/026','phone': '0766778811', 'programme': 'BMED',  'school': 'SHS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021026', 'national_id': '36334455'},
    {'full_name': 'Isaac Kiplagat Bett',         'email': 'isaac.kiplagat@student.univote.ac.ke','registration_number': 'BMED/2021/027','phone': '0777889922', 'programme': 'BMED',  'school': 'SHS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021027', 'national_id': '36334456'},
    {'full_name': 'Caroline Njambi Gitau',       'email': 'caroline.njambi@student.univote.ac.ke','registration_number': 'BNURS/2022/028','phone': '0788990033','programme': 'BNURS', 'school': 'SHS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022028', 'national_id': '38601122'},
    {'full_name': 'Francis Kiprotich Sang',      'email': 'francis.kip@student.univote.ac.ke',   'registration_number': 'BPHARM/2022/029','phone': '0799001144','programme': 'BPHARM','school': 'SHS', 'admission_date': date(2022, 8, 7), 'current_year': 3, 'student_id': 'STU2022029', 'national_id': '38601123'},
    {'full_name': 'Beatrice Wangari Njenga',     'email': 'beatrice.wangari@student.univote.ac.ke','registration_number': 'BNURS/2023/030','phone': '0700112255','programme': 'BNURS','school': 'SHS', 'admission_date': date(2023, 8, 7), 'current_year': 2, 'student_id': 'STU2023030', 'national_id': '40445566'},
    {'full_name': 'Andrew Osei Bonsu',           'email': 'andrew.osei@student.univote.ac.ke',   'registration_number': 'BPHARM/2023/031','phone': '0711223366','programme': 'BPHARM','school': 'SHS', 'admission_date': date(2023, 8, 7), 'current_year': 2, 'student_id': 'STU2023031', 'national_id': '40445567'},
    {'full_name': 'Hellen Cherop Kibet',         'email': 'hellen.cherop@student.univote.ac.ke', 'registration_number': 'BMED/2024/032', 'phone': '0722334488', 'programme': 'BMED',  'school': 'SHS', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024032', 'national_id': '42667788'},

    # ── SLA (School of Law & Arts) ─────────────────────────────────────────────
    {'full_name': 'Patricia Nduta Kinyua',       'email': 'patricia.nduta@student.univote.ac.ke','registration_number': 'BLAW/2021/033','phone': '0733445599', 'programme': 'BLAW',  'school': 'SLA', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021033', 'national_id': '36445566'},
    {'full_name': 'Charles Barasa Wanjala',      'email': 'charles.barasa@student.univote.ac.ke','registration_number': 'BLAW/2022/034','phone': '0744556700', 'programme': 'BLAW',  'school': 'SLA', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022034', 'national_id': '38701122'},
    {'full_name': 'Naomi Lokidor Ekiru',         'email': 'naomi.lokidor@student.univote.ac.ke', 'registration_number': 'BJOUR/2022/035','phone': '0755667811', 'programme': 'BJOUR', 'school': 'SLA', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022035', 'national_id': '38701123'},
    {'full_name': 'Samuel Thuo Githinji',        'email': 'samuel.thuo@student.univote.ac.ke',   'registration_number': 'BLAW/2023/036', 'phone': '0766778822', 'programme': 'BLAW',  'school': 'SLA', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023036', 'national_id': '40556677'},
    {'full_name': 'Winnie Achieng Owino',        'email': 'winnie.achieng@student.univote.ac.ke','registration_number': 'BJOUR/2023/037','phone': '0777889933', 'programme': 'BJOUR', 'school': 'SLA', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023037', 'national_id': '40556678'},
    {'full_name': 'Edwin Muriithi Gitonga',      'email': 'edwin.muriithi@student.univote.ac.ke','registration_number': 'BLAW/2024/038', 'phone': '0788990044', 'programme': 'BLAW',  'school': 'SLA', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024038', 'national_id': '42778899'},

    # ── SSS (School of Social Sciences) ───────────────────────────────────────
    {'full_name': 'Rose Kemunto Nyamache',       'email': 'rose.kemunto@student.univote.ac.ke',  'registration_number': 'BSOC/2021/039','phone': '0799001155', 'programme': 'BSOC',  'school': 'SSS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021039', 'national_id': '36556677'},
    {'full_name': 'Joshua Mwangi Kamande',       'email': 'joshua.mwangi@student.univote.ac.ke', 'registration_number': 'BPSYCH/2022/040','phone': '0700112266','programme': 'BPSYCH','school': 'SSS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022040', 'national_id': '38801122'},
    {'full_name': 'Tabitha Naliaka Makokha',     'email': 'tabitha.naliaka@student.univote.ac.ke','registration_number': 'BSOC/2022/041','phone': '0711223377', 'programme': 'BSOC',  'school': 'SSS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022041', 'national_id': '38801123'},
    {'full_name': 'Mark Odhiambo Were',          'email': 'mark.odhiambo@student.univote.ac.ke', 'registration_number': 'BPSYCH/2023/042','phone': '0722334499','programme': 'BPSYCH','school': 'SSS', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023042', 'national_id': '40667788'},
    {'full_name': 'Ann Njoki Waithaka',          'email': 'ann.njoki@student.univote.ac.ke',     'registration_number': 'BSOC/2023/043', 'phone': '0733445500', 'programme': 'BSOC',  'school': 'SSS', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023043', 'national_id': '40667789'},
    {'full_name': 'Ian Waweru Ngugi',            'email': 'ian.waweru@student.univote.ac.ke',    'registration_number': 'BPSYCH/2024/044','phone': '0744556711', 'programme': 'BPSYCH','school': 'SSS', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024044', 'national_id': '42889900'},

    # ── Extra cross-school students ────────────────────────────────────────────
    {'full_name': 'Doris Auma Adhiambo',         'email': 'doris.auma@student.univote.ac.ke',    'registration_number': 'BBA/2020/045',  'phone': '0755667822', 'programme': 'BBA',   'school': 'SBS', 'admission_date': date(2020, 8, 7),  'current_year': 5, 'student_id': 'STU2020045', 'national_id': '34001122'},
    {'full_name': 'Moses Kipkemoi Langat',       'email': 'moses.kipkemoi@student.univote.ac.ke','registration_number': 'BENG/2020/046',  'phone': '0766778833', 'programme': 'BENG',  'school': 'SET', 'admission_date': date(2020, 8, 7),  'current_year': 5, 'student_id': 'STU2020046', 'national_id': '34001123'},
    {'full_name': 'Gladys Kemuma Nyakerario',    'email': 'gladys.kemuma@student.univote.ac.ke', 'registration_number': 'BLAW/2020/047',  'phone': '0777889944', 'programme': 'BLAW',  'school': 'SLA', 'admission_date': date(2020, 8, 7),  'current_year': 5, 'student_id': 'STU2020047', 'national_id': '34001124'},
    {'full_name': 'Patrick Ndegwa Mwangi',       'email': 'patrick.ndegwa@student.univote.ac.ke','registration_number': 'BSCIT/2020/048', 'phone': '0788990055', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2020, 8, 7),  'current_year': 5, 'student_id': 'STU2020048', 'national_id': '34001125'},
    {'full_name': 'Cecilia Wanjiku Wainaina',    'email': 'cecilia.wanjiku@student.univote.ac.ke','registration_number': 'BMED/2022/049', 'phone': '0799001166', 'programme': 'BMED',  'school': 'SHS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022049', 'national_id': '38901122'},
    {'full_name': 'Geoffrey Ochieng Nyamulo',    'email': 'geoffrey.ochieng@student.univote.ac.ke','registration_number': 'BCOM/2022/050','phone': '0700112277', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022050', 'national_id': '38901123'},
    {'full_name': 'Millicent Nekesa Simiyu',     'email': 'millicent.nekesa@student.univote.ac.ke','registration_number': 'BED/2023/051','phone': '0711223388', 'programme': 'BED',   'school': 'SEd', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023051', 'national_id': '40778899'},
    {'full_name': 'Nathan Oloo Juma',            'email': 'nathan.oloo@student.univote.ac.ke',   'registration_number': 'BJOUR/2021/052', 'phone': '0722334400', 'programme': 'BJOUR', 'school': 'SLA', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021052', 'national_id': '36667788'},
    {'full_name': 'Purity Wairimu Kariuki',      'email': 'purity.wairimu@student.univote.ac.ke','registration_number': 'BPSYCH/2021/053','phone': '0733445511','programme': 'BPSYCH','school': 'SSS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021053', 'national_id': '36667789'},
    {'full_name': 'Solomon Wafula Masinde',      'email': 'solomon.wafula@student.univote.ac.ke','registration_number': 'BSOC/2024/054', 'phone': '0744556722', 'programme': 'BSOC',  'school': 'SSS', 'admission_date': date(2024, 8, 7),  'current_year': 1, 'student_id': 'STU2024054', 'national_id': '42990011'},
    {'full_name': 'Eunice Moraa Ombati',         'email': 'eunice.moraa@student.univote.ac.ke',  'registration_number': 'BARCH/2022/055', 'phone': '0755667833', 'programme': 'BARCH', 'school': 'SET', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022055', 'national_id': '38901124'},
    {'full_name': 'Erick Kipngetich Maiyo',      'email': 'erick.kipngetich@student.univote.ac.ke','registration_number': 'BCOM/2021/056','phone': '0766778844', 'programme': 'BCOM',  'school': 'SBS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021056', 'national_id': '36778899'},
    {'full_name': 'Abigail Kerubo Onkundi',      'email': 'abigail.kerubo@student.univote.ac.ke','registration_number': 'BNURS/2021/057','phone': '0777889955', 'programme': 'BNURS', 'school': 'SHS', 'admission_date': date(2021, 8, 7),  'current_year': 4, 'student_id': 'STU2021057', 'national_id': '36778900'},
    {'full_name': 'Leonard Kiplangat Too',       'email': 'leonard.kiplangat@student.univote.ac.ke','registration_number': 'BSC/2023/058','phone': '0788990066', 'programme': 'BSC',   'school': 'SET', 'admission_date': date(2023, 8, 7),  'current_year': 2, 'student_id': 'STU2023058', 'national_id': '40889900'},
    {'full_name': 'Irene Adhiambo Otieno',       'email': 'irene.adhiambo@student.univote.ac.ke','registration_number': 'BPSYCH/2022/059','phone': '0799001177','programme': 'BPSYCH','school': 'SSS', 'admission_date': date(2022, 8, 7),  'current_year': 3, 'student_id': 'STU2022059', 'national_id': '38901125'},
    {'full_name': 'Duncan Otieno Okeyo',         'email': 'duncan.otieno@student.univote.ac.ke', 'registration_number': 'BSCIT/2023/060', 'phone': '0700112288', 'programme': 'BSCIT', 'school': 'SET', 'admission_date': date(2023, 8, 7), 'current_year': 2, 'student_id': 'STU2023060', 'national_id': '40990011'},
]
# fmt: on

# ── Candidate profiles (index into STUDENTS list above) ───────────────────────
# Presidential tickets: each is a (president_idx, deputy_idx) pair
PRESIDENTIAL_TICKETS = [
    {
        'president': 0,    # Steve Ongera — SET
        'deputy':    11,   # Emmanuel Waweru — SBS
        'p_manifesto': (
            'My vision is a united, innovative and inclusive university community. '
            'I will champion affordable accommodation, strong mentorship programmes, '
            'and a student welfare fund accessible to all. Tech for students, by students.'
        ),
        'd_manifesto': (
            'As Deputy I will ensure every faculty voice is heard. '
            'Together we will bridge the gap between administration and students.'
        ),
    },
    {
        'president': 32,   # Patricia Nduta — SLA
        'deputy':    25,   # Kelvin Mbithi — SBS
        'p_manifesto': (
            'Justice, accountability and transparency in student governance. '
            'I will push for a student legal aid clinic, gender equity policies, '
            'and transparent budget reporting. Your voice, amplified.'
        ),
        'd_manifesto': (
            'Financial literacy for all students. '
            'We will create a student savings scheme and negotiate fee payment flexibility.'
        ),
    },
]

OTHER_CANDIDATES = [
    # Secretary General
    {'student_idx': 10, 'position': 'secretary_general', 'manifesto': 'Communication, coordination and clarity. I will digitize SRC minutes and hold monthly open forums.'},
    {'student_idx': 20, 'position': 'secretary_general', 'manifesto': 'A secretary general who listens. Weekly feedback sessions and a student suggestion portal.'},

    # Finance Director
    {'student_idx': 12, 'position': 'finance_director', 'manifesto': 'Zero-tolerance for financial mismanagement. Quarterly published accounts and student budget review committees.'},
    {'student_idx': 55, 'position': 'finance_director', 'manifesto': 'Smart student fund management. I will introduce a welfare emergency kitty and sports sponsorship grants.'},

    # School Governors
    {'student_idx': 6,  'position': 'governor', 'school': 'SET', 'manifesto': 'Modern labs, stronger industry partnerships and inter-school hackathons.'},
    {'student_idx': 7,  'position': 'governor', 'school': 'SET', 'manifesto': 'Better timetabling, open-source resources library and mental health support for tech students.'},
    {'student_idx': 15, 'position': 'governor', 'school': 'SBS', 'manifesto': 'Business incubation hub, alumni mentorship and strong career placement office.'},
    {'student_idx': 33, 'position': 'governor', 'school': 'SLA', 'manifesto': 'Moot court revival, legal aid clinic and debate championship fund.'},
    {'student_idx': 22, 'position': 'governor', 'school': 'SEd', 'manifesto': 'Teaching practicum support, education resource centre and professional development fund.'},
    {'student_idx': 27, 'position': 'governor', 'school': 'SHS', 'manifesto': 'Hospital placement support, scrubs subsidy and health research fund for undergrads.'},
    {'student_idx': 38, 'position': 'governor', 'school': 'SSS', 'manifesto': 'Community outreach programmes, psychology club and social work field support fund.'},

    # Programme Directors (MCA)
    {'student_idx': 1,  'position': 'mca', 'programme': 'BSCIT', 'manifesto': 'Industry-relevant curriculum updates, coding bootcamps and software licensing for students.'},
    {'student_idx': 3,  'position': 'mca', 'programme': 'BSCS', 'manifesto': 'Research grants, competitive programming clubs and CS seminar series.'},
    {'student_idx': 13, 'position': 'mca', 'programme': 'BCOM', 'manifesto': 'CPA study groups, industry visits and professional exam fee subsidies.'},

    # Senators
    {'student_idx': 4,  'position': 'senator', 'school': 'SET', 'manifesto': 'Voice of SET in senate — advocating for lab hours extension and equipment upgrades.'},
    {'student_idx': 16, 'position': 'senator', 'school': 'SBS', 'manifesto': 'Business students deserve more — pushing for Bloomberg terminal access and investment club.'},
    {'student_idx': 21, 'position': 'senator', 'school': 'SEd', 'manifesto': 'Education matters — campaigning for teaching resources allowance and practicum transport support.'},
    {'student_idx': 29, 'position': 'senator', 'school': 'SHS', 'manifesto': 'Health sciences senator — advocating for clinical equipment and NHIF registration support.'},
    {'student_idx': 34, 'position': 'senator', 'school': 'SLA', 'manifesto': 'Legal advocacy for students — pushing for fair examination policies and grievance mechanisms.'},
    {'student_idx': 41, 'position': 'senator', 'school': 'SSS', 'manifesto': 'Social sciences voice — campaigning for internship allowances and community project funding.'},
]

ANNOUNCEMENTS = [
    {
        'title': '📢 2024/2025 SRC Elections Now Open!',
        'body': (
            'We are pleased to announce that voting for the 2024/2025 Student Representative '
            'Council (SRC) Elections is now officially open. All registered and approved voters '
            'may cast their ballots through the UniVote Kenya portal. Voting closes in 48 hours. '
            'Your vote is secret, secure and constitutionally protected. Exercise your democratic right!'
        ),
        'category': 'election',
    },
    {
        'title': '⚠️ Voter Registration Deadline Reminder',
        'body': (
            'Students who have not yet registered as voters for the 2024/2025 elections are '
            'reminded that the registration window closes today at 11:59 PM. Log in to the portal, '
            'navigate to your dashboard, and click "Register as Voter". Your student ID is required. '
            'Late registrations will not be accepted.'
        ),
        'category': 'warning',
    },
    {
        'title': '✅ Results: 2023/2024 SRC Elections Published',
        'body': (
            'The official results of the 2023/2024 Student Representative Council Elections have '
            'been gazetted and published. Congratulations to all elected leaders. The incoming SRC '
            'will be inaugurated on 15th August 2024. Full results are viewable on the portal under '
            'Live Results.'
        ),
        'category': 'result',
    },
    {
        'title': '📋 Candidate Vetting Exercise — Notice to All Aspirants',
        'body': (
            'All students who have submitted their candidacy applications for the 2024/2025 '
            'SRC Elections are reminded to appear before the IEBC vetting committee on the '
            'scheduled dates. Failure to appear will result in automatic disqualification. '
            'Bring your student ID, registration certificate and two passport photos.'
        ),
        'category': 'election',
    },
    {
        'title': '📌 General: UniVote Kenya Portal User Guide',
        'body': (
            'New to UniVote Kenya? Here\'s how it works: (1) Log in with your email and '
            'registration number as your default password. (2) Change your password immediately. '
            '(3) Register as a voter when an election is active. (4) Await IEBC approval. '
            '(5) Cast your vote on election day. For support, email portal@univote.ac.ke.'
        ),
        'category': 'general',
    },
]


# ═══════════════════════════════════════════════════════════════════
# COMMAND CLASS
# ═══════════════════════════════════════════════════════════════════

class Command(BaseCommand):
    help = (
        'Seeds the UniVote Kenya database with realistic demo data.\n'
        'Creates admin, IEBC officials, 60 students, elections, '
        'candidates, voter registrations and announcements.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete ALL existing data before seeding (clean slate).',
        )
        parser.add_argument(
            '--votes',
            action='store_true',
            help='Simulate random votes from approved voters.',
        )

    # ── helpers ──────────────────────────────────────────────────────────────

    def ok(self, msg):
        self.stdout.write(self.style.SUCCESS(f'  ✓  {msg}'))

    def info(self, msg):
        self.stdout.write(self.style.WARNING(f'  →  {msg}'))

    def section(self, title):
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO(
            f'{'─' * 60}\n  {title}\n{'─' * 60}'
        ))

    # ── main handle ───────────────────────────────────────────────────────────

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO(
            '═' * 60 + '\n'
            '  UniVote Kenya — Database Seeder\n' +
            '═' * 60
        ))

        if options['flush']:
            self._flush()

        iebc_officer = self._create_staff()
        students      = self._create_students()
        election_now, election_past = self._create_elections(iebc_officer)
        candidates    = self._create_candidates(students, election_now, iebc_officer)
        self._create_voter_registrations(students, election_now, iebc_officer)
        self._create_past_election_data(students, election_past, iebc_officer)
        self._create_announcements(iebc_officer, election_now)

        if options['votes']:
            self._simulate_votes(students, election_now, candidates)

        self._print_summary(options['votes'])

    # ── flush ─────────────────────────────────────────────────────────────────

    def _flush(self):
        self.section('Flushing existing data')
        Vote.objects.all().delete();               self.info('Votes deleted')
        VoterRegistration.objects.all().delete();  self.info('Voter registrations deleted')
        Candidate.objects.all().delete();          self.info('Candidates deleted')
        Announcement.objects.all().delete();       self.info('Announcements deleted')
        Election.objects.all().delete();           self.info('Elections deleted')
        User.objects.all().delete();               self.info('Users deleted')

    # ── staff ─────────────────────────────────────────────────────────────────

    def _create_staff(self):
        self.section('Creating Admin & IEBC Officials')

        # Admin
        if not User.objects.filter(email=ADMIN_ACCOUNT['email']).exists():
            pwd = ADMIN_ACCOUNT.pop('password')
            admin = User.objects.create_user(password=pwd, **ADMIN_ACCOUNT)
            ADMIN_ACCOUNT['password'] = pwd
            self.ok(f"Admin: {admin.full_name}  |  {admin.email}  |  pw: {pwd}")
        else:
            admin = User.objects.get(email=ADMIN_ACCOUNT['email'])
            self.info(f'Admin already exists: {admin.email}')

        # IEBC officials
        iebc_users = []
        for data in IEBC_OFFICIALS:
            if not User.objects.filter(email=data['email']).exists():
                d = dict(data)
                pwd = d.pop('password')
                user = User.objects.create_user(password=pwd, **d)
                iebc_users.append(user)
                self.ok(f"IEBC: {user.full_name}  |  {user.email}  |  pw: {pwd}")
            else:
                user = User.objects.get(email=data['email'])
                iebc_users.append(user)
                self.info(f'IEBC already exists: {user.email}')

        return iebc_users[0]  # primary officer

    # ── students ──────────────────────────────────────────────────────────────

    def _create_students(self):
        self.section(f'Creating {len(STUDENTS)} Students')
        created = []
        skipped = 0
        for s in STUDENTS:
            if User.objects.filter(email=s['email']).exists():
                created.append(User.objects.get(email=s['email']))
                skipped += 1
                continue
            # Default password = registration_number
            user = User(
                full_name=s['full_name'],
                email=s['email'],
                registration_number=s['registration_number'],
                phone=s['phone'],
                programme=s['programme'],
                school=s['school'],
                admission_date=s['admission_date'],
                current_year=s['current_year'],
                student_id=s['student_id'],
                national_id=s['national_id'],
                role='student',
            )
            user.set_password(s['registration_number'])
            user.save()
            created.append(user)

        self.ok(f'{len(created) - skipped} new students created  |  {skipped} already existed')
        self.info(f'Sample login → email: {STUDENTS[0]["email"]}  |  pw: {STUDENTS[0]["registration_number"]}')
        return created

    # ── elections ─────────────────────────────────────────────────────────────

    def _create_elections(self, created_by):
        self.section('Creating Elections')
        now = timezone.now()

        # Active election
        el_active, created = Election.objects.get_or_create(
            title='2024/2025 SRC General Elections',
            defaults=dict(
                academic_year='2024/2025',
                description=(
                    'The annual Student Representative Council General Elections for the '
                    '2024/2025 academic year. Students elect their leaders across all '
                    'positions: President, Deputy, Secretary General, Finance Director, '
                    'School Governors, Programme Directors and School Senators.'
                ),
                voting_start=now - timedelta(hours=2),
                voting_end=now + timedelta(hours=46),
                status='active',
                created_by=created_by,
            ),
        )
        verb = 'Created' if created else 'Found'
        self.ok(f'{verb} ACTIVE election: {el_active.title}')

        # Past election (results published)
        el_past, created = Election.objects.get_or_create(
            title='2023/2024 SRC General Elections',
            defaults=dict(
                academic_year='2023/2024',
                description='Previous academic year SRC elections — results published.',
                voting_start=now - timedelta(days=365),
                voting_end=now - timedelta(days=364),
                status='results_out',
                created_by=created_by,
            ),
        )
        verb = 'Created' if created else 'Found'
        self.ok(f'{verb} PAST election: {el_past.title}  (status: results_out)')

        return el_active, el_past

    # ── candidates ────────────────────────────────────────────────────────────

    def _create_candidates(self, students, election, created_by):
        self.section('Creating Candidates (Active Election)')
        all_candidates = []

        # Presidential tickets
        for ticket in PRESIDENTIAL_TICKETS:
            p_student = students[ticket['president']]
            d_student = students[ticket['deputy']]

            pres, _ = Candidate.objects.get_or_create(
                election=election, student=p_student, position='president',
                defaults=dict(
                    school='',
                    manifesto=ticket['p_manifesto'],
                    is_approved=True,
                ),
            )
            dep, _ = Candidate.objects.get_or_create(
                election=election, student=d_student, position='deputy_president',
                defaults=dict(
                    school='',
                    manifesto=ticket['d_manifesto'],
                    is_approved=True,
                ),
            )
            # Link running mate
            if pres.running_mate is None:
                pres.running_mate = dep
                pres.save()

            all_candidates.extend([pres, dep])
            self.ok(
                f'Ticket: {p_student.full_name} (President)  ↔  {d_student.full_name} (Deputy)'
            )

        # Other candidates
        for c_data in OTHER_CANDIDATES:
            student = students[c_data['student_idx']]
            cand, created = Candidate.objects.get_or_create(
                election=election,
                student=student,
                position=c_data['position'],
                defaults=dict(
                    school=c_data.get('school', ''),
                    programme=c_data.get('programme', ''),
                    manifesto=c_data.get('manifesto', ''),
                    is_approved=True,
                ),
            )
            all_candidates.append(cand)
            if created:
                self.ok(
                    f'  {student.full_name:35s} → {cand.get_position_display()}'
                    + (f'  [{c_data.get("school", c_data.get("programme", ""))}]' if c_data.get('school') or c_data.get('programme') else '')
                )

        self.info(f'Total approved candidates: {len(all_candidates)}')
        return all_candidates

    # ── voter registrations ────────────────────────────────────────────────────

    def _create_voter_registrations(self, students, election, reviewed_by):
        self.section('Creating Voter Registrations (Active Election)')
        created_count = 0
        now = timezone.now()

        for student in students:
            reg, created = VoterRegistration.objects.get_or_create(
                student=student,
                election=election,
                defaults=dict(
                    student_id_number=student.student_id,
                    status='approved',
                    reviewed_at=now - timedelta(days=random.randint(1, 5)),
                    reviewed_by=reviewed_by,
                ),
            )
            if created:
                created_count += 1
                # Mark student as registered voter
                student.is_registered_voter = True
                student.save(update_fields=['is_registered_voter'])

        self.ok(
            f'{created_count} voter registrations created  |  '
            f'All {len(students)} students approved as voters'
        )

    # ── past election data ─────────────────────────────────────────────────────

    def _create_past_election_data(self, students, election, created_by):
        self.section('Creating Past Election Data (2023/2024)')
        now = timezone.now()
        past_base = now - timedelta(days=364)

        # Create a subset of candidates for past election
        past_pairs = [
            (students[5], students[14], 'president', 'deputy_president'),
        ]
        for p_s, d_s, p_pos, d_pos in past_pairs:
            pres, _ = Candidate.objects.get_or_create(
                election=election, student=p_s, position=p_pos,
                defaults=dict(manifesto='Past election manifesto.', is_approved=True),
            )
            dep, _ = Candidate.objects.get_or_create(
                election=election, student=d_s, position=d_pos,
                defaults=dict(manifesto='Past deputy manifesto.', is_approved=True),
            )
            if pres.running_mate is None:
                pres.running_mate = dep
                pres.save()

        # Secretary General past
        Candidate.objects.get_or_create(
            election=election, student=students[19], position='secretary_general',
            defaults=dict(manifesto='Past sec gen.', is_approved=True),
        )
        self.ok(f'Past election candidates created for: {election.title}')

        # Voter regs for past election (subset)
        for student in students[:30]:
            VoterRegistration.objects.get_or_create(
                student=student, election=election,
                defaults=dict(
                    student_id_number=student.student_id,
                    status='approved',
                    reviewed_at=past_base,
                    reviewed_by=created_by,
                ),
            )

        # Simulate some votes in past election
        past_cands = list(Candidate.objects.filter(election=election, is_approved=True))
        if past_cands:
            voters = students[:25]
            for voter in voters:
                for cand in past_cands:
                    if not Vote.objects.filter(election=election, voter=voter, position=cand.position).exists():
                        Vote.objects.create(
                            election=election, voter=voter,
                            candidate=cand, position=cand.position,
                        )
            self.ok(f'Past election votes simulated for {len(voters)} voters')

    # ── announcements ─────────────────────────────────────────────────────────

    def _create_announcements(self, created_by, election):
        self.section('Creating Announcements')
        for i, a in enumerate(ANNOUNCEMENTS):
            obj, created = Announcement.objects.get_or_create(
                title=a['title'],
                defaults=dict(
                    body=a['body'],
                    category=a['category'],
                    election=election if a['category'] in ('election', 'warning') else None,
                    created_by=created_by,
                    is_published=True,
                ),
            )
            if created:
                self.ok(f'[{a["category"].upper():8s}] {a["title"]}')

    # ── simulate votes ─────────────────────────────────────────────────────────

    def _simulate_votes(self, students, election, candidates):
        self.section('Simulating Votes (Active Election)')
        # Approved voter registrations for this election
        approved_regs = VoterRegistration.objects.filter(
            election=election, status='approved'
        ).select_related('student')

        # Group candidates by position
        by_position = {}
        for c in candidates:
            by_position.setdefault(c.position, []).append(c)

        # Give presidential tickets weighted probabilities (ticket 1 leads)
        pres_candidates = by_position.get('president', [])
        weights = self._build_weights(pres_candidates)

        total_voted = 0
        for reg in approved_regs:
            voter = reg.student
            # 80% voter turnout
            if random.random() > 0.80:
                continue
            # Skip if already voted
            if Vote.objects.filter(election=election, voter=voter).exists():
                continue

            for position, cands in by_position.items():
                if not cands:
                    continue
                # Skip deputy — linked to president
                if position == 'deputy_president':
                    continue
                # School-specific positions
                if position in ('governor', 'senator'):
                    school_cands = [c for c in cands if c.school == voter.school]
                    if not school_cands:
                        continue
                    chosen = random.choice(school_cands)
                elif position == 'mca':
                    prog_cands = [c for c in cands if c.programme == voter.programme]
                    if not prog_cands:
                        continue
                    chosen = random.choice(prog_cands)
                elif position == 'president':
                    # weighted
                    chosen = random.choices(cands, weights=weights[:len(cands)], k=1)[0]
                else:
                    chosen = random.choice(cands)

                Vote.objects.create(
                    election=election,
                    voter=voter,
                    candidate=chosen,
                    position=position,
                )
                # Auto deputy
                if position == 'president' and chosen.running_mate:
                    Vote.objects.create(
                        election=election,
                        voter=voter,
                        candidate=chosen.running_mate,
                        position='deputy_president',
                    )
            total_voted += 1

        total_votes = Vote.objects.filter(election=election).count()
        self.ok(f'{total_voted} students voted  |  {total_votes} total vote records created')

    @staticmethod
    def _build_weights(candidates):
        """Give first candidate ~60% weight, rest share 40%."""
        if not candidates:
            return []
        if len(candidates) == 1:
            return [1]
        base = [60] + [40 // (len(candidates) - 1)] * (len(candidates) - 1)
        return base

    # ── summary ───────────────────────────────────────────────────────────────

    def _print_summary(self, votes_simulated):
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO('═' * 60))
        self.stdout.write(self.style.SUCCESS('  ✅  Seed complete!'))
        self.stdout.write(self.style.HTTP_INFO('─' * 60))

        rows = [
            ('Users (total)',            User.objects.count()),
            ('  ↳ Students',             User.objects.filter(role='student').count()),
            ('  ↳ IEBC Officials',       User.objects.filter(role='iebc').count()),
            ('  ↳ Admins',               User.objects.filter(role='admin').count()),
            ('Elections',                Election.objects.count()),
            ('Candidates',               Candidate.objects.count()),
            ('Voter Registrations',      VoterRegistration.objects.count()),
            ('Votes Cast',               Vote.objects.count()),
            ('Announcements',            Announcement.objects.count()),
        ]
        for label, count in rows:
            self.stdout.write(f'  {label:<30s} {count}')

        self.stdout.write(self.style.HTTP_INFO('─' * 60))
        self.stdout.write('  📋  Login Credentials')
        self.stdout.write(self.style.HTTP_INFO('─' * 60))
        self.stdout.write(f'  Admin   → {ADMIN_ACCOUNT["email"]}  |  pw: admin123')
        self.stdout.write(f'  IEBC    → {IEBC_OFFICIALS[0]["email"]}  |  pw: Iebc@2024')
        self.stdout.write(f'  Student → {STUDENTS[0]["email"]}')
        self.stdout.write(f'            pw: {STUDENTS[0]["registration_number"]}  (reg no.)')
        self.stdout.write(self.style.HTTP_INFO('═' * 60))
        self.stdout.write('')