-- ============================================================
-- QSAMS — Demo Class & Attendance Seed Script
-- Run this in your Supabase Dashboard -> SQL Editor
-- ============================================================

DO $$
DECLARE
  v_teacher_id UUID;
  v_class_id UUID;
  v_session_id UUID;
  v_session_date DATE;
  v_student RECORD;
  v_dates DATE[] := ARRAY[
    CURRENT_DATE - INTERVAL '21 days',
    CURRENT_DATE - INTERVAL '19 days',
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE - INTERVAL '12 days',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE
  ];
  v_statuses TEXT[] := ARRAY['present', 'present', 'present', 'present', 'late', 'present', 'absent', 'present'];
  v_random_status TEXT;
  v_idx INT := 1;
BEGIN
  -- 1. Find the first teacher profile, or use existing
  SELECT id INTO v_teacher_id FROM public.profiles WHERE role = 'teacher' LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RAISE NOTICE 'No teacher account found. Please sign up or set a user role to teacher first.';
    RETURN;
  END IF;

  -- 2. Create Demo Class
  INSERT INTO public.classes (teacher_id, name, description, schedule, room)
  VALUES (
    v_teacher_id,
    'BSIT 3-A - Web Systems & Technologies',
    'Advanced web development, modern frontend frameworks, and cloud architecture.',
    'MWF 9:00 AM - 10:30 AM',
    'Lab 304'
  )
  RETURNING id INTO v_class_id;

  RAISE NOTICE 'Created Demo Class with ID: %', v_class_id;

  -- 3. Create 10 Demo Students (auth.users + profiles)
  FOR i IN 1..10 LOOP
    DECLARE
      v_uid UUID := gen_random_uuid();
      v_name TEXT;
      v_stud_id TEXT := '2024-' || LPAD((100 + i)::TEXT, 5, '0');
    BEGIN
      CASE i
        WHEN 1 THEN v_name := 'Maria Clara Santos';
        WHEN 2 THEN v_name := 'Juan Carlos Dela Cruz';
        WHEN 3 THEN v_name := 'Bea Nicole Alcantara';
        WHEN 4 THEN v_name := 'Angelo Miguel Reyes';
        WHEN 5 THEN v_name := 'Sophia Gabrielle Mendoza';
        WHEN 6 THEN v_name := 'Christian Dave Bautista';
        WHEN 7 THEN v_name := 'Diana Rose Flores';
        WHEN 8 THEN v_name := 'Elijah James Soriano';
        WHEN 9 THEN v_name := 'Patricia Mae Gonzales';
        WHEN 10 THEN v_name := 'Joshua Emmanuel Lim';
      END CASE;

      -- Insert into auth.users (so foreign key constraint is satisfied)
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'student' || i || '@demo.qsams.edu', crypt('Password123!', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('full_name', v_name, 'role', 'student', 'student_id', v_stud_id),
        NOW(), NOW()
      ) ON CONFLICT (id) DO NOTHING;

      -- Insert or update profile
      INSERT INTO public.profiles (id, full_name, role, student_id)
      VALUES (v_uid, v_name, 'student', v_stud_id)
      ON CONFLICT (id) DO UPDATE SET full_name = v_name, student_id = v_stud_id;

      -- Enroll student into the demo class
      INSERT INTO public.enrollments (class_id, student_id)
      VALUES (v_class_id, v_uid)
      ON CONFLICT DO NOTHING;
    END;
  END LOOP;

  -- 4. Create 8 Attendance Sessions & Populate Logs
  FOREACH v_session_date IN ARRAY v_dates LOOP
    INSERT INTO public.attendance_sessions (
      class_id, teacher_id, session_token, date, expires_at, is_active
    ) VALUES (
      v_class_id, v_teacher_id, gen_random_uuid()::TEXT, v_session_date,
      v_session_date + TIME '10:30:00', FALSE
    )
    RETURNING id INTO v_session_id;

    -- For each enrolled student in this class, insert an attendance log
    FOR v_student IN (SELECT student_id FROM public.enrollments WHERE class_id = v_class_id) LOOP
      -- 85% present, 5% late, 5% absent, 5% excused distribution
      v_random_status := (
        CASE (floor(random() * 20))::INT
          WHEN 0 THEN 'absent'
          WHEN 1 THEN 'late'
          WHEN 2 THEN 'excused'
          ELSE 'present'
        END
      );

      INSERT INTO public.attendance_logs (
        session_id, student_id, class_id, status, method, marked_at
      ) VALUES (
        v_session_id, v_student.student_id, v_class_id, v_random_status,
        (CASE WHEN random() > 0.3 THEN 'qr_student' ELSE 'qr_teacher' END),
        v_session_date + (INTERVAL '9 hours' + (random() * 20 || ' minutes')::INTERVAL)
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Successfully seeded demo class with 10 students and 8 sessions!';
END $$;
