/*
  Warnings:

  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_variants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `faces` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `phash` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrls` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `billingData` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `paymentRef` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `shippingData` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `specs` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `pages` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `priceSnapshot` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `variantId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `layoutJson` on the `templates` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `templates` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `orders` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `category` to the `templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateType` to the `templates` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "order_items";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "product_variants";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "formats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "orientation" TEXT NOT NULL DEFAULT 'square',
    "minPages" INTEGER NOT NULL DEFAULT 20,
    "maxPages" INTEGER NOT NULL DEFAULT 200,
    "pageIncrement" INTEGER NOT NULL DEFAULT 2,
    "bleed" REAL NOT NULL DEFAULT 3,
    "safeMargin" REAL NOT NULL DEFAULT 5,
    "gutterMargin" REAL NOT NULL DEFAULT 10,
    "priceMultiplier" REAL NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "formats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "formats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'photo',
    "weight" INTEGER NOT NULL,
    "thickness" REAL NOT NULL,
    "finish" TEXT NOT NULL DEFAULT 'glossy',
    "lamination" TEXT NOT NULL DEFAULT 'none',
    "pricePerPage" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "papers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "format_papers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formatId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "format_papers_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "formats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "format_papers_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cover_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'soft',
    "bindingTolerance" REAL NOT NULL DEFAULT 0,
    "price" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cover_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pageType" TEXT NOT NULL DEFAULT 'regular',
    "templateId" TEXT,
    "elements" TEXT NOT NULL DEFAULT '[]',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "changesSummary" TEXT,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_versions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "dpi" INTEGER,
    "colorProfile" TEXT,
    "hasAlpha" BOOLEAN NOT NULL DEFAULT false,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "thumbnailSmall" TEXT,
    "thumbnailMedium" TEXT,
    "thumbnailLarge" TEXT,
    "exifData" TEXT NOT NULL DEFAULT '{}',
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_assets" ("createdAt", "dpi", "exifData", "filename", "height", "id", "mimeType", "originalName", "processingStatus", "sizeBytes", "storageKey", "tenantId", "updatedAt", "url", "userId", "width") SELECT "createdAt", "dpi", "exifData", "filename", "height", "id", "mimeType", "originalName", "processingStatus", "sizeBytes", "storageKey", "tenantId", "updatedAt", "url", "userId", "width" FROM "assets";
DROP TABLE "assets";
ALTER TABLE "new_assets" RENAME TO "assets";
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "productSnapshot" TEXT NOT NULL DEFAULT '{}',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "coverPdfUrl" TEXT,
    "interiorPdfUrl" TEXT,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "completedAt" DATETIME,
    "reviewerId" TEXT,
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("createdAt", "id", "orderNumber", "status", "tenantId", "updatedAt", "userId") SELECT "createdAt", "id", "orderNumber", "status", "tenantId", "updatedAt", "userId" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'photobook',
    "description" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_products" ("createdAt", "description", "id", "name", "tenantId", "updatedAt") SELECT "createdAt", "description", "id", "name", "tenantId", "updatedAt" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "productId" TEXT,
    "formatId" TEXT,
    "paperId" TEXT,
    "coverTypeId" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 20,
    "spineWidth" REAL NOT NULL DEFAULT 5,
    "width" REAL NOT NULL DEFAULT 200,
    "height" REAL NOT NULL DEFAULT 200,
    "bleed" REAL NOT NULL DEFAULT 3,
    "safeMargin" REAL NOT NULL DEFAULT 5,
    "gutterMargin" REAL NOT NULL DEFAULT 10,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "lockedAt" DATETIME,
    "lockedVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "projects_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "formats" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_coverTypeId_fkey" FOREIGN KEY ("coverTypeId") REFERENCES "cover_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("createdAt", "id", "name", "productId", "settings", "status", "tenantId", "updatedAt", "userId") SELECT "createdAt", "id", "name", "productId", "settings", "status", "tenantId", "updatedAt", "userId" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE TABLE "new_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "previewUrl" TEXT,
    "thumbnailUrl" TEXT,
    "dimensions" TEXT NOT NULL DEFAULT '{}',
    "margins" TEXT NOT NULL DEFAULT '{}',
    "safeArea" TEXT NOT NULL DEFAULT '{}',
    "elements" TEXT NOT NULL DEFAULT '[]',
    "colors" TEXT NOT NULL DEFAULT '[]',
    "fonts" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_templates" ("createdAt", "description", "id", "name", "previewUrl", "productType", "tenantId", "updatedAt") SELECT "createdAt", "description", "id", "name", "previewUrl", "productType", "tenantId", "updatedAt" FROM "templates";
DROP TABLE "templates";
ALTER TABLE "new_templates" RENAME TO "templates";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'photographer',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("active", "createdAt", "email", "emailVerified", "id", "lastLoginAt", "name", "password", "role", "tenantId", "updatedAt") SELECT "active", "createdAt", "email", "emailVerified", "id", "lastLoginAt", "name", "password", "role", "tenantId", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "format_papers_formatId_paperId_key" ON "format_papers"("formatId", "paperId");

-- CreateIndex
CREATE UNIQUE INDEX "pages_projectId_pageNumber_key" ON "pages"("projectId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_projectId_versionNumber_key" ON "project_versions"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_eventType_idx" ON "audit_logs"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_entityType_entityId_idx" ON "audit_logs"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
