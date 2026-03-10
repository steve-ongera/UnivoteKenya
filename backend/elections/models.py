from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


# ─── Choices ──────────────────────────────────────────────────────────────────

PROGRAMME_CHOICES = [
    ('BSCIT', 'Bachelor of Science in Information Technology'),
    ('BSCS', 'Bachelor of Science in Computer Science'),
    ('BBA', 'Bachelor of Business Administration'),
    ('BCOM', 'Bachelor of Commerce'),
    ('BED', 'Bachelor of Education'),
    ('BENG', 'Bachelor of Engineering'),
    ('BARCH', 'Bachelor of Architecture'),
    ('BLAW', 'Bachelor of Laws'),
    ('BMED', 'Bachelor of Medicine'),
    ('BNURS', 'Bachelor of Nursing'),
    ('BSC', 'Bachelor of Science'),
    ('BPHARM', 'Bachelor of Pharmacy'),
    ('BPSYCH', 'Bachelor of Psychology'),
    ('BSOC', 'Bachelor of Social Work'),
    ('BJOUR', 'Bachelor of Journalism'),
]

SCHOOL_CHOICES = [
    ('SET', 'School of Engineering & Technology'),
    ('SBS', 'School of Business Studies'),
    ('SEd', 'School of Education'),
    ('SHS', 'School of Health Sciences'),
    ('SLA', 'School of Law & Arts'),
    ('SSS', 'School of Social Sciences'),
]

POSITION_CHOICES = [
    ('president', 'Student President'),
    ('deputy_president', 'Deputy President'),
    ('secretary_general', 'Secretary General'),
    ('finance_director', 'Finance Director'),
    ('governor', 'School Governor'),
    ('mca', 'Programme Director (MCA)'),
    ('senator', 'School Senator'),
]

YEAR_CHOICES = [(i, f'Year {i}') for i in range(1, 6)]


# ─── User Manager ─────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, email, registration_number, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, registration_number=registration_number, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, registration_number, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('role', 'admin')
        return self.create_user(email, registration_number, password, **extra)


# ─── User ─────────────────────────────────────────────────────────────────────

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('iebc', 'IEBC Official'),
        ('admin', 'Admin'),
    ]

    email = models.EmailField(unique=True)
    registration_number = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15)
    programme = models.CharField(max_length=20, choices=PROGRAMME_CHOICES, blank=True)
    school = models.CharField(max_length=10, choices=SCHOOL_CHOICES, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    current_year = models.IntegerField(choices=YEAR_CHOICES, default=1)
    student_id = models.CharField(max_length=30, blank=True)  # physical ID card number
    national_id = models.CharField(max_length=20, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    is_registered_voter = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['registration_number', 'full_name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.full_name} ({self.registration_number})"

    @property
    def first_name(self):
        return self.full_name.split()[0] if self.full_name else ''


# ─── Election ─────────────────────────────────────────────────────────────────

class Election(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active / Voting Open'),
        ('closed', 'Closed'),
        ('results_out', 'Results Published'),
    ]

    title = models.CharField(max_length=200)
    academic_year = models.CharField(max_length=20)  # e.g. 2024/2025
    description = models.TextField(blank=True)
    voting_start = models.DateTimeField()
    voting_end = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='elections_created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.academic_year})"

    @property
    def is_voting_open(self):
        now = timezone.now()
        return self.status == 'active' and self.voting_start <= now <= self.voting_end


# ─── Candidate ────────────────────────────────────────────────────────────────

class Candidate(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='candidates')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidacies')
    position = models.CharField(max_length=30, choices=POSITION_CHOICES)
    school = models.CharField(max_length=10, choices=SCHOOL_CHOICES, blank=True,
                              help_text='Required for school-specific positions')
    programme = models.CharField(max_length=20, choices=PROGRAMME_CHOICES, blank=True,
                                 help_text='Required for MCA (Programme Director)')

    manifesto = models.TextField(blank=True)
    photo = models.ImageField(upload_to='candidates/', null=True, blank=True)
    running_mate = models.OneToOneField(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='running_mate_of',
        help_text='Deputy President linked to President'
    )
    is_approved = models.BooleanField(default=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('election', 'student', 'position')
        ordering = ['position', 'student__full_name']

    def __str__(self):
        return f"{self.student.full_name} for {self.get_position_display()} – {self.election}"

    @property
    def vote_count(self):
        return self.votes.count()


# ─── Vote ─────────────────────────────────────────────────────────────────────

class Vote(models.Model):
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='votes')
    voter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes_cast')
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='votes')
    position = models.CharField(max_length=30, choices=POSITION_CHOICES)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One vote per position per election per voter
        unique_together = ('election', 'voter', 'position')
        ordering = ['-voted_at']

    def __str__(self):
        return f"{self.voter.full_name} → {self.candidate.student.full_name} ({self.position})"


# ─── Voter Registration ────────────────────────────────────────────────────────

class VoterRegistration(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voter_registrations')
    election = models.ForeignKey(Election, on_delete=models.CASCADE, related_name='voter_registrations')
    student_id_number = models.CharField(max_length=30)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='registrations_reviewed'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)

    class Meta:
        unique_together = ('student', 'election')

    def __str__(self):
        return f"{self.student.full_name} – {self.election} [{self.status}]"


# ─── Announcement ─────────────────────────────────────────────────────────────

class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('election', 'Election Notice'),
        ('result', 'Result Announcement'),
        ('warning', 'Warning'),
    ]
    title = models.CharField(max_length=200)
    body = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    election = models.ForeignKey(Election, null=True, blank=True, on_delete=models.SET_NULL)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title