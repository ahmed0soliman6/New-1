import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
  Role,
  Permission,
  ScreenAction,
  CustomPermissionsMap,
  normalizeRole,
  hasPermission as checkHasPermission,
  canAccessRoute as checkCanAccessRoute,
  assertPermission as checkAssertPermission,
  checkScreenPermission,
  getDefaultAllowedScreens,
  getDefaultRolePermissions,
} from '../permissions';
import { safeLogger } from '../utils/logger';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
  allowedScreens?: string[];
  customPermissions?: CustomPermissionsMap;
}

interface AuthContextValue {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  role: Role;
  allowedScreens: string[];
  customPermissions: CustomPermissionsMap;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  canAccess: (screenId: string) => boolean;
  canPerform: (screenId: string, action: ScreenAction) => boolean;
  canView: (screenId: string) => boolean;
  canCreate: (screenId: string) => boolean;
  canUpdate: (screenId: string) => boolean;
  canDelete: (screenId: string) => boolean;
  assertPermission: (permission: Permission, actionDescription?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_PERMISSIONS: CustomPermissionsMap = {};

/**
 * Purges all cached profile, role, and session state for a user from storage (Item 6).
 */
export function clearUserSessionAndCache(uid?: string) {
  try {
    if (uid) {
      localStorage.removeItem(`soli_cached_profile_${uid}`);
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('soli_cached_profile_') ||
          k.startsWith('soli_role_') ||
          k.startsWith('soli_perms_') ||
          k.startsWith('soli_session_'))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const previousRoleRef = useRef<Role | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      // Always remove any legacy localStorage permission caches so permissions are strictly server-verified (Item 6)
      clearUserSessionAndCache(fbUser?.uid);

      if (!fbUser) {
        previousRoleRef.current = null;
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setCurrentUser(fbUser);
      // Keep loading = true and userProfile = null until Firestore confirms the live document (no stale cache UI grant)
      setUserProfile(null);
      setLoading(true);

      if (!db) {
        setLoading(false);
        return;
      }

      // Listen in real-time to user's authoritative profile in Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      unsubscribeDoc = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const isActive = data.active !== false;

            // Instant enforcement: if account is disabled, wipe session/cache and sign out immediately
            if (!isActive) {
              previousRoleRef.current = null;
              clearUserSessionAndCache(fbUser.uid);
              window.dispatchEvent(
                new CustomEvent('soli-rbac-denied', {
                  detail: { message: 'تم تعطيل حسابك من قِبل إدارة العيادة. يرجى التواصل مع الإدارة.' },
                })
              );
              void signOut(auth);
              setUserProfile(null);
              setCurrentUser(null);
              setLoading(false);
              return;
            }

            const rawRole = data.role;
            const parsedRole = normalizeRole(rawRole);

            // If user role changed while logged in, purge session cache immediately (Item 6)
            if (previousRoleRef.current !== null && previousRoleRef.current !== parsedRole) {
              clearUserSessionAndCache(fbUser.uid);
            }
            previousRoleRef.current = parsedRole;

            const rawAllowedScreens = data.allowedScreens;
            const customScreens = Array.isArray(rawAllowedScreens)
              ? (rawAllowedScreens as string[])
              : undefined;
            const rawCustomPermissions = data.customPermissions;
            const customPermissions =
              rawCustomPermissions && typeof rawCustomPermissions === 'object'
                ? (rawCustomPermissions as CustomPermissionsMap)
                : undefined;

            const nextProfile: UserProfile = {
              uid: fbUser.uid,
              username: data.username || fbUser.email?.split('@')[0] || 'user',
              displayName: data.displayName || data.username || 'مستخدم',
              email: data.email || fbUser.email || '',
              role: parsedRole,
              active: true,
              allowedScreens: customScreens,
              customPermissions,
            };
            setUserProfile(nextProfile);
          } else {
            // User document does not exist in Firestore users collection -> deny and sign out
            previousRoleRef.current = null;
            clearUserSessionAndCache(fbUser.uid);
            safeLogger.warn('User profile document not found in Firestore');
            void signOut(auth);
            setUserProfile(null);
            setCurrentUser(null);
          }
          setLoading(false);
        },
        (error: any) => {
          safeLogger.warn('Error fetching user profile from Firestore', error);
          if (error?.code === 'permission-denied') {
            previousRoleRef.current = null;
            clearUserSessionAndCache(fbUser.uid);
            setUserProfile(null);
          }
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  // Until userProfile is verified from Firebase, grant NO permissions (Item 6)
  const isVerifiedActive = Boolean(userProfile && userProfile.active);
  const activeRole: Role = userProfile?.role || 'secretary';
  const effectiveCustomPermissions: CustomPermissionsMap = isVerifiedActive
    ? userProfile?.customPermissions || getDefaultRolePermissions(activeRole)
    : EMPTY_PERMISSIONS;

  const effectiveAllowedScreens: string[] = isVerifiedActive
    ? userProfile?.allowedScreens && userProfile.allowedScreens.length > 0
      ? userProfile.allowedScreens
      : Object.keys(effectiveCustomPermissions).filter((k) => effectiveCustomPermissions[k]?.view)
    : [];

  const hasPermission = (permission: Permission) => {
    if (!isVerifiedActive) return false;
    return checkHasPermission(
      activeRole,
      permission,
      userProfile?.customPermissions,
      userProfile?.allowedScreens
    );
  };

  const canAccess = (screenId: string) => {
    if (!isVerifiedActive) return false;
    return checkCanAccessRoute(
      activeRole,
      screenId,
      userProfile?.allowedScreens,
      userProfile?.customPermissions
    );
  };

  const canPerform = (screenId: string, action: ScreenAction) => {
    if (!isVerifiedActive) return false;
    return checkScreenPermission(
      activeRole,
      screenId,
      action,
      userProfile?.customPermissions,
      userProfile?.allowedScreens
    );
  };

  const canView = (screenId: string) => canPerform(screenId, 'view');
  const canCreate = (screenId: string) => canPerform(screenId, 'create');
  const canUpdate = (screenId: string) => canPerform(screenId, 'update');
  const canDelete = (screenId: string) => canPerform(screenId, 'delete');

  const assertPermission = (permission: Permission, actionDescription?: string) => {
    if (!isVerifiedActive) {
      throw new Error('لم يتم التحقق من صلاحيات الحساب من الخادم بعد.');
    }
    checkAssertPermission(
      activeRole,
      permission,
      actionDescription,
      userProfile?.customPermissions,
      userProfile?.allowedScreens
    );
  };

  const logout = async () => {
    previousRoleRef.current = null;
    clearUserSessionAndCache(currentUser?.uid);
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
        customPermissions: effectiveCustomPermissions,
        loading,
        hasPermission,
        canAccess,
        canPerform,
        canView,
        canCreate,
        canUpdate,
        canDelete,
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
    safeLogger.warn('useAuth called outside of AuthProvider; returning zero-privilege context');
    return {
      currentUser: null,
      userProfile: null,
      role: 'secretary',
      allowedScreens: [],
      customPermissions: EMPTY_PERMISSIONS,
      loading: false,
      hasPermission: () => false,
      canAccess: () => false,
      canPerform: () => false,
      canView: () => false,
      canCreate: () => false,
      canUpdate: () => false,
      canDelete: () => false,
      assertPermission: () => {
        throw new Error('غير مصرح بتنفيذ هذا الإجراء خارج جلسة مصادقة نشطة.');
      },
      logout: async () => {},
    };
  }
  return context;
};

export const usePermissions = useAuth;
