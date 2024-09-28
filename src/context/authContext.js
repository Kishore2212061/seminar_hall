import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase'; // Adjust the import according to your file structure
import { onAuthStateChanged } from 'firebase/auth';

// Create AuthContext
const AuthContext = createContext();

// AuthProvider component to wrap around your app
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Listen to the user's authentication state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user); // Set user if logged in
        });
        return () => unsubscribe(); // Cleanup subscription on unmount
    }, []);

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthContext;
