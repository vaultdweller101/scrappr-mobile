// hooks/useAuth.ts
import { auth } from '@/firebaseConfig';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut, User } from 'firebase/auth';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: '1075565266262-rjdu8re2t9jnqsv7vehs3dnfn41rn7tm.apps.googleusercontent.com',
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken; // Ensure you handle nulls safely

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      }
    } catch (error) {
      console.error("Google Sign-In Error", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    await GoogleSignin.signOut();
  };

  return { user, loading, signIn, logout };
}