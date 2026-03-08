# Requirements Document: Previous Day Attendance Preset

## Introduction

Facilitators need to quickly populate attendance for the current session by copying attendance data from the previous day's session. This feature reduces manual data entry when attendance patterns are similar across consecutive days, while allowing facilitators to override any values before saving.

## Glossary

- **Attendance Status**: Present (1), Absent (2), or Leave (3)
- **Enrollment**: A student's registration in a specific class section
- **Actual Session**: A specific instance of a planned session on a particular date
- **Planned Session**: A template session that occurs on specific days
- **Grouped Session**: Multiple class sections conducting the same session together
- **Previous Day Session**: The most recent actual session before the current one for the same class(es)

## Requirements

### Requirement 1

**User Story:** As a facilitator, I want to load the previous day's attendance with one click, so that I can quickly populate attendance for today without manually re-entering data.

#### Acceptance Criteria

1. WHEN a facilitator clicks the "Previous day" button THEN the system SHALL fetch the most recent prior session for the same class(es) and populate all attendance dropdowns with the previous day's values
2. WHEN the previous day's attendance is loaded THEN the system SHALL display a confirmation message showing how many students' attendance was populated
3. WHEN no previous session exists THEN the system SHALL display an informational message indicating no previous attendance data is available
4. WHEN the previous day's attendance is loaded THEN the system SHALL allow the facilitator to modify any pre-filled values before saving
5. WHEN a facilitator loads previous day attendance THEN the system SHALL preserve any observation notes (visible and invisible changes) from the previous session

### Requirement 2

**User Story:** As a facilitator, I want to see which students had their attendance pre-filled from the previous day, so that I can verify the data is correct.

#### Acceptance Criteria

1. WHEN previous day attendance is loaded THEN the system SHALL visually highlight rows that were pre-filled with a distinct background color
2. WHEN a facilitator modifies a pre-filled value THEN the system SHALL remove the highlight from that row
3. WHEN the page loads with pre-filled data THEN the system SHALL display a summary showing the count of pre-filled present, absent, and leave statuses

### Requirement 3

**User Story:** As a facilitator using grouped sessions, I want the previous day button to work correctly across multiple class sections, so that all students in the grouped session get their attendance pre-filled.

#### Acceptance Criteria

1. WHEN a grouped session has multiple class sections THEN the system SHALL fetch previous attendance for all students across all class sections in the group
2. WHEN previous attendance is loaded for a grouped session THEN the system SHALL organize the pre-filled data by class section, maintaining the same structure as the current session
3. WHEN a grouped session has no previous grouped session THEN the system SHALL attempt to find individual class sessions from the previous day as fallback

