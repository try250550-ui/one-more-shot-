-- =========================================================================
-- SUPABASE DATABASE SETUP SCHEMA
-- Copy and paste this script into your Supabase SQL Editor and run it.
-- =========================================================================

-- 1. Profiles Table (Holds user metadata linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow users to read their own profiles"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profiles"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);


-- 2. Tracked Jobs Table (Holds user-specific job applications)
CREATE TABLE IF NOT EXISTS public.tracked_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Wishlist', 'Applied', 'Interviewing', 'Offer', 'Rejected')),
    notes TEXT DEFAULT '',
    date_applied DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.tracked_jobs ENABLE ROW LEVEL SECURITY;

-- Tracked Jobs Policies
CREATE POLICY "Allow users to view their own tracked jobs"
    ON public.tracked_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own tracked jobs"
    ON public.tracked_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own tracked jobs"
    ON public.tracked_jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own tracked jobs"
    ON public.tracked_jobs FOR DELETE
    USING (auth.uid() = user_id);


-- 3. Community Jobs Table (Shared bulletin board, open to all authenticated users)
CREATE TABLE IF NOT EXISTS public.community_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.community_jobs ENABLE ROW LEVEL SECURITY;

-- Community Jobs Policies
CREATE POLICY "Allow all authenticated users to view community jobs"
    ON public.community_jobs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow any authenticated user to broadcast a job"
    ON public.community_jobs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = posted_by);


-- 4. Trigger profile creation on Auth Sign Up automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
