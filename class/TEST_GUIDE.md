# Student Growth Intelligence - Test Guide

## Quick Start

### Run All Tests
```bash
python manage.py test class.test_growth_intelligence --keepdb -v 2
```

### Run Specific Test Class
```bash
# Attendance Pattern Tests
python manage.py test class.test_growth_intelligence.TestAttendancePatternAccuracy --keepdb -v 2

# Quiz Trend Tests
python manage.py test class.test_growth_intelligence.TestQuizTrendDetection --keepdb -v 2

# Growth Score Tests
python manage.py test class.test_growth_intelligence.TestGrowthScoreConsistency --keepdb -v 2

# At-Risk Detection Tests
python manage.py test class.test_growth_intelligence.TestAtRiskDetectionSensitivity --keepdb -v 2

# Data Validation Tests
python manage.py test class.test_growth_intelligence.TestDataValidationAccuracy --keepdb -v 2
```

### Run Specific Test
```bash
python manage.py test class.test_growth_intelligence.TestGrowthScoreConsistency.test_growth_score_in_valid_range --keepdb -v 2
```

## Test Structure

### Property-Based Tests (Using Hypothesis)
These tests generate random inputs and verify properties hold across all cases:

1. **TestAttendancePatternAccuracy.test_stable_pattern_detection**
   - Generates: 5 random attendance patterns
   - Validates: Consistency scores are 0-100

2. **TestQuizTrendDetection.test_improvement_trend_detection**
   - Generates: 5 random quiz score sequences
   - Validates: Improvement rate is positive for improving trends

3. **TestGrowthScoreConsistency.test_growth_score_in_valid_range**
   - Generates: 10 random combinations of metrics
   - Validates: Growth score always 0-100

### Deterministic Tests
These tests use fixed data to verify specific scenarios:

1. **Declining Patterns** - Verify declining attendance/performance detection
2. **Critical Concerns** - Verify at-risk flagging
3. **Insufficient Data** - Verify graceful handling of missing data

## Test Database

- Tests use `--keepdb` flag to preserve database between runs
- First run creates test database
- Subsequent runs reuse database (faster)
- To reset: Remove `--keepdb` flag

## Expected Results

All tests should pass with output like:
```
Ran 14 tests in X.XXXs
OK
```

## Troubleshooting

### Database Already Exists Error
```bash
# Option 1: Delete test database
python manage.py test class.test_growth_intelligence --keepdb=False -v 2

# Option 2: Use different database name
python manage.py test class.test_growth_intelligence --keepdb -v 2
```

### Import Errors
Ensure all dependencies are installed:
```bash
pip install hypothesis scikit-learn nltk
```

### Timeout Issues
Property-based tests may take longer. Increase timeout:
```bash
python manage.py test class.test_growth_intelligence --keepdb -v 2 --timeout=300
```

## Test Coverage

| Component | Tests | Status |
|-----------|-------|--------|
| Attendance Analysis | 2 | ✓ Implemented |
| Quiz Trend Detection | 2 | ✓ Implemented |
| Growth Score Calculation | 4 | ✓ Implemented |
| At-Risk Detection | 3 | ✓ Implemented |
| Data Validation | 3 | ✓ Implemented |
| **Total** | **14** | **✓ Complete** |

## Next Steps

1. Run tests to verify all pass
2. Add integration tests for API endpoints
3. Add unit tests for edge cases
4. Set up CI/CD pipeline for automated testing
