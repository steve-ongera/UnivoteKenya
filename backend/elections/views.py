from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.db.models import Count

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import (
    User, Election, Candidate, Vote, VoterRegistration, Announcement,
    POSITION_CHOICES, SCHOOL_CHOICES, PROGRAMME_CHOICES
)
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer,
    IEBCRegisterStudentSerializer, ElectionSerializer, CandidateSerializer,
    CastVoteSerializer, VoterRegistrationSerializer, AnnouncementSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)


# ─── Permissions ──────────────────────────────────────────────────────────────

class IsIEBCOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('iebc', 'admin')


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


# ─── Auth ViewSet ──────────────────────────────────────────────────────────────

class AuthViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        profile = UserProfileSerializer(user, context={'request': request})
        return Response({'token': token.key, 'user': profile.data})

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({'message': 'Logged out.'})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        s = UserProfileSerializer(request.user, context={'request': request})
        return Response(s.data)

    @action(detail=False, methods=['post'], url_path='password-reset')
    def password_reset(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=s.validated_data['email'])
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
            send_mail(
                subject='UniVote Kenya – Password Reset',
                message=f"""
Dear {user.full_name},

You requested a password reset for your UniVote Kenya account.

Click the link below to reset your password (valid for 24 hours):
{reset_url}

If you did not request this, please ignore this email.

— UniVote Kenya Electoral Commission
                """,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except User.DoesNotExist:
            pass  # Don't reveal whether email exists
        return Response({'message': 'If that email exists, a reset link has been sent.'})

    @action(detail=False, methods=['post'], url_path='password-reset-confirm')
    def password_reset_confirm(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.validated_data['user']
        user.set_password(s.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password reset successful. You can now log in.'})


# ─── Student ViewSet ───────────────────────────────────────────────────────────

class StudentViewSet(viewsets.GenericViewSet):
    """Student self-service: register as voter, cast vote, view results."""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='register-voter')
    def register_voter(self, request):
        """Student submits voter registration for an election."""
        election_id = request.data.get('election_id')
        student_id_number = request.data.get('student_id_number')
        try:
            election = Election.objects.get(id=election_id)
        except Election.DoesNotExist:
            return Response({'error': 'Election not found.'}, status=400)

        if VoterRegistration.objects.filter(student=request.user, election=election).exists():
            return Response({'error': 'Already registered for this election.'}, status=400)

        reg = VoterRegistration.objects.create(
            student=request.user,
            election=election,
            student_id_number=student_id_number or request.user.student_id,
        )
        return Response(VoterRegistrationSerializer(reg).data, status=201)

    @action(detail=False, methods=['post'], url_path='cast-vote')
    def cast_vote(self, request):
        """Cast multiple votes at once (one per position)."""
        s = CastVoteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        election = s.validated_data['election']
        voter = request.user

        # Check voter is approved
        reg = VoterRegistration.objects.filter(
            student=voter, election=election, status='approved'
        ).first()
        if not reg:
            return Response({'error': 'You are not an approved voter for this election.'}, status=403)

        created_votes = []
        errors = []
        for vote_item in s.validated_data['votes']:
            position = vote_item.get('position')
            candidate_id = vote_item.get('candidate_id')

            if Vote.objects.filter(election=election, voter=voter, position=position).exists():
                errors.append(f'Already voted for {position}')
                continue

            try:
                candidate = Candidate.objects.get(
                    id=candidate_id, election=election,
                    position=position, is_approved=True
                )
            except Candidate.DoesNotExist:
                errors.append(f'Invalid candidate for {position}')
                continue

            vote = Vote.objects.create(
                election=election, voter=voter,
                candidate=candidate, position=position
            )
            created_votes.append(vote.id)

            # Auto-vote for deputy if president selected
            if position == 'president' and candidate.running_mate:
                if not Vote.objects.filter(
                    election=election, voter=voter, position='deputy_president'
                ).exists():
                    Vote.objects.create(
                        election=election, voter=voter,
                        candidate=candidate.running_mate,
                        position='deputy_president'
                    )

        return Response({
            'votes_cast': len(created_votes),
            'errors': errors,
            'message': 'Your votes have been recorded successfully.',
        })

    @action(detail=False, methods=['get'], url_path='my-votes')
    def my_votes(self, request):
        election_id = request.query_params.get('election_id')
        votes = Vote.objects.filter(voter=request.user)
        if election_id:
            votes = votes.filter(election_id=election_id)
        data = [{'position': v.position, 'candidate_id': v.candidate_id} for v in votes]
        return Response(data)

    @action(detail=False, methods=['get'], url_path='voter-status')
    def voter_status(self, request):
        election_id = request.query_params.get('election_id')
        reg = VoterRegistration.objects.filter(
            student=request.user, election_id=election_id
        ).first()
        if not reg:
            return Response({'status': 'not_registered'})
        return Response(VoterRegistrationSerializer(reg).data)


# ─── Election ViewSet ──────────────────────────────────────────────────────────

class ElectionViewSet(viewsets.ModelViewSet):
    queryset = Election.objects.all()
    serializer_class = ElectionSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'live_results', 'positions'):
            return [permissions.IsAuthenticated()]
        return [IsIEBCOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='live-results')
    def live_results(self, request, pk=None):
        election = self.get_object()
        results = []
        positions_to_show = [p[0] for p in POSITION_CHOICES]

        for pos_code, pos_display in POSITION_CHOICES:
            candidates = Candidate.objects.filter(
                election=election, position=pos_code, is_approved=True
            ).annotate(vc=Count('votes')).order_by('-vc')

            total = sum(c.vc for c in candidates)
            c_data = []
            for c in candidates:
                c_data.append({
                    'id': c.id,
                    'name': c.student.full_name,
                    'programme': c.student.get_programme_display(),
                    'school': c.student.get_school_display(),
                    'year': c.student.current_year,
                    'photo': request.build_absolute_uri(c.photo.url) if c.photo else (
                        request.build_absolute_uri(c.student.profile_photo.url)
                        if c.student.profile_photo else None
                    ),
                    'votes': c.vc,
                    'percentage': round((c.vc / total * 100), 1) if total > 0 else 0,
                    'running_mate': c.running_mate.student.full_name if c.running_mate else None,
                    'manifesto': c.manifesto,
                    'school_scope': c.school,
                    'programme_scope': c.programme,
                })
            if c_data:
                results.append({
                    'position': pos_code,
                    'position_display': pos_display,
                    'candidates': c_data,
                    'total_votes': total,
                    'winner': c_data[0] if c_data and election.status in ('closed', 'results_out') else None,
                })

        total_voters = VoterRegistration.objects.filter(
            election=election, status='approved'
        ).count()
        votes_cast = Vote.objects.filter(election=election).values('voter').distinct().count()

        return Response({
            'election': ElectionSerializer(election).data,
            'results': results,
            'total_approved_voters': total_voters,
            'total_voted': votes_cast,
            'turnout': round((votes_cast / total_voters * 100), 1) if total_voters > 0 else 0,
        })

    @action(detail=False, methods=['get'])
    def active(self, request):
        now = timezone.now()
        elections = Election.objects.filter(status='active')
        return Response(ElectionSerializer(elections, many=True).data)


# ─── Candidate ViewSet ────────────────────────────────────────────────────────

class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.filter(is_approved=True)
    serializer_class = CandidateSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsIEBCOrAdmin()]

    def get_queryset(self):
        qs = Candidate.objects.all()
        election_id = self.request.query_params.get('election_id')
        position = self.request.query_params.get('position')
        school = self.request.query_params.get('school')
        approved_only = self.request.query_params.get('approved', 'true')

        if election_id:
            qs = qs.filter(election_id=election_id)
        if position:
            qs = qs.filter(position=position)
        if school:
            qs = qs.filter(school=school)
        if approved_only == 'true':
            qs = qs.filter(is_approved=True)

        return qs.annotate(vc=Count('votes')).order_by('position')

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        candidate = self.get_object()
        candidate.is_approved = True
        candidate.save()
        return Response({'message': 'Candidate approved.'})

    @action(detail=True, methods=['post'], url_path='set-running-mate')
    def set_running_mate(self, request, pk=None):
        president = self.get_object()
        deputy_id = request.data.get('deputy_id')
        try:
            deputy = Candidate.objects.get(id=deputy_id, position='deputy_president',
                                           election=president.election)
            president.running_mate = deputy
            president.save()
            return Response({'message': 'Running mate linked.'})
        except Candidate.DoesNotExist:
            return Response({'error': 'Deputy candidate not found.'}, status=400)


