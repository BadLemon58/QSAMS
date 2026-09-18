-- ============================================================
-- QSAMS — Add Multiple Attendance Dates to Your EXISTING Class
-- Run this in Supabase SQL Editor if you already have a class
-- and want to add 6-8 past attendance dates to it.
-- ============================================================

DO $$
DECLARE
  v_class_id UUID;
  v_teacher_id UUID;
  v_session_id UUID;
  v_session_date DATE;
  v_student RECORD;
  v_dates DATE[] := ARRAY[
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE - INTERVAL '12 days',
    CURRENT_DATE - INTERVAL '9 days',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '2 days'
  ];
  v_random_status TEXT;
BEGIN
  -- 1. Grab your most recently created class
  SELECT id, teacher_id INTO v_class_id, v_teacher_id
  FROM public.classes
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE NOTICE 'No class found. Create a class first in the app!';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding past attendance sessions for Class ID: %', v_class_id;

  -- 2. Create past attendance sessions
  FOREACH v_session_date IN ARRAY v_dates LOOP
    -- Avoid duplicate session on same date for same class
    IF NOT EXISTS (
      SELECT 1 FROM public.attendance_sessions
      WHERE class_id = v_class_id AND date = v_session_date
    ) THEN
      INSERT INTO public.attendance_sessions (
        class_id, teacher_id, session_token, date, expires_at, is_active
      ) VALUES (
        v_class_id, v_teacher_id, gen_random_uuid()::TEXT, v_session_date,
        v_session_date + TIME '11:00:00', FALSE
      )
      RETURNING id INTO v_session_id;

      -- Populate attendance log for each student currently enrolled in this class
      FOR v_student IN (SELECT student_id FROM public.enrollments WHERE class_id = v_class_id) LOOP
        -- Mostly present, occasionally late or absent
        v_random_status := (
          CASE (floor(random() * 10))::INT
            WHEN 0 THEN 'absent'
            WHEN 1 THEN 'late'
            ELSE 'present'
          END
        );

        INSERT INTO public.attendance_logs (
          session_id, student_id, class_id, status, method, marked_at
        ) VALUES (
          v_session_id, v_student.student_id, v_class_id, v_random_status,
          'qr_student',
          v_session_date + (INTERVAL '8 hours' + (random() * 30 || ' minutes')::INTERVAL)
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE 'Done! Check your Attendance Reports / Matrix in QSAMS.';
END $$;
