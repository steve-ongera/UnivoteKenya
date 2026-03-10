from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthViewSet, StudentViewSet, ElectionViewSet,
    CandidateViewSet, IEBCViewSet, AnnouncementViewSet, ChoicesViewSet
)

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'student', StudentViewSet, basename='student')
router.register(r'elections', ElectionViewSet, basename='elections')
router.register(r'candidates', CandidateViewSet, basename='candidates')
router.register(r'iebc', IEBCViewSet, basename='iebc')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')
router.register(r'choices', ChoicesViewSet, basename='choices')

urlpatterns = [
    path('', include(router.urls)),
    # Custom IEBC registration review URL
    path(
        'iebc/voter-registrations/<int:reg_id>/review/',
        IEBCViewSet.as_view({'post': 'review_registration'}),
        name='review-registration'
    ),
]