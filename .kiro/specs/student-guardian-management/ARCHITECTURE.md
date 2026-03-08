# Student Guardian Management - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FACILITATOR UI LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Student Detail Page                                             │
│  ├─ Student Information Card (Left)                             │
│  │  ├─ Avatar & Name                                            │
│  │  ├─ Enrollment Details                                       │
│  │  └─ Attendance Stats                                         │
│  │                                                               │
│  └─ Guardian Management Card (Left) ← NEW                       │
│     ├─ Guardian List                                            │
│     │  ├─ Guardian Name + Relation                              │
│     │  ├─ Phone & Email                                         │
│     │  ├─ Connection Notes                                      │
│     │  └─ Edit/Delete Buttons                                   │
│     │                                                            │
│     └─ Add Guardian Button                                      │
│        └─ Opens Modal Form                                      │
│           ├─ Name (required)                                    │
│           ├─ Relation (required)                                │
│           ├─ Phone (required)                                   │
│           ├─ Email (optional)                                   │
│           ├─ Connection Notes (optional)                        │
│           └─ Attachment Questions (3 checkboxes)                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ AJAX
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (REST)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/facilitator/student/<id>/guardian/add/               │
│  ├─ Permission: Facilitator only                                │
│  ├─ Input: Form data (name, relation, phone, etc.)              │
│  └─ Output: JSON {success, guardian_data}                       │
│                                                                   │
│  POST /api/facilitator/guardian/<id>/edit/                      │
│  ├─ Permission: Facilitator only                                │
│  ├─ Input: Form data (updated fields)                           │
│  └─ Output: JSON {success, guardian_data}                       │
│                                                                   │
│  POST /api/facilitator/guardian/<id>/delete/                    │
│  ├─ Permission: Facilitator only                                │
│  ├─ Input: Guardian ID                                          │
│  └─ Output: JSON {success, message}                             │
│                                                                   │
│  GET /api/facilitator/student/<id>/guardians/                   │
│  ├─ Permission: Facilitator only                                │
│  ├─ Input: Student ID                                           │
│  └─ Output: JSON {success, guardians[], count}                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ORM
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Views (class/views.py)                                          │
│  ├─ add_guardian()                                               │
│  │  ├─ Validate permission                                      │
│  │  ├─ Create StudentGuardian record                            │
│  │  └─ Return JSON response                                     │
│  │                                                               │
│  ├─ edit_guardian()                                              │
│  │  ├─ Validate permission                                      │
│  │  ├─ Update StudentGuardian record                            │
│  │  └─ Return JSON response                                     │
│  │                                                               │
│  ├─ delete_guardian()                                            │
│  │  ├─ Validate permission                                      │
│  │  ├─ Delete StudentGuardian record                            │
│  │  └─ Return JSON response                                     │
│  │                                                               │
│  └─ get_guardians()                                              │
│     ├─ Validate permission                                      │
│     ├─ Query StudentGuardian records                            │
│     └─ Return JSON response                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ SQL
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  StudentGuardian Table                                           │
│  ├─ id (UUID, PK)                                               │
│  ├─ student_id (FK → Student)                                   │
│  ├─ name (VARCHAR 100)                                          │
│  ├─ relation (VARCHAR 50)                                       │
│  ├─ phone_number (VARCHAR 20)                                   │
│  ├─ email (VARCHAR 254, nullable)                               │
│  ├─ connection_notes (TEXT, nullable)                           │
│  ├─ attachment_q1 (BOOLEAN)                                     │
│  ├─ attachment_q2 (BOOLEAN)                                     │
│  ├─ attachment_q3 (BOOLEAN)                                     │
│  ├─ created_at (DATETIME)                                       │
│  ├─ updated_at (DATETIME)                                       │
│  └─ Index: (student_id, created_at)                             │
│                                                                   │
│  Relationships:                                                  │
│  ├─ StudentGuardian.student → Student (1:N)                     │
│  └─ Student.guardians → StudentGuardian (reverse)               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Add Guardian Flow
```
User clicks "Add Guardian"
         ↓
Modal opens with empty form
         ↓
User fills form & checks questions
         ↓
User clicks "Save Guardian"
         ↓
JavaScript: saveGuardian()
         ↓
POST /api/facilitator/student/<id>/guardian/add/
         ↓
Backend: add_guardian()
  ├─ Check permission
  ├─ Validate input
  ├─ Create StudentGuardian
  └─ Return JSON
         ↓
JavaScript: Handle response
  ├─ Show success message
  ├─ Reset form
  ├─ Close modal
  └─ Reload guardians list
         ↓
UI: Guardian appears in list
```

