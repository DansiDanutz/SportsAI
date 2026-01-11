-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "preferences" TEXT DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "defaultTimeZoneRules" TEXT DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sportId" TEXT NOT NULL,
    "country" TEXT,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "seasonality" TEXT DEFAULT '{}',
    CONSTRAINT "League_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "country" TEXT,
    "externalIds" TEXT DEFAULT '{}',
    CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sportId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "startTimeUtc" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "homeId" TEXT,
    "awayId" TEXT,
    "venue" TEXT,
    "round" TEXT,
    "externalIds" TEXT DEFAULT '{}',
    CONSTRAINT "Event_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_awayId_fkey" FOREIGN KEY ("awayId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sportId" TEXT NOT NULL,
    "marketKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period" TEXT,
    "liveSupported" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Market_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bookmaker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "regions" TEXT DEFAULT '[]',
    "licenseJurisdictions" TEXT DEFAULT '[]',
    "deepLinkTemplates" TEXT DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "OddsQuote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "bookmakerId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcomeKey" TEXT NOT NULL,
    "odds" REAL NOT NULL,
    "line" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "sourceProvider" TEXT,
    "confidence" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "OddsQuote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OddsQuote_bookmakerId_fkey" FOREIGN KEY ("bookmakerId") REFERENCES "Bookmaker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OddsQuote_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArbitrageOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "profitMargin" REAL NOT NULL,
    "confidenceScore" REAL NOT NULL,
    "bookmakerLegs" TEXT NOT NULL DEFAULT '[]',
    "recommendedStakes" TEXT NOT NULL DEFAULT '{}',
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "isWinningTip" BOOLEAN NOT NULL DEFAULT false,
    "creditCost" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "ArbitrageOpportunity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ArbitrageOpportunity_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sportId" TEXT,
    "name" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Preset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "opportunityId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CreditTransaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ArbitrageOpportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_key_key" ON "Sport"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Market_sportId_marketKey_key" ON "Market"("sportId", "marketKey");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmaker_key_key" ON "Bookmaker"("key");

-- CreateIndex
CREATE INDEX "OddsQuote_eventId_marketId_idx" ON "OddsQuote"("eventId", "marketId");

-- CreateIndex
CREATE INDEX "OddsQuote_bookmakerId_idx" ON "OddsQuote"("bookmakerId");

-- CreateIndex
CREATE INDEX "ArbitrageOpportunity_eventId_idx" ON "ArbitrageOpportunity"("eventId");

-- CreateIndex
CREATE INDEX "ArbitrageOpportunity_isWinningTip_idx" ON "ArbitrageOpportunity"("isWinningTip");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_entityType_entityId_key" ON "Favorite"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Preset_userId_idx" ON "Preset"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");
