from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from .models import (
    User, Election, Candidate, Vote, VoterRegistration, Announcement
)


# ─── Auth ──────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'full_name', 'email', 'registration_number', 'phone',
            'programme', 'school', 'admission_date', 'current_year',
            'student_id', 'national_id', 'profile_photo',
            'password', 'password2',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['email'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    profile_photo = serializers.SerializerMethodField()
    programme_display = serializers.CharField(source='get_programme_display', read_only=True)
    school_display = serializers.CharField(source='get_school_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'registration_number', 'phone',
            'programme', 'programme_display', 'school', 'school_display',
            'admission_date', 'current_year', 'student_id', 'national_id',
            'profile_photo', 'role', 'is_registered_voter', 'date_joined',
        ]

    def get_profile_photo(self, obj):
        request = self.context.get('request')
        if obj.profile_photo and request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return None


class IEBCRegisterStudentSerializer(serializers.ModelSerializer):
    """IEBC officer creates/registers a student account."""
    class Meta:
        model = User
        fields = [
            'full_name', 'email', 'registration_number', 'phone',
            'programme', 'school', 'admission_date', 'current_year',
            'student_id', 'national_id',
        ]

    def create(self, validated_data):
        # Default password = registration_number
        reg_no = validated_data['registration_number']
        user = User(**validated_data)
        user.set_password(reg_no)
        user.role = 'student'
        user.save()
        return user


# ─── Election ─────────────────────────────────────────────────────────────────

class ElectionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_voting_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Election
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


# ─── Candidate ────────────────────────────────────────────────────────────────

class CandidateSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)
    student_programme = serializers.CharField(source='student.programme', read_only=True)
    student_school = serializers.CharField(source='student.school', read_only=True)
    position_display = serializers.CharField(source='get_position_display', read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    photo_url = serializers.SerializerMethodField()
    running_mate_name = serializers.SerializerMethodField()
    running_mate_id = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = '__all__'
        read_only_fields = ['registered_at']

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        if obj.student.profile_photo and request:
            return request.build_absolute_uri(obj.student.profile_photo.url)
        return None

    def get_running_mate_name(self, obj):
        if obj.running_mate:
            return obj.running_mate.student.full_name
        return None

    def get_running_mate_id(self, obj):
        if obj.running_mate:
            return obj.running_mate.id
        return None


# ─── Vote ─────────────────────────────────────────────────────────────────────

class CastVoteSerializer(serializers.Serializer):
    election_id = serializers.IntegerField()
    votes = serializers.ListField(
        child=serializers.DictField()
    )
    # votes = [{"position": "president", "candidate_id": 3}, ...]

    def validate(self, attrs):
        try:
            election = Election.objects.get(id=attrs['election_id'])
        except Election.DoesNotExist:
            raise serializers.ValidationError('Election not found.')
        if not election.is_voting_open:
            raise serializers.ValidationError('Voting is not currently open.')
        attrs['election'] = election
        return attrs


class VoteResultSerializer(serializers.Serializer):
    """Returns live results per position."""
    position = serializers.CharField()
    position_display = serializers.CharField()
    candidates = CandidateSerializer(many=True)
    total_votes = serializers.IntegerField()


# ─── Voter Registration ────────────────────────────────────────────────────────

class VoterRegistrationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_reg = serializers.CharField(source='student.registration_number', read_only=True)
    student_programme = serializers.CharField(source='student.get_programme_display', read_only=True)
    student_school = serializers.CharField(source='student.get_school_display', read_only=True)
    student_year = serializers.IntegerField(source='student.current_year', read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)

    class Meta:
        model = VoterRegistration
        fields = '__all__'
        read_only_fields = ['student', 'submitted_at', 'reviewed_at', 'reviewed_by']


# ─── Announcement ─────────────────────────────────────────────────────────────

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at']


# ─── Password Reset ───────────────────────────────────────────────────────────

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=6)
    new_password2 = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError('Passwords do not match.')
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uidb64']))
            user = User.objects.get(pk=uid)
        except Exception:
            raise serializers.ValidationError('Invalid reset link.')
        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError('Reset link is expired or invalid.')
        attrs['user'] = user
        return attrs