### Edit Guardian Flow
```
User clicks edit icon
         ↓
JavaScript: editGuardian()
         ↓
GET /api/facilitator/student/<id>/guardians/
         ↓
Backend: get_guardians()
  └─ Return all guardians
         ↓
JavaScript: Find guardian & populate form
         ↓
Modal opens with pre-filled data
         ↓
User modifies fields
         ↓
User clicks "Update Guardian"
         ↓
POST /api/facilitator/guardian/<id>/edit/
         ↓
Backend: edit_guardian()
  ├─ Check permission
  ├─ Validate input
  ├─ Update StudentGuardian
  └─ Return JSON
         ↓
JavaScript: Handle response
  ├─ Show success message
  ├─ Reset form
  ├─ Close modal
  └─ Reload guardians list
         ↓
UI: Guardian updated in list
```

### Delete Guardian Flow
```
User clicks delete icon
         ↓
Confirmation dialog
         ↓
User confirms
         ↓
JavaScript: deleteGuardian()
         ↓
POST /api/facilitator/guardian/<id>/delete/
         ↓
Backend: delete_guardian()
  ├─ Check permission
  ├─ Delete StudentGuardian
  └─ Return JSON
         ↓
JavaScript: Handle response
  ├─ Show success message
  └─ Reload guardians list
         ↓
UI: Guardian removed from list
```

## Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Student Detail Page                        │
│  (Templates/facilitator/students/detail.html)                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐      ┌──────────────────────────┐   │
│  │ Student Info Card   │      │ Guardian Management Card │   │
│  │ (Left Sidebar)      │      │ (Left Sidebar)           │   │
│  │                     │      │                          │   │
│  │ - Avatar            │      │ - Guardian List          │   │
│  │ - Name              │      │ - Add Guardian Button    │   │
│  │ - Enrollment        │      │ - Edit/Delete Actions   │   │
│  │ - Attendance        │      │                          │   │
│  └─────────────────────┘      └──────────────────────────┘   │
│                                          ↓                     │
│                                   ┌──────────────┐             │
│                                   │ Modal Form   │             │
│                                   │              │             │
│                                   │ - Name       │             │
│                                   │ - Relation   │             │
│                                   │ - Phone      │             │
│                                   │ - Email      │             │
│                                   │ - Notes      │             │
│                                   │ - Questions  │             │
│                                   └──────────────┘             │
│                                          ↓                     │
│                                   ┌──────────────┐             │
│                                   │ JavaScript   │             │
│                                   │              │             │
│                                   │ - loadGuard  │             │
│                                   │ - saveGuard  │             │
│                                   │ - editGuard  │             │
│                                   │ - deleteGuard│             │
│                                   │ - renderList │             │
│                                   └──────────────┘             │
│                                          ↓                     │
└──────────────────────────────────────────────────────────────┘
                              ↓ AJAX
