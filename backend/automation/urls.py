from __future__ import annotations

from django.urls import path

from automation.views import AutomationEventListView, AutomationRuleDetailView, AutomationRuleListCreateView


urlpatterns = [
    path("automation/rules/", AutomationRuleListCreateView.as_view(), name="automation-rule-list"),
    path("automation/rules/<int:rule_id>/", AutomationRuleDetailView.as_view(), name="automation-rule-detail"),
    path("automation/events/", AutomationEventListView.as_view(), name="automation-event-list"),
]
