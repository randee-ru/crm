from __future__ import annotations

from django.urls import include, path

from accounts.views import AcceptInvitationView, LoginView, LogoutView, MeView

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/accept-invite/", AcceptInvitationView.as_view(), name="auth-accept-invite"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("", include("accounts.staff_urls")),
]
