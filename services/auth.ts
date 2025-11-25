import { supabase } from '@/integrations/supabase/client';
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { initializeFirebase } from './firebase';
import { saveUserRoleToDB } from './offlineDb';
import { UserRole } from '../types';

// Initialize Firebase to ensure we can check old credentials
try {
  initializeFirebase();
} catch (e) {
  console.warn("Firebase initialization warning:", e);
}

export const performLogin = async (email: string, password: string) => {
  console.log("Attempting login for:", email);

  // 1. Try logging in to Supabase directly
  const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!supabaseError && supabaseData.user) {
    console.log("Supabase login successful.");
    return { user: supabaseData.user, source: 'supabase' };
  }

  console.log("Supabase login failed (expected for migration). Error:", supabaseError?.message);

  // 2. If Supabase login fails, try Firebase (Legacy)
  try {
    const auth = getAuth();
    console.log("Attempting Firebase legacy login...");
    const firebaseCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = firebaseCredential.user;

    if (firebaseUser) {
      console.log("Found legacy Firebase user. Migrating to Supabase...");
      
      // 3. Create Supabase user with same credentials
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // IMPORTANT: "Confirm email" must be disabled in Supabase for this to work instantly.
          data: {
            migrated_from_firebase: true,
            firebase_uid: firebaseUser.uid
          }
        }
      });

      if (signUpError) {
        console.error("Supabase signup failed during migration:", signUpError);
        if (signUpError.message.includes("already registered")) {
             throw new Error("Account exists in new system but passwords do not match. Please reset your password.");
        }
        throw signUpError;
      }
      
      if (signUpData.user) {
        // 4. Link the old Data (User Role) to new ID
        console.log("Linking old data for:", email);
        
        // Use secure RPC to claim role, bypassing RLS which now blocks self-updates
        const { data: roleData, error: updateError } = await supabase
          .rpc('claim_legacy_user_role')
          .single();

        if (updateError) {
            console.error("Failed to link user role:", updateError);
        } else if (roleData && roleData.role) {
            console.log("User role linked successfully. Caching locally...", roleData.role);
            // CRITICAL FIX: Cache the role immediately to prevent "Access Denied" race condition
            await saveUserRoleToDB(signUpData.user.id, roleData.role as UserRole);
        }

        return { user: signUpData.user, source: 'migration' };
      }
    }
  } catch (firebaseError: any) {
    console.error("Firebase login failed:", firebaseError);
    
    if (firebaseError.code === 'auth/invalid-api-key') {
        throw new Error("System Error: Invalid Firebase Configuration. Please check .env file.");
    } else if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
        throw new Error("Invalid email or password.");
    } else if (firebaseError.code === 'auth/network-request-failed') {
        throw new Error("Network error. Check your connection.");
    }
  }

  throw supabaseError || new Error("Invalid login credentials");
};

export const performLogout = async () => {
  const auth = getAuth();
  try {
    await firebaseSignOut(auth); 
  } catch (e) { 
    // Ignore firebase signout errors
  }
  await supabase.auth.signOut();
};