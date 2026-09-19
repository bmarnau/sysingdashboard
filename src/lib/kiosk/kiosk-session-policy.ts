export interface KioskSessionPolicyInput {
  pathname: string;
  hasKioskView: boolean;
  internalModeRequested?: boolean;
  hasProjectControllingView?: boolean;
}

export interface KioskSessionPolicy {
  kioskMode: boolean;
  redirectTo: "/kiosk" | "/dashboard" | null;
  idleLogoutEnabled: boolean;
}

export function resolveKioskSessionPolicy({
  pathname,
  hasKioskView,
  internalModeRequested = false,
  hasProjectControllingView = false,
}: KioskSessionPolicyInput): KioskSessionPolicy {
  if (hasKioskView) {
    return {
      kioskMode: true,
      redirectTo: pathname === "/kiosk" ? null : "/kiosk",
      idleLogoutEnabled: false,
    };
  }

  const internalKioskAllowed =
    pathname === "/kiosk" && internalModeRequested && hasProjectControllingView;

  return {
    kioskMode: false,
    redirectTo: pathname === "/kiosk" && !internalKioskAllowed ? "/dashboard" : null,
    idleLogoutEnabled: true,
  };
}
