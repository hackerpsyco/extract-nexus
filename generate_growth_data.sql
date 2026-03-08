-- Generate test data for student "hack" growth analysis
-- This SQL script adds quiz scores and attendance records

-- First, find the student and enrollment
-- SELECT id, full_name FROM class_student WHERE full_name = 'hack';
-- SELECT id, student_id FROM class_enrollment WHERE student_id = '<student_id>' AND is_active = true;

-- Replace <enrollment_id> with the actual enrollment ID from above

-- Add 5 quiz scores (if not already present)
INSERT INTO class_studentquiz (id, enrollment_id, quiz_date, quiz_month, score, total_marks, questions_attempted, correct_answers, notes, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '<enrollment_id>',
    CURRENT_DATE - (5-row_number) * INTERVAL '7 days',
    TO_CHAR(CURRENT_DATE - (5-row_number) * INTERVAL '7 days', 'YYYY-MM'),
    60 + (row_number * 5),
    100,
    20,
    (60 + (row_number * 5)) / 5,
    'Auto-generated test data',
    NOW(),
    NOW()
FROM generate_series(1, 5) AS row_number
WHERE NOT EXISTS (
    SELECT 1 FROM class_studentquiz 
    WHERE enrollment_id = '<enrollment_id>'
    AND quiz_date = CURRENT_DATE - (5-row_number) * INTERVAL '7 days'
);

-- Add 10 attendance records (if not already present)
-- Note: This requires actual session IDs from your database
-- You may need to adjust this based on your actual sessions

-- First, let's check how many attendance records exist
-- SELECT COUNT(*) FROM class_attendance WHERE enrollment_id = '<enrollment_id>';

-- If you need to add more, you can use this approach:
-- INSERT INTO class_attendance (id, enrollment_id, actual_session_id, status, marked_at, visible_change_notes, invisible_change_notes, created_at, updated_at)
-- SELECT 
--     gen_random_uuid(),
--     '<enrollment_id>',
--     actual_session_id,
--     'present',
--     NOW(),
--     'Auto-generated test data',
--     'Auto-generated test data',
--     NOW(),
--     NOW()
-- FROM class_actualsession
-- WHERE class_section_id = (SELECT class_section_id FROM class_enrollment WHERE id = '<enrollment_id>')
-- LIMIT 10
-- ON CONFLICT DO NOTHING;

-- After running this, trigger the growth analysis:
-- python manage.py analyze_student_growth --enrollment-id <enrollment_id>
