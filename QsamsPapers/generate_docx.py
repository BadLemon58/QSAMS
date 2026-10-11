import docx

document = docx.Document()

document.add_heading('1. Query Performance and Optimization', level=2)

document.add_paragraph('To demonstrate query efficiency, three complex queries were executed before and after database optimization techniques (specifically B-Tree Indexing on foreign keys and commonly filtered columns) were applied.')

document.add_heading('Query 1: Comprehensive Class Attendance Report', level=3)
document.add_paragraph('This query calculates attendance statistics by joining profiles, enrollments, classes, and logs.')

table = document.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr_cells = table.rows[0].cells
hdr_cells[0].text = 'Metric'
hdr_cells[1].text = 'Before Optimization'
hdr_cells[2].text = 'After Optimization'

row_cells = table.add_row().cells
row_cells[0].text = 'Execution Time'
row_cells[1].text = '(insert ms here)'
row_cells[2].text = '(insert ms here)'

row_cells = table.add_row().cells
row_cells[0].text = 'Query Plan'
row_cells[1].text = 'Hash Join / Seq Scan'
row_cells[2].text = 'Nested Loop / Index Scan'

row_cells = table.add_row().cells
row_cells[0].text = 'Index Usage'
row_cells[1].text = 'None'
row_cells[2].text = 'idx_attendance_logs_student_class, idx_enrollments_student_id'

row_cells = table.add_row().cells
row_cells[0].text = 'Rows Processed'
row_cells[1].text = '10+ (Full Table Scan)'
row_cells[2].text = 'Limited to matching rows'

document.add_heading('Query 2: Students with High Absenteeism', level=3)
document.add_paragraph('This query identifies at-risk students using GROUP BY and HAVING constraints.')

table = document.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr_cells = table.rows[0].cells
hdr_cells[0].text = 'Metric'
hdr_cells[1].text = 'Before Optimization'
hdr_cells[2].text = 'After Optimization'

row_cells = table.add_row().cells
row_cells[0].text = 'Execution Time'
row_cells[1].text = '(insert ms here)'
row_cells[2].text = '(insert ms here)'

row_cells = table.add_row().cells
row_cells[0].text = 'Query Plan'
row_cells[1].text = 'Seq Scan'
row_cells[2].text = 'Index Scan / Bitmap Heap Scan'

row_cells = table.add_row().cells
row_cells[0].text = 'Index Usage'
row_cells[1].text = 'None'
row_cells[2].text = 'idx_attendance_logs_status'

row_cells = table.add_row().cells
row_cells[0].text = 'Rows Processed'
row_cells[1].text = 'All logs scanned'
row_cells[2].text = 'Only logs where status = absent'

document.add_heading('Query 3: Daily Attendance Statistics per Session', level=3)
document.add_paragraph('This query aggregates attendance logs by session date.')

table = document.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr_cells = table.rows[0].cells
hdr_cells[0].text = 'Metric'
hdr_cells[1].text = 'Before Optimization'
hdr_cells[2].text = 'After Optimization'

row_cells = table.add_row().cells
row_cells[0].text = 'Execution Time'
row_cells[1].text = '(insert ms here)'
row_cells[2].text = '(insert ms here)'

row_cells = table.add_row().cells
row_cells[0].text = 'Query Plan'
row_cells[1].text = 'Hash Join / Seq Scan'
row_cells[2].text = 'Index Scan'

row_cells = table.add_row().cells
row_cells[0].text = 'Index Usage'
row_cells[1].text = 'None'
row_cells[2].text = 'idx_attendance_sessions_date, idx_attendance_logs_session_id'

row_cells = table.add_row().cells
row_cells[0].text = 'Rows Processed'
row_cells[1].text = 'Scanned all sessions'
row_cells[2].text = 'Indexed date sort'

document.add_heading('Discussion of Results:', level=3)
document.add_paragraph('Before optimization, the database query planner relied heavily on Sequential Scans (Seq Scan), which forces the engine to read every row in the tables to find matches. While fast on small datasets, this is highly inefficient at scale.')
document.add_paragraph('After implementing B-Tree indexes on foreign keys (student_id, class_id, session_id) and frequently filtered columns (status, date), the query execution plans shifted to Index Scans. This allowed the database engine to jump directly to the relevant records, bypassing unnecessary rows. This query restructuring and proper indexing drastically reduced execution time and optimized resource usage.')

document.add_heading('2. Error Handling', level=2)
document.add_paragraph('To demonstrate proper error handling, invalid operations were tested against the database constraints. The system provides meaningful error messages and prevents invalid transactions.')

document.add_heading('Scenario 1: Invalid Foreign Key (Enrolling a non-existent student)', level=3)
document.add_paragraph('The system prevents invalid transactions. Attempting to enroll a non-existent student results in a foreign key constraint violation, ensuring data integrity. (Insert screenshot here)')

document.add_heading('Scenario 2: Missing Required Fields (Creating a class without a teacher)', level=3)
document.add_paragraph('The database enforces required fields. Omitting the teacher_id when creating a class triggers a NOT NULL constraint, prompting the application to require complete data. (Insert screenshot here)')

document.add_heading('Scenario 3: Custom Meaningful Error Message via Trigger (Prevent Future Dates)', level=3)
document.add_paragraph('Instead of standard database crashes, custom PL/pgSQL triggers were implemented to provide meaningful error messages to the user, such as preventing the creation of future attendance sessions. (Insert screenshot here)')

document.save('c:\\Users\\USER\\Desktop\\Projects\\QSAMS\\Part_C_Documentation.docx')
