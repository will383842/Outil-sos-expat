import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;         // extensible si tu ajoutes des custom claims
  userProfile: any | null;  // extensible si tu stockes le profil Firestore
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  userProfile: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      console.debug("[Auth] onAuthStateChanged", { uid: u?.uid ?? null });
      setUser(u);
      setLoading(false);

      // TODO: si tu utilises des custom claims :
      // const token = u ? await u.getIdTokenResult() : null;
      // setIsAdmin(!!token?.claims?.admin);

      // TODO: si tu charges un profil Firestore :
      // setUserProfile(u ? await loadUserProfile(u.uid) : null);
    });

    return () => unsub();
  }, []);

  const signOut = useCallback(async () => {
    console.debug("[Auth] signOut()");
    await fbSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, userProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
