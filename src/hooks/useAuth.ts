import { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
    signInWithRedirect, 
    signOut, 
    onAuthStateChanged, 
    getRedirectResult,
    updateProfile,
    type User 
} from 'firebase/auth';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        // 2. Check for redirect result (important for loginWithRedirect)
        getRedirectResult(auth).catch((error) => {
            console.error("Error recovering from Google Redirect:", error);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            // signInWithRedirect is much better for mobile/PWAs
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Error starting Google Login:", error);
            alert("Error al iniciar sesión: " + (error instanceof Error ? error.message : "Desconocido"));
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error logging out:", error);
            throw error;
        }
    };

    const updateProfileWrapper = async (data: { displayName?: string, photoURL?: string }) => {
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, data);
            setUser({ ...auth.currentUser }); // Trigger refresh
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    };

    return { user, loginWithGoogle, logout, loading, updateProfile: updateProfileWrapper };
};
