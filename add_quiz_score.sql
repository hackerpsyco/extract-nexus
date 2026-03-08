-- Add one more quiz score for student "piyush tamoli" to trigger growth analysis
-- This will give them 3 quiz scores (minimum required)

-- First find the enrollment ID
-- SELECT e.id, s.full_name, COUNT(q.id) as quiz_count
-- FROM class_enrollment e
-- JOIN class_student s ON e.student_id = s.id
-- LEFT JOIN class_studentquiz q ON e.id = q.enrollment_id
-- WHERE s.full_name = 'piyush tamoli'
-- GROUP BY e.id, s.full_name;

-- Then add a new quiz score (replace <enrollment_id> with actual ID)
INSERT INTO class_studentquiz (
    id, 
    enrollment_id, 
    quiz_date, 
    quiz_month, 
    score, 
    total_marks, 
    questions_attempted, 
    correct_answers, 
    notes, 
    created_at, 
    updated_at
)
VALUES (
    gen_random_uuid(),
    '<enrollment_id>',  -- Replace with actual enrollment ID
    CURRENT_DATE - INTERVAL '7 days',
    TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'YYYY-MM'),
    62,  -- Score
    100,
    20,
    12,
    'Added to trigger growth analysis',
    NOW(),
    NOW()
);

-- After running this SQL, the growth analysis should automatically trigger
-- because the student will have 6 attendance + 3 quizzes
