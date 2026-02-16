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
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created/check:', data.user ? data.user.email : 'No user data returned (maybe already exists?)');

        // We can also try to signIn to see if it works/already exists.
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
}

seedUser();
