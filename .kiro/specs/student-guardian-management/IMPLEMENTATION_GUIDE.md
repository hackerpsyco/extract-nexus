# Student Guardian Management Feature - Implementation Guide

## Overview

Added a comprehensive Guardian Management section to the student profile detail page. Facilitators can now add, view, edit, and delete student guardians with detailed information and attachment assessment questions.

## Features Implemented

### 1. Guardian Information Management
- **Guardian Name** - Full name of the guardian
- **Relation to Student** - Dropdown with common relations (Mother, Father, Brother, Sister, Grandmother, Grandfather, Aunt, Uncle, Cousin, Other)
- **Phone Number** - Contact phone number (required)
- **Email Address** - Optional email contact
- **Connection/Notes** - Additional notes about the guardian (e.g., "Primary contact", "Emergency contact")

### 2. Attachment Assessment Questions
Three checkbox questions to assess the student-guardian relationship:
1. "Student shows strong emotional bond with this guardian"
2. "Student seeks comfort/support from this guardian"
3. "This guardian is actively involved in student's education"

### 3. UI Components

#### Guardian Card (Left Sidebar)
- Located on the left side of the student detail page
- Shows list of all guardians for the student
- Each guardian displays:
  - Name with icon
  - Relation to student
  - Phone number
  - Email (if available)
  - Connection notes (if available)
  - Edit and Delete buttons

#### Add Guardian Button
- Located in the card header
- Opens a modal form for adding new guardians
- Accessible from empty state or card header

#### Guardian Modal Form
- Clean, organized form with all guardian fields
- Attachment assessment checkboxes
- Cancel and Save buttons
- Form validation for required fields

## File Structure

### New Files Created
- `Templates/facilitator/students/detail_with_guardians.html` - Enhanced student detail page with guardian management

### Files to Update (Next Steps)
1. `class/models/students.py` - Add Guardian model
2. `class/views.py` - Add guardian CRUD views
3. `class/urls.py` - Add guardian URL routes
4. `class/forms.py` - Add guardian form

## Database Model (To Be Created)

```python
class StudentGuardian(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='guardians')
    name = models.CharField(max_length=100)
    relation = models.CharField(max_length=50, choices=[...])
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    connection_notes = models.TextField(blank=True)
    
    # Attachment Assessment
    attachment_q1 = models.BooleanField(default=False)  # Emotional bond
    attachment_q2 = models.BooleanField(default=False)  # Seeks comfort
    attachment_q3 = models.BooleanField(default=False)  # Education involvement
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## API Endpoints (To Be Created)

### Add Guardian
- **POST** `/api/facilitator/student/<student_id>/guardian/`
- **Body**: Guardian form data
- **Response**: Created guardian object

### Edit Guardian
- **PUT** `/api/facilitator/student/<student_id>/guardian/<guardian_id>/`
- **Body**: Updated guardian data
- **Response**: Updated guardian object

### Delete Guardian
- **DELETE** `/api/facilitator/student/<student_id>/guardian/<guardian_id>/`
- **Response**: Success message

### List Guardians
- **GET** `/api/facilitator/student/<student_id>/guardians/`
- **Response**: List of guardians for student

## JavaScript Functions (To Be Added)

```javascript
// Edit guardian
function editGuardian(guardianId) {
    // Fetch guardian data
    // Populate form
    // Show modal
}

// Delete guardian
function deleteGuardian(guardianId) {
    // Show confirmation
    // Delete via API
    // Refresh list
}

// Save guardian
document.getElementById('guardianForm').addEventListener('submit', function(e) {
    e.preventDefault();
    // Collect form data
    // Send to API
    // Close modal
    // Refresh list
});
```

## Integration Steps

### Step 1: Create Guardian Model
Add `StudentGuardian` model to `class/models/students.py`

### Step 2: Create Database Migration
```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 3: Create Guardian Views
Add CRUD views to `class/views.py`:
- `add_guardian()`
- `edit_guardian()`
- `delete_guardian()`
- `get_guardians()` (API endpoint)

### Step 4: Add URL Routes
Add to `class/urls.py`:
```python
path('api/facilitator/student/<uuid:student_id>/guardian/', add_guardian, name='add_guardian'),
path('api/facilitator/student/<uuid:student_id>/guardian/<uuid:guardian_id>/', edit_guardian, name='edit_guardian'),
path('api/facilitator/student/<uuid:student_id>/guardians/', get_guardians, name='get_guardians'),
```

### Step 5: Update Student Detail View
Update the view to pass guardians to template:
```python
guardians = StudentGuardian.objects.filter(student=student)
context['guardians'] = guardians
```

### Step 6: Replace Template
Replace `Templates/facilitator/students/detail.html` with `detail_with_guardians.html`

## Usage Flow

1. **View Student Profile**
   - Facilitator navigates to student detail page
   - Sees Guardian card on left sidebar

2. **Add Guardian**
   - Click "Add" button in Guardian card header
   - Modal form opens
   - Fill in guardian information
   - Check attachment assessment questions
   - Click "Save Guardian"
   - Guardian appears in list

3. **Edit Guardian**
   - Click edit icon next to guardian name
   - Modal opens with pre-filled data
   - Update information
   - Click "Save Guardian"
   - Changes reflected in list

4. **Delete Guardian**
   - Click delete icon next to guardian name
   - Confirmation dialog appears
   - Confirm deletion
   - Guardian removed from list

## Responsive Design

- **Desktop (≥992px)**: Guardian card on left sidebar with student info
- **Tablet (768px-991px)**: Guardian card below student info
- **Mobile (<768px)**: Full-width guardian card with optimized form

## Accessibility Features

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigation support
- Form validation messages
- Clear visual feedback

## Security Considerations

- Guardian data is student-specific
- Only facilitators can manage guardians
- Phone numbers and emails are validated
- CSRF protection on forms
- Input sanitization

## Future Enhancements

1. **Guardian Communication**
   - Send messages to guardians
   - Share attendance reports
   - Notify about student progress

2. **Guardian Portal**
   - Guardians can view student progress
   - Receive notifications
   - Communicate with facilitators

3. **Attachment Scoring**
   - Calculate attachment score based on questions
   - Track changes over time
   - Generate reports

4. **Emergency Contacts**
   - Mark guardians as emergency contacts
   - Priority ordering
   - Quick access in emergencies

## Testing Checklist

- [ ] Add guardian with all fields
- [ ] Add guardian with only required fields
- [ ] Edit guardian information
- [ ] Delete guardian
- [ ] Verify attachment questions are saved
- [ ] Test on mobile devices
- [ ] Test form validation
- [ ] Test empty state
- [ ] Test with multiple guardians
- [ ] Verify data persistence

## Notes

- The template file `detail_with_guardians.html` is ready to use
- Backend implementation is required for full functionality
- All form submissions should use AJAX for better UX
- Consider adding guardian photos in future versions
