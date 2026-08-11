-- ============================================================
-- QSAMS — QR-Based Classroom Attendance System
-- Supabase / PostgreSQL Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  student_id  TEXT UNIQUE,               -- Only populated for students
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'student_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- 2. CLASSES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  schedule    TEXT,                     -- e.g. "Mon/Wed/Fri 9:00–10:30 AM"
  room        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 3. ENROLLMENTS  (many-to-many: students ↔ classes)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);

-- ──────────────────────────────────────────────────────────
-- 4. ATTENDANCE SESSIONS  (one per class meeting)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id       UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,  -- Embedded in dynamic QR
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at     TIMESTAMPTZ NOT NULL,                           -- Token validity window
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups when students scan QR
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.attendance_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_class  ON public.attendance_sessions(class_id);

-- ──────────────────────────────────────────────────────────
-- 5. ATTENDANCE LOGS  (individual check-in records)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  method      TEXT NOT NULL CHECK (method IN ('qr_student', 'qr_teacher', 'manual')),
  marked_at   TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT,
  UNIQUE (session_id, student_id)   -- One record per student per session
);

CREATE INDEX IF NOT EXISTS idx_logs_session  ON public.attendance_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_student  ON public.attendance_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_logs_class    ON public.attendance_logs(class_id);

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime for the tables that need live updates
alter publication supabase_realtime add table attendance_sessions;
alter publication supabase_realtime add table attendance_logs;
alter publication supabase_realtime add table enrollments;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs   ENABLE ROW LEVEL SECURITY;

-- ── profiles ──
CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ── classes ──
CREATE POLICY "Allow authenticated read classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers write classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid());

-- ── enrollments ──
CREATE POLICY "Allow authenticated read enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert enrollments"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete enrollments"
  ON public.enrollments FOR DELETE
  TO authenticated
  USING (true);

-- ── attendance_sessions ──
CREATE POLICY "Allow authenticated read sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers manage sessions"
  ON public.attendance_sessions FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid());

-- ── attendance_logs ──
CREATE POLICY "Allow authenticated read logs"
  ON public.attendance_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert logs"
  ON public.attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update logs"
  ON public.attendance_logs FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- SAMPLE SEED DATA (optional — remove before production)
-- ============================================================
-- Insert a teacher and a class after creating auth users.
-- Run after you sign up your first teacher account.
--
-- UPDATE public.profiles SET role = 'teacher' WHERE id = '<your-teacher-uuid>';
-- INSERT INTO public.classes (teacher_id, name, description, schedule, room)
-- VALUES ('<teacher-uuid>', 'CS101 - Intro to Programming', 'Foundations of CS', 'MWF 9:00-10:30 AM', 'Room 201');
