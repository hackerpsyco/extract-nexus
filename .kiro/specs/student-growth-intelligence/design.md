# Student Growth Intelligence System - Design Document

## Overview

The Student Growth Intelligence System is a comprehensive analytics platform that provides teachers with meaningful insights into student learning progression. It combines daily session data (attendance, observations, feedback), monthly quiz scores, and ML-based analysis to create an intelligent growth dashboard.

**Key Features:**
- Daily session data aggregation (attendance, visible/invisible changes, feedback)
- Monthly quiz score tracking
- ML-based student clustering and growth analysis
- Interactive growth dashboard with charts and trends
- At-risk student detection
- Teacher-friendly insights and recommendations

## Architecture

### High-Level Flow

```
Daily Session Data (Attendance, Feedback, Observations)
         ↓
    Data Aggregation Layer
         ↓
    Feature Engineering
         ↓
    ML Analysis Engine (Clustering, Trend Detection)
         ↓
    Insight Generation
         ↓
    Growth Dashboard UI
```

### System Components

1. **Data Collection Layer**
   - Attendance records (per session)
   - SessionFeedback (student & teacher feedback)
   - Observation notes (visible/invisible changes)
   - Quiz scores (monthly)

2. **Data Aggregation Layer**
   - Aggregate daily session data
   - Calculate attendance patterns
   - Extract text features from feedback
   - Compile quiz score history

3. **Feature Engineering**
   - Text complexity metrics (TF-IDF, keyword count)
   - Attendance consistency (std dev, trend)
   - Quiz performance metrics (improvement rate, volatility)
   - Engagement indicators

4. **ML Analysis Engine**
   - K-Means clustering on feature vectors
   - Trend detection (improvement, decline, plateau)
   - Pattern recognition (stable, irregular, declining)
   - Risk scoring

5. **Insight Generation**
   - Generate human-readable feedback
   - Create recommendations
   - Flag at-risk students
   - Provide actionable insights

6. **Dashboard UI**
   - Student profile with growth score
   - Daily session history
   - Growth charts (attendance, quiz, text evolution)
   - Student clustering visualization
   - At-risk alerts

## Components and Interfaces

### 1. Data Models

#### StudentQuiz Model
```python
class StudentQuiz(models.Model):
    id = UUIDField(primary_key=True)
    enrollment = ForeignKey(Enrollment)
    quiz_date = DateField()
    quiz_month = CharField()  # "2026-02"
    score = IntegerField(0-100)
    total_marks = IntegerField()
    questions_attempted = IntegerField()
    correct_answers = IntegerField()
    notes = TextField()
    created_at = DateTimeField()
```

#### StudentGrowthAnalysis Model
```python
class StudentGrowthAnalysis(models.Model):
    id = UUIDField(primary_key=True)
    enrollment = ForeignKey(Enrollment)
    analysis_date = DateField()
    
    # Metrics
    growth_score = FloatField(0-100)  # Overall growth
    attendance_consistency = FloatField()
    quiz_improvement_rate = FloatField()
    text_complexity_growth = FloatField()
    engagement_level = CharField()  # High, Medium, Low
    risk_level = CharField()  # Low, Medium, High
    
    # Cluster Assignment
    student_cluster = CharField()  # Consistent Improver, Silent Learner, etc.
    cluster_confidence = FloatField()
    
    # Insights
    growth_insights = TextField()
    recommendations = TextField()
    at_risk_flags = JSONField()
    
    created_at = DateTimeField()
    updated_at = DateTimeField()
```

### 2. API Endpoints

#### Get Student Growth Dashboard
```
GET /api/student/{student_id}/growth/
Response:
{
    "student": {...},
    "growth_score": 75.5,
    "risk_level": "Low",
    "cluster": "Consistent Improver",
    "attendance_stats": {...},
    "quiz_history": [...],
    "daily_sessions": [...],
    "growth_insights": "...",
    "charts": {
        "attendance_trend": [...],
        "quiz_scores": [...],
        "text_evolution": [...],
        "growth_trajectory": [...]
    }
}
```

#### Get Daily Session History
```
GET /api/student/{student_id}/sessions/?date_from=2026-01-01&date_to=2026-02-28
Response:
[
    {
        "session_date": "2026-02-20",
        "attendance_status": "Present",
        "visible_changes": "...",
        "invisible_changes": "...",
        "student_feedback": "...",
        "teacher_feedback": "...",
        "session_id": "..."
    },
    ...
]
```

#### Get Quiz History (Month-wise)
```
GET /api/student/{student_id}/quizzes/?year=2026&month=02
Response:
[
    {
        "quiz_date": "2026-02-15",
        "score": 78,
        "total_marks": 100,
        "improvement": "+5%",
        "trend": "Improving"
    },
    ...
]
```

### 3. Service Layer

#### StudentGrowthAnalysisService
```python
class StudentGrowthAnalysisService:
    def calculate_growth_score(enrollment) -> float
    def analyze_attendance_pattern(enrollment) -> dict
    def analyze_quiz_trend(enrollment) -> dict
    def analyze_text_evolution(enrollment) -> dict
    def cluster_student(enrollment, features) -> str
    def generate_insights(enrollment, analysis) -> str
    def detect_at_risk_students(school) -> list
    def update_growth_analysis(enrollment) -> StudentGrowthAnalysis
```

## Data Models

