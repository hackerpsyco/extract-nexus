# Student Guardian Management - Testing Guide

## Pre-Testing Setup

### 1. Database Verification
```bash
# Check migration status
python manage.py showmigrations class

# Should show:
# [X] 0054_studentguardian
```

### 2. Server Status
```bash
# Start development server
python manage.py runserver

# Server should be running on http://localhost:8000
```

## Manual Testing Steps

### Test 1: Access Student Detail Page

**Steps:**
1. Login as a facilitator
2. Navigate to: `/facilitator/students/<student_id>/detail/`
3. Scroll down to left sidebar

**Expected Result:**
- Guardian card visible below student information
- "Add Guardian" button present in card header
- "Loading guardians..." message appears briefly
- Empty state message if no guardians exist

---

### Test 2: Add Guardian

**Steps:**
1. Click "Add Guardian" button
2. Modal opens with title "Add Guardian"
3. Fill in form:
   - Name: "John Smith"
   - Relation: "Father"
   - Phone: "9876543210"
   - Email: "john@example.com"
   - Connection Notes: "Primary contact"
   - Check all 3 attachment questions
4. Click "Save Guardian"

**Expected Result:**
- Success alert: "✅ Guardian added successfully"
- Modal closes
- Guardian appears in list immediately
- Guardian details display correctly
- Edit and delete buttons visible

---

### Test 3: View Guardian Details

**Steps:**
1. Look at guardian in list
2. Verify all fields display:
   - Name with icon
   - Relation
   - Phone number
   - Email (if provided)
   - Connection notes (if provided)

**Expected Result:**
- All guardian information visible
- Proper formatting and styling
- Icons display correctly

---

### Test 4: Edit Guardian

**Steps:**
1. Click edit icon (pencil) on guardian row
2. Modal opens with title "Edit Guardian"
3. Verify form is pre-filled with guardian data
4. Change some fields:
   - Name: "John Michael Smith"
   - Email: "john.smith@example.com"
   - Uncheck one attachment question
5. Click "Update Guardian"

**Expected Result:**
- Success alert: "✅ Guardian updated successfully"
- Modal closes
- Guardian list updates with new data
- Changes reflected immediately

---

### Test 5: Delete Guardian

**Steps:**
1. Click delete icon (trash) on guardian row
2. Confirmation dialog appears: "Are you sure you want to delete this guardian?"
3. Click "OK" to confirm

**Expected Result:**
- Success alert: "✅ Guardian deleted successfully"
- Guardian removed from list
- If last guardian, empty state message appears

---

### Test 6: Cancel Delete

**Steps:**
1. Click delete icon on guardian row
2. Confirmation dialog appears
3. Click "Cancel"

**Expected Result:**
- Dialog closes
- Guardian remains in list
- No changes made

---

### Test 7: Multiple Guardians

**Steps:**
1. Add 3-4 guardians with different relations
2. Verify all appear in list
3. Edit one guardian
4. Delete one guardian
5. Verify list updates correctly

**Expected Result:**
- All guardians display in list
- Operations work independently
- List updates correctly after each action

---

### Test 8: Form Validation

**Steps:**
1. Click "Add Guardian"
2. Try to submit empty form
3. Try to submit with only name
4. Try to submit with invalid email

**Expected Result:**
- Browser validation prevents submission
- Required fields highlighted
- Error messages appear

---

### Test 9: Attachment Questions

**Steps:**
1. Add guardian with all 3 questions checked
2. View guardian in list
3. Edit guardian and uncheck questions
4. Save and verify

**Expected Result:**
- Questions save correctly
- Can be toggled on/off
- Attachment score updates (0-3)

---

### Test 10: Permission Check

**Steps:**
1. Login as admin or supervisor
2. Try to access student detail page
3. Try to access guardian API endpoints directly

**Expected Result:**
- Admin/Supervisor cannot access facilitator pages
- API returns 403 Forbidden for non-facilitators
- Proper error messages displayed

---

### Test 11: Mobile Responsiveness

**Steps:**
1. Open student detail page on mobile device
2. Scroll to guardian card
3. Click "Add Guardian"
4. Fill form on mobile
5. Submit and verify

**Expected Result:**
- Layout adapts to mobile screen
- Form fields readable and usable
- Modal displays properly
- Buttons clickable
- No horizontal scrolling needed

---

### Test 12: Browser Console

**Steps:**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Perform all guardian operations
4. Check for JavaScript errors

**Expected Result:**
- No JavaScript errors
- No console warnings
- Network requests successful (200 status)

---

### Test 13: Network Requests

**Steps:**
1. Open browser developer tools (F12)
2. Go to Network tab
3. Add a guardian
4. Monitor network requests

**Expected Result:**
- POST request to `/api/facilitator/student/<id>/guardian/add/`
- Response status: 200
- Response contains guardian data
- Response time < 1 second

---

### Test 14: Data Persistence

**Steps:**
1. Add guardian
2. Refresh page (F5)
3. Verify guardian still appears

**Expected Result:**
- Guardian data persists in database
- Appears after page refresh
- No data loss

---

### Test 15: Multiple Students

**Steps:**
1. Add guardians to Student A
2. Navigate to Student B
3. Add different guardians to Student B
4. Go back to Student A

**Expected Result:**
- Each student has separate guardians
- No data mixing between students
- Correct guardians display for each student

---

## Automated Testing (Optional)

### API Endpoint Tests

```bash
# Test Add Guardian
curl -X POST http://localhost:8000/api/facilitator/student/<student_id>/guardian/add/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=John&relation=father&phone_number=9876543210&email=john@example.com&connection_notes=Primary&attachment_q1=true&attachment_q2=true&attachment_q3=true"

# Test Get Guardians
curl http://localhost:8000/api/facilitator/student/<student_id>/guardians/

# Test Edit Guardian
curl -X POST http://localhost:8000/api/facilitator/guardian/<guardian_id>/edit/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=John Smith&relation=father&phone_number=9876543210"

# Test Delete Guardian
curl -X POST http://localhost:8000/api/facilitator/guardian/<guardian_id>/delete/
```

---

## Troubleshooting

### Issue: Guardian card not loading
**Solution:**
- Check browser console for errors
- Verify student ID is correct
- Check facilitator permissions
- Verify database migration applied

### Issue: Add Guardian button not working
**Solution:**
- Check browser console for JavaScript errors
- Verify modal HTML is present
- Check network requests in DevTools
- Verify CSRF token is present

### Issue: Form not submitting
**Solution:**
- Check required fields are filled
- Verify email format if provided
- Check browser console for validation errors
- Check network tab for failed requests

### Issue: Guardian not appearing after add
**Solution:**
- Check network response in DevTools
- Verify success message appeared
- Refresh page to check persistence
- Check database directly

### Issue: Permission denied error
**Solution:**
- Verify logged in as facilitator
- Check user role in database
- Verify facilitator has proper permissions
- Check Django logs for details

---

## Performance Testing

### Load Testing
- Add 50+ guardians to single student
- Verify page still loads quickly
- Check database query performance

### Stress Testing
- Rapid add/edit/delete operations
- Multiple simultaneous requests
- Verify no race conditions

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Sign-Off

- [ ] All tests passed
- [ ] No console errors
- [ ] No database errors
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] Ready for production

---

**Test Date**: _______________
**Tester Name**: _______________
**Status**: _______________
