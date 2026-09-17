export interface KioskSessionPolicyInput {
  pathname: string;
  hasKioskView: boolean;
}

export interface KioskSessionPolicy {
  kioskMode: boolean;
  redirectTo: "/kiosk" | "/dashboard" | null;
  idleLogoutEnabled: boolean;
}

export function resolveKioskSessionPolicy({
  pathname,
  hasKioskView,
}: KioskSessionPolicyInput): KioskSessionPolicy {
  if (hasKioskView) {
    return {
      kioskMode: true,
      redirectTo: pathname === "/kiosk" ? null : "/kiosk",
      idleLogoutEnabled: false,
    };
  }

  return {
    kioskMode: false,
    redirectTo: pathname === "/kiosk" ? "/dashboard" : null,
    idleLogoutEnabled: true,
  };
}
