from __future__ import annotations

from django.urls import path

from attendance.views import (
    AttendanceOccupancyView,
    AttendanceRecordDetailView,
    AttendanceRecordListCreateView,
)

urlpatterns = [
    path("attendance/", AttendanceRecordListCreateView.as_view(), name="attendance-list"),
    path("attendance/occupancy/", AttendanceOccupancyView.as_view(), name="attendance-occupancy"),
    path("attendance/<int:attendance_id>/", AttendanceRecordDetailView.as_view(), name="attendance-detail"),
]
