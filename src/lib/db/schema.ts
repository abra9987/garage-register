import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  numeric,
  date,
  jsonb,
  boolean,
  customType,
} from "drizzle-orm/pg-core";

// Custom bytea type for binary data (PDF storage)
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === "string") return Buffer.from(value, "hex");
    return Buffer.from(value as ArrayBuffer);
  },
});

// ---- Better Auth tables (manually defined with admin plugin fields) ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  role: text("role").default("user"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ---- Custom enums ----

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "extracting",
  "pending_review",
  "approved",
  "exported",
]);

export const documentTypeEnum = pgEnum("document_type", ["ap", "ar"]);

export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "deleted",
  "exported",
]);

// ---- Vehicles table (empty in Phase 1, populated in Phase 2) ----

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobNumber: varchar("job_number", { length: 20 }),
  status: vehicleStatusEnum("status").default("extracting").notNull(),
  vin: varchar("vin", { length: 17 }),
  year: integer("year"),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  color: varchar("color", { length: 50 }),
  odometer: integer("odometer"),
  sellerName: varchar("seller_name", { length: 255 }),
  sellerAddress: text("seller_address"),
  buyerName: varchar("buyer_name", { length: 255 }),
  buyerAddress: text("buyer_address"),
  purchaseDate: date("purchase_date"),
  saleDate: date("sale_date"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
  stockNumber: varchar("stock_number", { length: 50 }),
  extractionConfidence: jsonb("extraction_confidence"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  exportedAt: timestamp("exported_at", { withTimezone: true }),
});

// ---- Documents table (empty in Phase 1) ----

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehicleId: uuid("vehicle_id")
    .references(() => vehicles.id)
    .notNull(),
  type: documentTypeEnum("type").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileData: bytea("file_data").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  extractionRaw: jsonb("extraction_raw"),
});

// ---- Clients ----

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- Warehouses ----

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- Deal Filing ----

export const dealStatusEnum = pgEnum("deal_status", ["draft", "sent"]);

export const dealDocTypeEnum = pgEnum("deal_doc_type", [
  "window_sticker",
  "invoice",
]);

export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobNumber: varchar("job_number", { length: 20 }),
  // Vehicle (extracted)
  vehicleYear: integer("vehicle_year"),
  vehicleMake: varchar("vehicle_make", { length: 100 }),
  vehicleModel: varchar("vehicle_model", { length: 100 }),
  vehicleTrim: varchar("vehicle_trim", { length: 100 }),
  bodyStyle: varchar("body_style", { length: 50 }),
  exteriorColor: varchar("exterior_color", { length: 100 }),
  interiorColor: varchar("interior_color", { length: 100 }),
  engine: varchar("engine", { length: 200 }),
  vin: varchar("vin", { length: 17 }),
  odometer: integer("odometer"),
  // Pricing
  msrp: numeric("msrp", { precision: 12, scale: 2 }),
  buyingPrice: numeric("buying_price", { precision: 12, scale: 2 }),
  hst: numeric("hst", { precision: 12, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  sellingCurrency: varchar("selling_currency", { length: 3 }).default("USD"),
  // Commission
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }),
  commissionFor: varchar("commission_for", { length: 100 }),
  // Delivery
  deliveryDestination: varchar("delivery_destination", { length: 200 }),
  warehouseAddress: text("warehouse_address"),
  // Client
  clientName: varchar("client_name", { length: 255 }),
  clientAddress: text("client_address"),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientEmail: varchar("client_email", { length: 255 }),
  // Notes & email
  notes: text("notes"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  // Meta
  status: dealStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const dealDocuments = pgTable("deal_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id)
    .notNull(),
  docType: dealDocTypeEnum("doc_type").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileData: bytea("file_data").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ---- Audit Log (D-10: append-only) ----

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  fieldName: varchar("field_name", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: text("user_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
