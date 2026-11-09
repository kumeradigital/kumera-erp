export const moduleKeys = [
  "core",
  "costing",
  "inventory",
  "finance",
  "pos",
  "sales",
  "production",
  "payroll",
] as const;

export type ModuleKey = (typeof moduleKeys)[number];
export type BusinessRole = "owner" | "admin" | "cashier" | "viewer";

export type WorkspaceContext = {
  userId: string;
  businessId: string;
  businessName: string;
  role: BusinessRole;
  locationId?: string;
  modules: ModuleKey[];
  subscriptionStatus:
    "legacy" | "provisioned" | "trial" | "active" | "suspended" | "cancelled";
  onboardingStatus:
    "not_started" | "in_progress" | "minimum_complete" | "complete";
  mustChangePassword: boolean;
  isSuperadmin: boolean;
};

export const allModules: ModuleKey[] = [...moduleKeys];
