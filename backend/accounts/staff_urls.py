from __future__ import annotations

from django.urls import path

from accounts.staff_views import (
    StaffDashboardView,
    StaffInvitationDetailView,
    StaffInvitationListCreateView,
    StaffMembershipDetailView,
)

urlpatterns = [
    path("staff/dashboard/", StaffDashboardView.as_view(), name="staff-dashboard"),
    path("staff/memberships/<int:membership_id>/", StaffMembershipDetailView.as_view(), name="staff-membership-detail"),
    path("staff/invitations/", StaffInvitationListCreateView.as_view(), name="staff-invitations"),
    path("staff/invitations/<int:invitation_id>/", StaffInvitationDetailView.as_view(), name="staff-invitation-detail"),
]
