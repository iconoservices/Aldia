import { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
    signInWithPopup, 
    signInWithRedirect,
    signOut, 
    onAuthStateChanged, 
    updateProfile,
    type User 
} from 'firebase/auth';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            // Attempt popup login (preferred in desktop/flexible envs)
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error starting Google Login with popup:", error);
            
            // Check if the error is due to browser blocking the popup
            const isPopupBlocked = error instanceof Error && 
                ((error as any).code === 'auth/popup-blocked' || 
                 error.message.includes('popup-blocked') || 
                 error.message.includes('cancelled-by-user')); // sometimes browser blocks show up as cancelled/closed by browser policies
            
            if (isPopupBlocked) {
                console.log("Popup blocked. Trying login with redirect...");
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (redirectError) {
                    console.error("Error starting Google Login with redirect:", redirectError);
                    alert("Error al iniciar sesión con redirección: " + (redirectError instanceof Error ? redirectError.message : "Desconocido"));
                    throw redirectError;
                }
            } else {
                alert("Error al iniciar sesión: " + (error instanceof Error ? error.message : "Desconocido"));
                throw error;
            }
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
