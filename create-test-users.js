// Script to create test users in Supabase
// Run this in your browser console on your live app, or create a simple HTML page

// Test user credentials
const testUsers = [
  {
    email: 'test@example.com',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'User'
  },
  {
    email: 'admin@example.com', 
    password: 'adminpassword123',
    firstName: 'Admin',
    lastName: 'User'
  }
];

// Function to create a test user
async function createTestUser(userData) {
  try {
    console.log(`Creating user: ${userData.email}`);
    
    // Import Supabase client (you'll need to replace with your actual credentials)
    const { createClient } = supabase;
    const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
    const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual key
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Sign up the user
    const { data, error } = await supabaseClient.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName
        }
      }
    });
    
    if (error) {
      console.error('Error creating user:', error);
      return;
    }
    
    console.log('User created successfully:', data);
    
    // Update the user profile in the public.users table
    if (data.user) {
      const { error: profileError } = await supabaseClient
        .from('users')
        .upsert({
          id: data.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          is_admin: userData.email === 'admin@example.com',
          subscription_plan: userData.email === 'admin@example.com' ? 'Business' : 'Free',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
      } else {
        console.log('User profile created successfully');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Create all test users
async function createAllTestUsers() {
  for (const user of testUsers) {
    await createTestUser(user);
    // Wait a bit between users to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the script
createAllTestUsers();
