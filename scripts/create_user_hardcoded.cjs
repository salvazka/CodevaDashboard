const { createClient } = require('@supabase/supabase-js');

// Hardcoded keys from .env
const SUPABASE_URL = 'https://zpzrtvnjyllhexnjgxqx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwenJ0dm5qeWxsaGV4bmpneHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDQ4OTUsImV4cCI6MjA4NjcyMDg5NX0.xRPr1-YCObk5jK66x2X2gXy7Yq5tcQolpSRxQNJuQMU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedUser() {
    const email = 'codeva2025@gmail.com';
    const password = 'Depok2025';

    console.log(`Attempting to register ${email}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.log('User might already exist or error:', error.message);
    } else {
        console.log('Sign up result:', data.user ? 'Created/Pending Confirmation' : 'No user data');
    }

    // Try login to verify
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signinError) {
        console.log("Login check failed:", signinError.message);
    } else {
        console.log("Login check successful! Access Token obtained.");
    }
}

seedUser();
