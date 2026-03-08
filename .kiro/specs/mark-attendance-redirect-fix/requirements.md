# Requirements Document: Mark Attendance Redirect Fix

## Introduction

The mark attendance redirect feature is currently broken. When a facilitator clicks "Go to Attendance Page" from the today's session view, the URL returns a 404 error. The issue occurs because the redirect logic attempts to find an `ActualSession` for a `PlannedSession`, but the URL pattern expects an `actual_session_id` parameter that is not being passed correctly.

## Glossary

- **PlannedSession**: A session that is scheduled for a class on a specific day number
- **ActualSession**: A session that has been started/conducted by a facilitator
- **Facilitator**: A user with the role of conducting sessions and marking attendance
- **Attendance**: The record of student presence/absence in a session

## Requirements

### Requirement 1

**User Story:** As a facilitator, I want to mark attendance for a session, so that I can record which students were present or absent.

#### Acceptance Criteria

1. WHEN a facilitator clicks "Go to Attendance Page" button THEN the system SHALL redirect to the mark attendance page with the correct actual_session_id
2. WHEN a facilitator has not yet started a session THEN the system SHALL prevent access to the attendance page and show an appropriate message
3. WHEN a facilitator has started a session THEN the system SHALL make the attendance page accessible with the correct session ID
4. WHEN the mark_attendance_redirect receives a planned_session_id THEN the system SHALL find the corresponding actual_session and redirect to the correct URL
5. IF no actual_session exists for a planned_session THEN the system SHALL redirect back to today_session with a clear message explaining that the session must be started first

### Requirement 2

**User Story:** As a facilitator, I want the attendance button to be visible only when appropriate, so that I don't attempt to mark attendance before starting a session.

#### Acceptance Criteria

1. WHEN a session has not been started THEN the system SHALL hide the "Go to Attendance Page" button
2. WHEN a session has been started and is in "conducted" status THEN the system SHALL show the "Go to Attendance Page" button
3. WHEN a session has been cancelled or marked as holiday THEN the system SHALL hide the "Go to Attendance Page" button
4. WHEN a session is grouped with other classes THEN the system SHALL show the attendance button for all classes in the group after any class in the group starts the session
