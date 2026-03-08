# Testing Guide - Previous Day Attendance Preset

## Quick Test Checklist

### ✅ Basic Functionality

- [ ] Navigate to mark attendance page for any session
- [ ] Verify "Previous Day" button is visible
- [ ] Click "Previous Day" button
- [ ] Verify loading spinner appears
- [ ] Verify success message shows count of populated students
- [ ] Verify attendance dropdowns are filled with previous day's values
- [ ] Verify observation notes are populated

### ✅ Visual Indicators

- [ ] Pre-filled rows have blue left border
- [ ] Modify a pre-filled value
- [ ] Verify blue border is removed from modified row
- [ ] Click "Clear All" button
- [ ] Verify all blue borders are removed

### ✅ Single Session

- [ ] Mark attendance for Day 1 (e.g., 5 present, 3 absent, 2 leave)
- [ ] Navigate to Day 2 attendance page
- [ ] Click "Previous Day"
- [ ] Verify all 10 students are populated with Day 1 values
- [ ] Verify counts match: 5 present, 3 absent, 2 leave

### ✅ Grouped Session

- [ ] Create grouped session with 2+ classes
- [ ] Mark attendance for all classes on Day 1
- [ ] Navigate to Day 2 attendance page
- [ ] Click "Previous Day"
- [ ] Verify all students from all classes are populated
- [ ] Verify data is organized by class section

### ✅ Edge Cases

**Day 1 (No Previous Day)**
- [ ] Navigate to Day 1 attendance page
- [ ] Click "Previous Day"
- [ ] Verify message: "No previous day available"

**No Previous Session**
- [ ] Skip Day 1 (mark as holiday)
- [ ] Go to Day 2
- [ ] Click "Previous Day"
- [ ] Verify message: "No previous session found for this day"

**No Attendance Data**
- [ ] Create Day 1 session but don't mark any attendance
- [ ] Go to Day 2
- [ ] Click "Previous Day"
- [ ] Verify message: "No attendance data found for previous day"

### ✅ Data Persistence

- [ ] Load previous day attendance
- [ ] Modify some values
- [ ] Save attendance
- [ ] Verify changes are saved correctly
- [ ] Go back to Day 2
- [ ] Verify saved values are displayed

### ✅ Observation Notes

- [ ] Mark attendance on Day 1 with observation notes
- [ ] Go to Day 2
- [ ] Click "Previous Day"
- [ ] Verify visible change notes are populated
- [ ] Verify invisible change notes are populated
- [ ] Modify notes
- [ ] Save and verify changes

### ✅ Mobile Responsiveness

- [ ] Test on mobile device (< 768px)
- [ ] Verify "Previous Day" button is visible and clickable
- [ ] Verify loading spinner works
- [ ] Verify form populates correctly
- [ ] Verify blue border indicator is visible

### ✅ Error Handling

- [ ] Disconnect internet while loading
- [ ] Verify error message appears
- [ ] Verify button returns to normal state
- [ ] Verify form is not partially filled

## Test Data Setup

### Scenario 1: Simple Single Session
```
Day 1:
- Student A: Present
- Student B: Absent
- Student C: Leave

Day 2:
- Click "Previous Day"
- Verify all 3 students populated with Day 1 values
```

### Scenario 2: Grouped Session
```
Class A (Day 1):
- Student A1: Present
- Student A2: Absent

Class B (Day 1):
- Student B1: Present
- Student B2: Leave

Day 2 (Grouped):
- Click "Previous Day"
- Verify all 4 students populated
- Verify organized by class
```

### Scenario 3: With Observation Notes
```
Day 1:
- Student A: Present
  - Visible: "Better focus"
  - Invisible: "Increased confidence"

Day 2:
- Click "Previous Day"
- Verify notes are populated
- Modify notes
- Save and verify changes
```

## Expected Behavior

### Success Case
```
Button Click → Loading Spinner → API Call → Data Received → Form Populated → Blue Borders Added → Success Alert
```

### Error Case
```
Button Click → Loading Spinner → API Call → Error Response → Error Alert → Button Reset
```

### Modification Case
```
Form Populated → User Changes Value → Blue Border Removed → Summary Updated → Save
```

## Browser Compatibility

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Checks

- [ ] API response time < 1 second
- [ ] Form population < 500ms
- [ ] No UI freezing during load
- [ ] No console errors

## Accessibility Checks

- [ ] Button has proper ARIA labels
- [ ] Loading state is announced
- [ ] Error messages are clear
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## Known Limitations

1. Only fetches from immediately previous day
2. Requires previous session to be marked as "Conducted"
3. Does not copy over facilitator attendance status
4. Does not copy over session remarks

## Troubleshooting

### Button doesn't work
- Check browser console for errors
- Verify API endpoint is accessible
- Check user has facilitator role
- Verify session ID is correct

### Data not populating
- Check if previous session exists
- Verify attendance was marked for previous session
- Check browser console for API errors
- Verify enrollment IDs match

### Blue borders not showing
- Check CSS is loaded
- Verify `.prefilled-row` class is applied
- Check browser DevTools for CSS conflicts

### Notes not populating
- Verify notes exist in previous session
- Check if notes are being returned in API response
- Verify textarea elements have correct names
