import React from 'react';
import { Permission, Role, hasPermission as checkHasPermission } from '../../permissions';
import { usePermissions } from '../../context/AuthContext';

export interface PermissionGateProps {
  permission: Permission;
  role?: Role | string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Centrally gates buttons, panels, or actions based on system permissions.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role: overrideRole,
  fallback = null,
  children,
}) => {
  const { role: contextRole } = usePermissions();
  const effectiveRole = overrideRole || contextRole;

  const allowed = checkHasPermission(effectiveRole, permission);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