### Session Data Structure
```
Daily Session Data:
├── Attendance
│   ├── Status (Present/Absent/Leave)
│   ├── Date
│   └── Session ID
├── Observations
│   ├── Visible Changes (text)
│   ├── Invisible Changes (text)
│   └── Timestamp
├── Student Feedback
│   ├── Participation Notes
│   ├── Session Highlights
│   └── Improvement Suggestions
└── Teacher Feedback
    ├── Student Participation Notes
    ├── Learning Objectives Met
    └── Additional Notes
```

### Quiz Data Structure
```
Monthly Quiz Data:
├── Quiz Date
├── Month (YYYY-MM)
├── Score (0-100)
├── Total Marks
├── Questions Attempted
├── Correct Answers
└── Notes
```

### Growth Analysis Structure
```
Growth Analysis:
├── Growth Score (0-100)
├── Attendance Consistency (0-100)
├── Quiz Improvement Rate (%)
├── Text Complexity Growth (%)
├── Engagement Level (High/Medium/Low)
├── Risk Level (Low/Medium/High)
├── Student Cluster (Category)
├── Growth Insights (Text)
└── Recommendations (Text)
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Growth Score Consistency
**For any** student with valid data, the growth score should be between 0-100 and should increase when positive indicators (attendance improvement, quiz score increase, text complexity growth) are present.

**Validates: Requirements 1, 2, 3, 5**

### Property 2: Attendance Pattern Accuracy
**For any** student with attendance records, the detected pattern (Stable, Declining, Irregular, Improving) should match the actual trend in the data when calculated using standard deviation and linear regression.

**Validates: Requirement 2**

### Property 3: Quiz Trend Detection
**For any** student with 3+ quiz scores, the detected trend (Improvement, Decline, Plateau, Acceleration) should correctly identify the direction of performance change.

**Validates: Requirement 3**

### Property 4: Text Evolution Measurement
**For any** two student responses, the semantic similarity score should be lower when responses contain different concepts and higher when responses contain similar concepts.

**Validates: Requirement 1**

### Property 5: Cluster Assignment Stability
**For any** student, the cluster assignment should remain stable across multiple analysis runs with the same data (deterministic clustering).

**Validates: Requirement 4**

### Property 6: Insight Generation Completeness
**For any** student with sufficient data, the generated insights should include: Current Status, Growth Indicators, Risk Factors, and Recommendations.

**Validates: Requirement 5**

### Property 7: At-Risk Detection Sensitivity
**For any** student showing negative patterns (declining attendance, performance drop, low engagement), the system should flag them as at-risk with appropriate confidence score.

**Validates: Requirement 5**

### Property 8: Data Validation Accuracy
**For any** student with insufficient data, the system should indicate "Insufficient data" rather than generating unreliable insights.

**Validates: Requirement 7**

## Error Handling

1. **Insufficient Data**
   - If < 3 data points: Return "Insufficient data for analysis"
   - If < 5 sessions: Return partial analysis with limitations noted

2. **Missing Fields**
   - Handle empty text fields gracefully
   - Skip analysis for missing quiz scores
   - Use available data for partial analysis

3. **Data Quality Issues**
   - Detect and handle duplicate records
   - Validate score ranges (0-100)
   - Handle outliers in trend analysis

4. **Performance Issues**
   - Cache analysis results (update weekly)
   - Batch process large student cohorts
   - Implement pagination for large datasets

## Testing Strategy

### Unit Tests
- Test growth score calculation with known inputs
- Test attendance pattern detection with sample data
- Test quiz trend detection with various score sequences
- Test text complexity metrics with sample responses
- Test cluster assignment with feature vectors

### Property-Based Tests
- **Property 1**: Growth score always 0-100 for any valid student data
- **Property 2**: Attendance pattern matches actual trend for any attendance sequence
- **Property 3**: Quiz trend correctly identifies direction for any score sequence
- **Property 4**: Text similarity scores are consistent for any response pair
- **Property 5**: Cluster assignments are deterministic for same data
- **Property 6**: Insights always include all required components
- **Property 7**: At-risk detection flags negative patterns correctly
- **Property 8**: Data validation prevents unreliable insights

### Integration Tests
- Test end-to-end dashboard data flow
- Test API endpoints with real data
- Test chart generation with various data ranges
- Test filtering and date range queries

## Implementation Approach

### Phase 1: Data Models & APIs
1. Create StudentQuiz model
2. Create StudentGrowthAnalysis model
3. Implement data aggregation APIs
4. Implement quiz history API

### Phase 2: Analysis Engine
1. Implement attendance pattern analysis
2. Implement quiz trend detection
3. Implement text evolution analysis
4. Implement clustering algorithm

### Phase 3: Dashboard UI
1. Create student growth dashboard page
2. Implement growth charts
3. Implement daily session history view
4. Implement quiz history view

### Phase 4: ML Integration
1. Implement insight generation
2. Implement at-risk detection
3. Implement student clustering visualization
4. Add recommendations engine

## Performance Considerations

- Cache analysis results (update weekly)
- Use database indexes on frequently queried fields
- Batch process ML analysis for large cohorts
- Implement pagination for large datasets
- Use async tasks for heavy computations

## Security Considerations

- Ensure facilitators can only view their assigned students
- Validate all input data
- Sanitize text fields to prevent XSS
- Log all analysis operations
- Implement rate limiting on APIs
