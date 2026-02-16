const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

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
        console.log('Sign up successful:', data.user ? data.user.email : 'No user data');
    }

    // Try login
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signinError) {
        console.log("Login check failed:", signinError.message);
    } else {
        console.log("Login check successful!");
    }
}

seedUser();