┌──────────────────────────────────────────────────────────────┐
│                    Django Views Layer                          │
│  (class/views.py)                                             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ add_guardian │  │edit_guardian │  │del_guardian  │        │
│  │              │  │              │  │              │        │
│  │ - Validate   │  │ - Validate   │  │ - Validate   │        │
│  │ - Create     │  │ - Update     │  │ - Delete     │        │
│  │ - Return JSON│  │ - Return JSON│  │ - Return JSON│        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ get_guardians()                                      │    │
│  │ - Query StudentGuardian.objects.filter(student=...) │    │
│  │ - Serialize to JSON                                 │    │
│  │ - Return list with attachment scores                │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                              ↓ ORM
┌──────────────────────────────────────────────────────────────┐
│                    Django ORM Layer                            │
│  (class/models/students.py)                                   │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ StudentGuardian Model                                │    │
│  │                                                      │    │
│  │ - Fields (10 total)                                 │    │
│  │ - Relations (ForeignKey to Student)                 │    │
│  │ - Properties (attachment_score)                     │    │
│  │ - Meta (ordering, indexes)                          │    │
│  │ - Methods (__str__)                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└──────────────────────────────────────────────────────────────┘
                              ↓ SQL
┌──────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                         │
│  (class_studentguardian table)                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Stores:                                                       │
│  - Guardian information (name, relation, contact)             │
│  - Attachment assessment data (3 boolean fields)              │
│  - Timestamps (created_at, updated_at)                        │
│  - Foreign key to Student                                     │
│                                                                │
│  Indexes:                                                      │
│  - (student_id, created_at) for efficient queries             │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## URL Routing

```
/api/facilitator/student/<uuid:student_id>/guardian/add/
    ↓
    add_guardian(request, student_id)
    ├─ POST: Create new guardian
    └─ Returns: JSON {success, guardian_data}

/api/facilitator/guardian/<uuid:guardian_id>/edit/
    ↓
    edit_guardian(request, guardian_id)
    ├─ POST: Update guardian
    └─ Returns: JSON {success, guardian_data}

/api/facilitator/guardian/<uuid:guardian_id>/delete/
    ↓
    delete_guardian(request, guardian_id)
    ├─ POST: Delete guardian
    └─ Returns: JSON {success, message}

/api/facilitator/student/<uuid:student_id>/guardians/
    ↓
    get_guardians(request, student_id)
    ├─ GET: Fetch all guardians
    └─ Returns: JSON {success, guardians[], count}
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Security Layers                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Layer 1: Authentication                                │
│  ├─ @login_required decorator                           │
│  └─ User must be logged in                              │
│                                                           │
│  Layer 2: Authorization                                 │
│  ├─ Role check: request.user.role.name == "FACILITATOR" │
│  └─ Only facilitators can access                        │
│                                                           │
│  Layer 3: CSRF Protection                               │
│  ├─ Django middleware                                   │
│  └─ CSRF token in forms                                 │
│                                                           │
│  Layer 4: Input Validation                              │
│  ├─ Form validation (HTML5)                             │
│  ├─ Backend validation (Python)                         │
│  └─ Type checking (Django ORM)                          │
│                                                           │
│  Layer 5: SQL Injection Prevention                       │
│  ├─ Django ORM parameterized queries                    │
│  └─ No raw SQL                                          │
│                                                           │
│  Layer 6: XSS Prevention                                │
│  ├─ Template auto-escaping                              │
│  └─ JSON serialization                                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────────────────────┐
│              Performance Optimizations                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Database:                                              │
│  ├─ Index on (student_id, created_at)                  │
│  ├─ Efficient filtering by student                      │
│  └─ Minimal query overhead                              │
│                                                           │
│  API:                                                   │
│  ├─ JSON serialization (fast)                           │
│  ├─ Minimal data transfer                               │
│  └─ No N+1 queries                                      │
│                                                           │
│  Frontend:                                              │
│  ├─ AJAX (no page reload)                               │
│  ├─ Efficient DOM manipulation                          │
│  └─ Minimal re-renders                                  │
│                                                           │
│  Caching:                                               │
│  ├─ Browser caching for static assets                   │
│  └─ No server-side caching needed                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Scalability Considerations

```
Current Capacity:
├─ Students per school: Unlimited
├─ Guardians per student: 100+ (tested)
├─ Concurrent users: Limited by server
└─ Database size: Minimal impact

Future Scaling:
├─ Add caching layer (Redis)
├─ Database replication
├─ Load balancing
└─ Async task processing
```

---

**Architecture Version**: 1.0
**Last Updated**: February 26, 2026
**Status**: Production Ready ✅
