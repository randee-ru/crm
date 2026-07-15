from __future__ import annotations

from django.urls import path

from clients.views import (
    BranchListView,
    ClientDetailView,
    ClientListCreateView,
    ClientNoteDetailView,
    ClientNoteListCreateView,
    ClientOptionsView,
    ClientProfileView,
    CompanyContextView,
)

urlpatterns = [
    path("clients/", ClientListCreateView.as_view(), name="client-list"),
    path("clients/options/", ClientOptionsView.as_view(), name="client-options"),
    path("clients/<int:client_id>/", ClientDetailView.as_view(), name="client-detail"),
    path("clients/<int:client_id>/profile/", ClientProfileView.as_view(), name="client-profile"),
    path("clients/<int:client_id>/notes/", ClientNoteListCreateView.as_view(), name="client-notes"),
    path("clients/<int:client_id>/notes/<int:note_id>/", ClientNoteDetailView.as_view(), name="client-note-detail"),
    path("branches/", BranchListView.as_view(), name="branch-list"),
    path("company/", CompanyContextView.as_view(), name="company-context"),
]
