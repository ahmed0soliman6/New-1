import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
  Role,
  Permission,
  normalizeRole,
  hasPermission as checkHasPermission,
  canAccessRoute as checkCanAccessRoute,
  assertPermission as checkAssertPermission,
  getDefaultAllowedScreens,
  ALL_SYSTEM_SCREENS,
} from '../permissions';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
  allowedScreens?: string[];
}

interface AuthContextValue {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: Role;
  allowedScreens: string[];
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  canAccess: (screenId: string) => boolean;
  assertPermission: (permission: Permission, actionDescription?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      setCurrentUser(fbUser);

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (!fbUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      if (!db) {
        // Fallback without Firestore
        setUserProfile({
          uid: fbUser.uid,
          username: fbUser.email?.split('@')[0] || 'user',
          displayName: fbUser.displayName || 'مستخدم',
          email: fbUser.email || '',
          role: 'admin',
          active: true,
        });
        setLoading(false);
        return;
      }

      // Listen in real-time to user's profile in Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      unsubscribeDoc = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const isActive = data.active !== false;

            // Instant enforcement: if account is disabled, sign out immediately
            if (!isActive) {
              alert('تم تعطيل حسابك من قِبل إدارة العيادة. يرجى التواصل مع الإدارة.');
              void signOut(auth);
              setUserProfile(null);
              setLoading(false);
              return;
            }

            const rawRole = data.role;
            const parsedRole = normalizeRole(rawRole);
            const rawAllowedScreens = data.allowedScreens;
            const customScreens = Array.isArray(rawAllowedScreens)
              ? (rawAllowedScreens as string[])
              : undefined;

            setUserProfile({
              uid: fbUser.uid,
              username: data.username || fbUser.email?.split('@')[0] || 'user',
              displayName: data.displayName || data.username || 'مستخدم',
              email: data.email || fbUser.email || '',
              role: parsedRole,
              active: true,
              allowedScreens: customScreens,
            });
          } else {
            // Default profile for initial admin or unmigrated user
            const fallbackUsername = fbUser.email?.split('@')[0]?.toLowerCase() || 'user';
            const fallbackRole: Role = fallbackUsername.includes('admin')
              ? 'admin'
              : fallbackUsername.includes('doc')
              ? 'doctor'
              : fallbackUsername.includes('sec')
              ? 'secretary'
              : 'admin';

            setUserProfile({
              uid: fbUser.uid,
              username: fallbackUsername,
              displayName: fbUser.displayName || fallbackUsername,
              email: fbUser.email || '',
              role: fallbackRole,
              active: true,
              allowedScreens: getDefaultAllowedScreens(fallbackRole),
            });
          }
          setLoading(false);
        },
        (error) => {
          console.warn('[AuthContext] Error fetching profile:', error);
          // Don't lock user out if network or rules transient error occurs
          setUserProfile((prev) => prev || {
            uid: fbUser.uid,
            username: fbUser.email?.split('@')[0] || 'user',
            displayName: 'مستخدم',
            email: fbUser.email || '',
            role: 'admin',
            active: true,
            allowedScreens: getDefaultAllowedScreens('admin'),
          });
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const activeRole: Role = userProfile?.role || 'secretary';
  const effectiveAllowedScreens: string[] =
    userProfile?.allowedScreens && userProfile.allowedScreens.length > 0
      ? userProfile.allowedScreens
      : getDefaultAllowedScreens(activeRole);

  const hasPermission = (permission: Permission) => {
    return checkHasPermission(activeRole, permission);
  };

  const canAccess = (screenId: string) => {
    return checkCanAccessRoute(activeRole, screenId, userProfile?.allowedScreens);
  };

  const assertPermission = (permission: Permission, actionDescription?: string) => {
    checkAssertPermission(activeRole, permission, actionDescription);
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setUserProfile(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: activeRole,
        allowedScreens: effectiveAllowedScreens,
        loading,
        hasPermission,
        canAccess,
        assertPermission,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('[useAuth] called outside of AuthProvider. Using fallback admin context.');
    return {
      currentUser: null,
      userProfile: {
        uid: 'default-admin',
        username: 'admin',
        displayName: 'د. حازم القاضي',
        email: 'admin@soliclinic.com',
        role: 'admin',
        active: true,
      },
      role: 'admin',
      allowedScreens: ALL_SYSTEM_SCREENS.map((s) => s.id),
      loading: false,
      hasPermission: () => true,
      canAccess: () => true,
      assertPermission: () => {},
      logout: async () => {},
    };
  }
  return context;
};

export const usePermissions = useAuth;
