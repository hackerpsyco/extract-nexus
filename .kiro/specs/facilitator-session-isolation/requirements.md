# Requirements Document: Facilitator Session Isolation

## Introduction

When multiple facilitators log in simultaneously to the system, their session data is getting mixed up. Facilitators see other facilitators' names, dashboard data, and personal information in their own dashboards. This is a critical security and usability issue that requires proper session isolation and cache management to ensure each facilitator only sees their own data.

## Glossary

- **Session**: A unique user connection to the application, identified by a session ID
- **Facilitator**: A user with the facilitator role who manages classes and students
- **Cache Key**: A unique identifier used to store and retrieve cached data
- **Session Isolation**: Ensuring that each user's session is completely separate and cannot access other users' data
- **Request Context**: The current HTTP request and associated user information
- **Dashboard**: The main landing page for a facilitator showing their statistics and data

## Requirements

### Requirement 1

**User Story:** As a facilitator, I want my session to be completely isolated from other facilitators' sessions, so that I only see my own data and personal information.

#### Acceptance Criteria

1. WHEN a facilitator logs in THEN the system SHALL create a unique session with a session ID that cannot be guessed or reused by other users
2. WHEN a facilitator views their dashboard THEN the system SHALL display only data belonging to that specific facilitator, never data from other facilitators
3. WHEN multiple facilitators are logged in simultaneously THEN the system SHALL maintain separate session contexts for each facilitator with no data leakage between sessions
4. WHEN a facilitator's session expires THEN the system SHALL clear all cached data associated with that session and prevent access to protected pages
5. IF a facilitator attempts to access another facilitator's data through URL manipulation THEN the system SHALL deny access and redirect to their own dashboard

### Requirement 2

**User Story:** As a system administrator, I want cache keys to be unique per user and per request context, so that cached data is never shared between different facilitators.

#### Acceptance Criteria

1. WHEN caching dashboard data THEN the system SHALL include the facilitator's user ID in the cache key to ensure uniqueness
2. WHEN a facilitator's session ends THEN the system SHALL invalidate all cache entries associated with that facilitator
3. WHEN multiple facilitators request the same page simultaneously THEN the system SHALL serve each facilitator their own cached data, not a shared cache
4. WHEN a facilitator logs out THEN the system SHALL clear all localStorage, sessionStorage, and server-side cache entries for that user

### Requirement 3

**User Story:** As a facilitator, I want to be confident that my personal information (name, email, schools, classes) is never displayed to other facilitators, so that my privacy is protected.

#### Acceptance Criteria

1. WHEN rendering any template THEN the system SHALL use request.user context to retrieve the current facilitator's information, never from cached or global state
2. WHEN displaying the facilitator's name in the dashboard header THEN the system SHALL retrieve it directly from the authenticated request object, not from cache
3. WHEN a facilitator navigates between pages THEN the system SHALL verify that the request.user matches the data being displayed before rendering
4. WHEN session data is stored in localStorage or sessionStorage THEN the system SHALL include a session ID that is validated on each page load

### Requirement 4

**User Story:** As a developer, I want clear session management patterns and utilities, so that session isolation is consistently applied across all views.

#### Acceptance Criteria

1. WHEN a facilitator logs in THEN the system SHALL execute a session initialization function that sets up proper session context and clears any previous session data
2. WHEN a view requires facilitator access THEN the system SHALL use a decorator that validates the current request.user and prevents cross-user data access
3. WHEN building cache keys THEN the system SHALL use a utility function that includes request.user.id to ensure uniqueness
4. WHEN a facilitator logs out THEN the system SHALL execute a comprehensive cleanup function that clears all session data, cache entries, and storage

