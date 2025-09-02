# TODO: Fix 400 Error on Adding Student

## Steps to Complete
- [x] Edit AdminStudents.jsx to change "school_code" to "school_id" in POST data
- [x] Update comments in AdminStudents.jsx for clarity
- [x] Verify the code paths are correct
- [ ] Test the fix (run backend and frontend if possible)

# TODO: Fix 404 Error on Toggle Results Button

## Steps to Complete
- [x] Fixed AdminExams.jsx to call correct endpoint `/admin/exams/${id}` instead of `/admin/exams/${id}/release_results`
- [x] Fixed parameter name from `release` to `results_released` to match backend expectation
- [ ] Test the fix (run backend and frontend if possible)

# TODO: Implement Admin Side Student Attempt Excel Export Feature

## Steps to Complete
- [ ] Add openpyxl to backend/requirements.txt
- [ ] Add export_student_attempts_to_excel helper in backend/utils/files.py
- [ ] Add /admin/export_student_attempts route in backend/app.py
- [ ] Add Export Attempts to Excel button in frontend/src/components/admin/AdminStudents.jsx
- [ ] Test the export feature (run backend and frontend if possible)
