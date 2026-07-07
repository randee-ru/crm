from __future__ import annotations

from django.urls import path

from memberships.views import MembershipDetailView, MembershipListCreateView

urlpatterns = [
    path("memberships/", MembershipListCreateView.as_view(), name="membership-list"),
    path("memberships/<int:membership_id>/", MembershipDetailView.as_view(), name="membership-detail"),
]
