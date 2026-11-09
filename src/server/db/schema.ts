import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const entryType = pgEnum("entry_type", [
  "initial_capital",
  "income",
  "expense",
  "asset",
  "deposit",
  "refund",
]);
export const taxMode = pgEnum("tax_mode", ["included", "added", "exempt"]);
export const entryStatus = pgEnum("entry_status", ["active", "void"]);

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  rut: text("rut"),
  legalName: text("legal_name"),
  businessActivity: text("business_activity"),
  address: text("address"),
  commune: text("commune"),
  city: text("city"),
  contactEmail: text("contact_email"),
  phone: text("phone"),
  currency: text("currency").notNull().default("CLP"),
  timezone: text("timezone").notNull().default("America/Santiago"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  fullName: text("full_name").notNull(),
  rut: text("rut").notNull(),
  jobTitle: text("job_title").notNull(),
  afpName: text("afp_name").notNull(),
  afpRate: numeric("afp_rate", { precision: 6, scale: 4 }).notNull(),
  healthSystem: text("health_system").notNull().default("FONASA"),
  healthRate: numeric("health_rate", { precision: 6, scale: 4 })
    .notNull()
    .default("0.07"),
  baseSalary: bigint("base_salary", { mode: "number" }).notNull(),
  mealAllowance: bigint("meal_allowance", { mode: "number" })
    .notNull()
    .default(0),
  transportAllowance: bigint("transport_allowance", { mode: "number" })
    .notNull()
    .default(0),
  contractStart: date("contract_start").notNull(),
  contractEnd: date("contract_end"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payrollSlips = pgTable("payroll_slips", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id),
  period: date("period").notNull(),
  workedDays: integer("worked_days").notNull().default(30),
  contractualDays: integer("contractual_days").notNull().default(30),
  baseEarned: bigint("base_earned", { mode: "number" }).notNull(),
  gratification: bigint("gratification", { mode: "number" }).notNull(),
  otherTaxableEarnings: bigint("other_taxable_earnings", { mode: "number" })
    .notNull()
    .default(0),
  mealAllowance: bigint("meal_allowance", { mode: "number" })
    .notNull()
    .default(0),
  transportAllowance: bigint("transport_allowance", { mode: "number" })
    .notNull()
    .default(0),
  otherNonTaxableEarnings: bigint("other_non_taxable_earnings", {
    mode: "number",
  })
    .notNull()
    .default(0),
  afpDeduction: bigint("afp_deduction", { mode: "number" }).notNull(),
  healthDeduction: bigint("health_deduction", { mode: "number" }).notNull(),
  unemploymentDeduction: bigint("unemployment_deduction", { mode: "number" })
    .notNull()
    .default(0),
  incomeTax: bigint("income_tax", { mode: "number" }).notNull().default(0),
  advances: bigint("advances", { mode: "number" }).notNull().default(0),
  otherDeductions: bigint("other_deductions", { mode: "number" })
    .notNull()
    .default(0),
  netPay: bigint("net_pay", { mode: "number" }).notNull(),
  paymentStatus: text("payment_status").notNull().default("draft"),
  paidOn: date("paid_on"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  isSuperadmin: boolean("is_superadmin").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const businessAdmins = pgTable("business_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  assignedBy: uuid("assigned_by").references(() => profiles.id),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const openingLedgers = pgTable(
  "opening_ledgers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: text("name").notNull().default("Apertura"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("opening_ledger_business_idx").on(t.businessId)],
);
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});
export const openingEntries = pgTable("opening_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  ledgerId: uuid("ledger_id")
    .notNull()
    .references(() => openingLedgers.id),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  entryDate: date("entry_date").notNull(),
  description: text("description").notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  type: entryType("type").notNull().default("expense"),
  taxMode: taxMode("tax_mode").notNull().default("included"),
  taxRate: integer("tax_rate").notNull().default(19),
  netAmount: bigint("net_amount", { mode: "number" }).notNull(),
  taxAmount: bigint("tax_amount", { mode: "number" }).notNull(),
  totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
  note: text("note"),
  estimated: boolean("estimated").notNull().default(false),
  status: entryStatus("status").notNull().default("active"),
  voidReason: text("void_reason"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => openingEntries.id),
  storagePath: text("storage_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const entryChangeLog = pgTable("entry_change_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => openingEntries.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => profiles.id),
  before: jsonb("before"),
  after: jsonb("after"),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const roleChangeLog = pgTable("role_change_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  targetUserId: uuid("target_user_id")
    .notNull()
    .references(() => profiles.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => profiles.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// SaaS foundation. Operational tables introduced by historical SQL migrations
// remain intentionally untouched; these definitions cover the new additive model.
export const saasModules = pgTable("saas_modules", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const saasPlans = pgTable("saas_plans", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
});

export const businessSubscriptions = pgTable("business_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  planKey: text("plan_key")
    .notNull()
    .references(() => saasPlans.key),
  status: text("status").notNull().default("provisioned"),
  startsAt: timestamp("starts_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
});

export const businessLocations = pgTable("business_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  name: text("name").notNull(),
  address: text("address"),
  commune: text("commune"),
  city: text("city"),
  timezone: text("timezone").notNull().default("America/Santiago"),
  isPrimary: boolean("is_primary").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

export const businessMemberships = pgTable("business_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  role: text("role").notNull().default("viewer"),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  invitedBy: uuid("invited_by").references(() => profiles.id),
});

export const businessOnboarding = pgTable("business_onboarding", {
  businessId: uuid("business_id")
    .primaryKey()
    .references(() => businesses.id),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("not_started"),
  currentStep: text("current_step").notNull().default("password"),
  completedSteps: text("completed_steps").array().notNull().default([]),
  businessModel: text("business_model").array().notNull().default([]),
  salesChannels: text("sales_channels").array().notNull().default([]),
  paymentMethods: text("payment_methods").array().notNull().default([]),
  minimumCompletedAt: timestamp("minimum_completed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