# ─── IEBC ViewSet ─────────────────────────────────────────────────────────────

class IEBCViewSet(viewsets.GenericViewSet):
    permission_classes = [IsIEBCOrAdmin]

    @action(detail=False, methods=['get', 'post'], url_path='students')
    def students(self, request):
        if request.method == 'GET':
            students = User.objects.filter(role='student').order_by('full_name')
            programme = request.query_params.get('programme')
            school = request.query_params.get('school')
            search = request.query_params.get('search')
            if programme:
                students = students.filter(programme=programme)
            if school:
                students = students.filter(school=school)
            if search:
                students = students.filter(full_name__icontains=search)
            s = UserProfileSerializer(students, many=True, context={'request': request})
            return Response(s.data)

        # POST – register new student
        s = IEBCRegisterStudentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(
            UserProfileSerializer(user, context={'request': request}).data,
            status=201
        )

    @action(detail=False, methods=['get'], url_path='voter-registrations')
    def voter_registrations(self, request):
        election_id = request.query_params.get('election_id')
        status_filter = request.query_params.get('status')
        regs = VoterRegistration.objects.select_related('student', 'election')
        if election_id:
            regs = regs.filter(election_id=election_id)
        if status_filter:
            regs = regs.filter(status=status_filter)
        s = VoterRegistrationSerializer(regs, many=True)
        return Response(s.data)

    @action(detail=False, methods=['post'], url_path='voter-registrations/(?P<reg_id>[^/.]+)/review')
    def review_registration(self, request, reg_id=None):
        try:
            reg = VoterRegistration.objects.get(id=reg_id)
        except VoterRegistration.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        action_taken = request.data.get('action')  # 'approve' or 'reject'
        if action_taken == 'approve':
            reg.status = 'approved'
            reg.student.is_registered_voter = True
            reg.student.save()
        elif action_taken == 'reject':
            reg.status = 'rejected'
            reg.rejection_reason = request.data.get('reason', '')
        else:
            return Response({'error': 'Invalid action.'}, status=400)

        reg.reviewed_at = timezone.now()
        reg.reviewed_by = request.user
        reg.save()
        return Response(VoterRegistrationSerializer(reg).data)

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def dashboard_stats(self, request):
        total_students = User.objects.filter(role='student').count()
        total_voters = User.objects.filter(is_registered_voter=True).count()
        active_elections = Election.objects.filter(status='active').count()
        pending_regs = VoterRegistration.objects.filter(status='pending').count()
        total_votes = Vote.objects.count()

        return Response({
            'total_students': total_students,
            'registered_voters': total_voters,
            'active_elections': active_elections,
            'pending_registrations': pending_regs,
            'total_votes_cast': total_votes,
        })


# ─── Announcement ViewSet ─────────────────────────────────────────────────────

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.filter(is_published=True)
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [IsIEBCOrAdmin()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ─── Choices ViewSet ─────────────────────────────────────────────────────────

class ChoicesViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def all(self, request):
        return Response({
            'positions': [{'value': p[0], 'label': p[1]} for p in POSITION_CHOICES],
            'schools': [{'value': s[0], 'label': s[1]} for s in SCHOOL_CHOICES],
            'programmes': [{'value': p[0], 'label': p[1]} for p in PROGRAMME_CHOICES],
        })