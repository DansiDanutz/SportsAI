# SportsAI Platform: The Complete Master Guide

**Version 5.0.0 - Arbitrage Priority**

**Prepared by:** Senior Planning Director, Manus AI

**Date:** January 10, 2026

**Status:** Final - Ready for Implementation

---

# Part 1: The V5 Implementation Guide (Arbitrage Priority)

## Table of Contents

1.  [Executive Summary: Arbitrage as the Core](#1-executive-summary-arbitrage-as-the-core)
2.  [Introduction: A Paradigm Shift in Sports Analytics](#2-introduction-a-paradigm-shift-in-sports-analytics)
3.  [Project Overview & Roadmap: Arbitrage First](#3-project-overview--roadmap-arbitrage-first)
4.  [Monetization Model: Freemium Powered by Arbitrage](#4-monetization-model-freemium-powered-by-arbitrage)
5.  [System Architecture: Built for Arbitrage](#5-system-architecture-built-for-arbitrage)
6.  [The Arbitrage Detection Engine](#6-the-arbitrage-detection-engine)
7.  [Platform Implementation](#7-platform-implementation)
8.  [API Specifications](#8-api-specifications)
9.  [Database Schema Design](#9-database-schema-design)
10. [Mobile App Design: Surfacing Value](#10-mobile-app-design-surfacing-value)
11. [DevOps & Deployment](#11-devops--deployment)
12. [Team Structure & Timeline](#12-team-structure--timeline)
13. [Security, Compliance & Responsible Disclosure](#13-security-compliance--responsible-disclosure)

---

## 1. Executive Summary: Arbitrage as the Core

This document outlines the implementation of the SportsAI platform, a next-generation sports intelligence service. **The primary mission and core value proposition of this platform is the real-time detection and delivery of sports betting arbitrage opportunities.** All other features are secondary and built to support this central function.

An arbitrage opportunity (a "arb") occurs when the odds offered by different sportsbooks on the same event create a situation where a user can bet on all possible outcomes and be guaranteed a profit, regardless of the result. Our platform will be the fastest and most reliable tool for identifying these opportunities.

**Monetization is directly tied to this core feature.** Users will subscribe to the platform for premium access, and the most valuable, high-confidence arbitrage tips will be unlocked using a credit-based system. The business model is designed around providing tangible, actionable value that justifies both the subscription and credit purchases.

This guide reprioritizes the entire project to focus on delivering a world-class arbitrage detection engine as the first and most critical component.

---

## 2. Introduction: A Paradigm Shift in Sports Analytics

Welcome to the implementation guide for SportsAI V5. This version represents a strategic pivot to prioritize what matters most: **finding market inefficiencies and delivering them to our users as actionable intelligence.** While the platform will offer a rich set of analytics, its heart is an engine built to find and validate arbitrage opportunities across the global sports betting landscape.

This document details the architecture, algorithms, and roadmap required to build this arbitrage-centric platform.

---

## 3. Project Overview & Roadmap: Arbitrage First

### Product Goals

1.  **Dominance in Arbitrage Detection:** To be the market leader in speed, accuracy, and breadth of arbitrage opportunity detection.
2.  **Actionable Intelligence:** To not just find arbs, but to present them in a clear, actionable format that allows users to act quickly.
3.  **High-Value Monetization:** To create a powerful revenue stream by charging for the high-value, guaranteed-profit insights our engine produces.
4.  **User Trust:** To build a loyal user base by consistently delivering reliable and profitable opportunities.

### Phased Implementation Roadmap (Arbitrage Priority)

| Phase | Duration | Key Deliverables |
| --- | --- | --- |
| **Phase 1: The Arbitrage Engine** | **Months 1-4** | **Core arbitrage detection service, data ingestion from 5+ sportsbooks, value scoring algorithm, MVP credit-based unlocking mechanism.** |
| **Phase 2: Platform & Mobile MVP** | Months 5-7 | User identity, billing service, mobile app MVP to display arbitrage tips, basic filtering, subscription management. |
| **Phase 3: Expansion & AI** | Months 8-10 | Integration of all 10+ sportsbooks, advanced AI forecasting models, full feature-gating, notification service. |
| **Phase 4: Public Launch & Scale** | Months 11-12 | Beta testing, production deployment, public launch, and scaling of the arbitrage engine. |

---

## 4. Monetization Model: Freemium Powered by Arbitrage

**Free Tier:**
*   Access to basic odds comparison for a limited set of events.
*   Can see that arbitrage opportunities *exist* (e.g., "3 arbitrage opportunities found in the Premier League today") but cannot view the details.
*   This creates powerful FOMO (Fear Of Missing Out) and serves as the primary driver for conversion.

**Premium Tier (Paid Subscription):**
*   Full access to the odds comparison tool across all sports and events.
*   Ability to see *low-confidence* or *minor* arbitrage opportunities (e.g., <1% profit).
*   Access to advanced filtering and the real-time notification engine for market movements.

**"Winning Tips" (Credit-Based):**
*   **This is the core monetization feature.**
*   High-confidence arbitrage opportunities (e.g., >1% guaranteed profit, validated across multiple data points) are locked behind a credit paywall.
*   Users on the Premium Tier can spend credits to unlock the full details of a "Winning Tip," which includes the specific event, markets, sportsbooks, and recommended stakes.

---

## 5. System Architecture: Built for Arbitrage

### Service Decomposition (Arbitrage Priority)

The architecture is centered around the new, high-priority `arbitrage-engine-service`.

| Service | Priority | Responsibilities |
| --- | --- | --- |
| **`arbitrage-engine-service`** | **1 (Core)** | **Constantly scans normalized odds data to find, validate, and score arbitrage opportunities. Publishes findings for consumption.** |
| `odds-service` | 2 (High) | Ingests, normalizes, and stores odds data with extreme low latency. Feeds the arbitrage engine. |
| `credit-service` | 2 (High) | Manages the purchasing and spending of credits to unlock Winning Tips. |
| `identity-service` | 3 (Medium) | Manages users and their subscription tiers. |
| `billing-service` | 3 (Medium) | Manages the recurring subscription payments. |
| `notification-service` | 3 (Medium) | Sends real-time alerts for new arbitrage opportunities to premium users. |
| ... (other services) | 4 (Low) | ... |

### Data Flow for Arbitrage Detection

1.  The `odds-service` ingests raw odds from multiple sportsbooks via WebSocket/API streams.
2.  Odds are normalized in real-time and published to a dedicated, low-latency Kafka topic: `normalized-odds-stream`.
3.  The `arbitrage-engine-service` is the primary consumer of this stream.
4.  For every incoming odds update, the engine compares it against the latest odds from all other bookmakers for the same market.
5.  If an arbitrage opportunity is detected, it is passed to the **Value Scoring Algorithm**.
6.  If the opportunity scores above a certain confidence threshold, it is published to the `arbitrage-opportunities` topic.
7.  The `notification-service` and `gateway-api` consume these opportunities to alert users and display them in the app (in a locked or unlocked state).

---

## 6. The Arbitrage Detection Engine

This is the most critical piece of intellectual property for the platform.

### Core Algorithm

The fundamental algorithm for a 2-way market arbitrage is:

> **Arbitrage % = (1 / Odds_A) + (1 / Odds_B) - 1**

If the result is **negative**, an arbitrage opportunity exists. The engine will extend this logic to 3-way (e.g., Win/Draw/Loss) and multi-way markets.

### Value Scoring Algorithm

Not all arbs are created equal. The engine will score each opportunity based on several factors:

*   **Profit Margin:** The calculated guaranteed profit %.
*   **Bookmaker Trust Score:** A score based on the reputation and reliability of the involved sportsbooks.
*   **Odds Stability:** How long the odds have been available. Fleeting odds are scored lower.
*   **Market Liquidity:** An estimation of how much can be staked before the odds change (requires advanced data feeds like Betfair Exchange).
*   **Confidence Score:** A final, consolidated score. Opportunities with a score > 0.95 might be classified as "Winning Tips."

### Risk Management & Validation

*   **Cross-Validation:** An opportunity is only considered valid if the odds are confirmed by at least two independent data provider feeds.
*   **Rule Engine:** A rules engine will be used to filter out common false positives (e.g., obvious data errors, mismatched market definitions).
*   **Staking Limits:** The engine will provide recommended staking amounts to maximize profit without triggering sportsbook limits.

---

## 7. API Specifications

### New Endpoint: Arbitrage Opportunities

`GET /arbitrage/opportunities`

*   **Response for Free Users:**
    ```json
    {
      "summary": {
        "opportunity_count": 5,
        "highest_profit_margin": "~2.5%"
      },
      "opportunities": [] // Empty array
    }
    ```
*   **Response for Premium Users (Credit purchase required for details):**
    ```json
    {
      "opportunities": [
        {
          "id": "arb-123",
          "profit_margin": 2.45,
          "confidence_score": 0.98,
          "status": "locked",
          "credit_cost": 10
        }
      ]
    }
    ```

`POST /arbitrage/opportunities/{id}/unlock`

*   Consumes credits and returns the full details of the arbitrage opportunity.

---

## 8. Mobile App Design: Surfacing Value

*   **Arbitrage Feed:** The main screen of the app for premium users will be a real-time feed of arbitrage opportunities.
*   **The "Unlock" Flow:** A seamless, one-tap process to spend credits and reveal the details of a "Winning Tip."
*   **Clear Call to Action:** The UI will be designed to make the value proposition of upgrading or buying credits immediately obvious.

---

## 9. Security, Compliance & Responsible Disclosure

*   **Terms of Service:** The ToS will explicitly state that the platform provides analytical information and does not guarantee profits. It will also advise users to be aware of sportsbook rules regarding arbitrage betting.
*   **Responsible Use:** The platform will encourage responsible bankroll management and will not promote reckless betting behavior.

---



# Part 2: Original Platform Specification (V1.2)

SportsAi Platform
Product & Technical Specification
Odds Comparison • Personalized Filters • AI Insights
Version 1.0 (Draft)
Generated: January 10, 2026

Page 1

Document Control
Document

SportsAi Platform - Product & Technical
Specification

Version

1.0 (Draft)

Date

January 10, 2026

Owner

Product & Engineering (SportsAi)

Audience

Founders, Product, Engineering, Data/ML, Design,
Legal/Compliance, Partners

Confidentiality

Internal / NDA with partners

Change Log
Version

Date

Author

Notes

1.0

2026-01-10

ChatGPT Atlas (spec
generator)

Initial draft: end-to-end
product, data
integrations,
architecture, API, UI,
and AI plan.

Page 2

Table of Contents
NOTE: This document uses Word heading styles. In Microsoft Word, right-click and choose 'Update Field'
to generate an auto Table of Contents.

Page 3

1. Executive Summary
SportsAi is a sports intelligence platform that combines:
• Multi-sport fixtures & results
• Real-time odds/offers aggregation across multiple sportsbooks
• Powerful per-sport filtering and personalization
• AI-driven insights (probability, expected value indicators, explainable reasoning, and user-specific
recommendations)
The core differentiator is a professional, user-friendly experience that lets users quickly see the
differences between sportsbooks for the same event and market, while also surfacing relevant context
(form, injuries, line movement, and trusted news) to help users make informed decisions.

1.1 Product Goals







Aggregate odds/offers across at least 10 sportsbooks for the same event and market, normalized
into a single model.
Support top 10 sports with configurable market presets and advanced filters per sport.
Provide time-window filters: Today, Next 1h, Next 4h, Next 12h (and customizable).
Enable favorites (teams/players/leagues) and personalized default filters.
Offer AI insights based on user settings: contextual summaries + model-based probability estimates
+ confidence.
Deliver enterprise-grade reliability, clear data provenance, and a modern UI/UX.

1.2 Non-Goals (v1)




Placing bets directly in-app (unless explicitly added later with licensed integrations and compliance).
Scraping sportsbook websites as a primary data source (fragile and typically violates terms).
Guaranteeing outcomes or 'sure win' tips (not possible; the app provides probabilistic insights).

1.3 Key Constraints & Risks





Sportsbook data access is largely commercial/partner-based; many operators do not provide public
odds APIs. Plan assumes contracts/affiliate/third-party licensed feeds.
Data licensing: sports data and odds usage often restrict redistribution and display. Legal review is
required per provider and jurisdiction.
Event/market mapping is hard: different providers use different IDs, naming, and market
taxonomies. Requires a dedicated mapping layer and QA.
AI recommendations for betting are high-risk for user trust and regulation: must include responsible
gambling messaging and avoid misleading claims.

Page 4

2. Users, Personas, and Core Use Cases
2.1 Primary Personas






Odds Shopper: Wants best price across multiple sportsbooks quickly, often for common markets
(1X2, moneyline, totals).
Market Specialist: Plays specific markets (e.g., Asian handicap, player props) and needs deep filters
and market availability per book.
Team Follower: Follows favorite teams/leagues; wants notifications and curated match cards with
relevant odds and news.
Data-Driven Bettor: Wants probabilities, implied odds, closing line movement, and backtested
performance metrics.
Casual Fan: Wants a simple interface, tips explained in plain language, and guardrails to avoid
information overload.

2.2 Core Use Cases (User Stories)
1. As a user, I can select a sport and see all upcoming events for a time window (Today / Next 1h / Next
4h / Next 12h).
2. As a user, I can open an event and compare odds from at least 10 sportsbooks for the same market.
3. As a user, I can set per-sport filters (e.g., Soccer: Half-time markets only; Basketball: player props
only) and save them as a preset.
4. As a user, I can mark teams/leagues as favorites and see a personalized feed of upcoming matches
and odds.
5. As a user, I can request AI insights for my filters today and receive ranked suggestions with
explainable reasoning.
6. As a user, I can see differences between offers (best odds, line differences, market availability, and
any promotions if available).

2.3 Success Metrics (KPIs)






Time-to-find-best-odds: median < 20 seconds for a given event/market.
Search success rate: > 85% of users find relevant matches using filters without manual scrolling.
Odds freshness: 95th percentile odds update latency under target SLA (e.g., < 10 seconds for prematch; < 2 seconds for supported live feeds).
AI engagement: % of active users who view AI insights weekly; tip 'save' and 'dismiss' feedback rate.
Data quality: mismatch rate between sportsbooks and canonical events < 0.5% after stabilization.

Page 5

3. Sports & Bookmaker Coverage
3.1 Top 10 Sports (Initial Target)
Sport
Soccer (Football)
Basketball
Tennis
Baseball
American Football
Ice Hockey
Cricket
Rugby (Union/League)
MMA / UFC
eSports

Notes / Typical Markets
Highest volume globally; many leagues and
markets (1X2, Asian handicap, O/U, BTTS, HT/FT).
NBA/Euroleague/NCAA; rich markets incl.
spreads, totals, quarters, props.
High frequency, in-play; set/game markets.
MLB + major leagues; run lines, totals, inning
markets.
NFL/NCAA; spreads, totals, props.
NHL + European leagues; puck line, totals,
periods.
Major in many markets; match/innings markets.
Key international leagues; spreads/totals, try
scorer markets (where available).
Moneyline, method of victory, round props.
CS2/LoL/Dota/Valorant (depending on provider
coverage); maps, handicaps, totals.

3.2 Sportsbook (Bookmaker) List - Minimum 10
SportsAi will integrate sportsbook offers primarily via licensed odds aggregation providers and/or
partner feeds. Target sportsbook brands (initial list):











Superbet
Betano
Unibet
Stake
bet365
William Hill
Betfair (Exchange + Sportsbook where applicable)
Paddy Power
Ladbrokes
888sport

3.3 Offer Types to Compare







Odds per outcome (decimal/american/fractional display options).
Line differences (e.g., -1.0 vs -0.75 Asian handicap, totals 2.5 vs 2.75).
Market availability (which books offer which markets).
Live vs pre-match availability and suspension behavior (when markets go unavailable).
Promotions and boosted odds (only if data is provided by the sportsbook/partner feed).
Cashout availability (if data is provided).

Page 6



Book-specific limits, if available (often not provided; optional).

Page 7

4. Data Providers & Integration Strategy
4.1 Provider Categories
Category
Official / Enterprise Sports Data
Odds & Offer Feeds
News & Context
ID Mapping
Streaming / Low-Latency

What It Powers
Fixtures, results, deep stats, play-by-play, lineups,
injuries, and editorial.
Pre-match and in-play odds, sometimes including
historical odds and line movement.
Injuries, transfers, previews/recaps, and breaking
news.
Cross-provider mapping of
league/team/player/event IDs.
Websocket/stream APIs for rapid in-play updates.

4.2 Recommended Provider Stack (Two-Tier)
Because pricing and licensing vary significantly, the architecture supports swapping providers without
rewriting the app.
Tier 1 (Enterprise - best depth & reliability)
 Sportradar Sports Data API for multi-sport fixtures/results and historical data; optionally Sportradar
Odds Comparison APIs for aggregated odds.
 Stats Perform (Opta) for premium soccer/basketball/football event data and advanced metrics.
 Genius Sports Data & Odds APIs for official real-time data and low-latency odds (where contractually
available).
 Betfair Exchange API (market odds and traded volumes) as a proxy for liquidity/market sentiment.
Tier 2 (Cost-effective - faster MVP)
 The Odds API for odds across many bookmakers and quick prototyping.
 SportsDataIO for odds + injuries/lineups/news + historical odds (depending on subscription) + GRid
ID mapping service.
 SportMonks (football) for bookmaker/odds endpoints and soccer-specific depth.
 API-SPORTS (API-Sports) as an alternative for fixtures/results for multiple sports.

4.3 Critical Selection Criteria









Coverage: sports, leagues, countries, and markets required for your target users.
Latency & update method: polling vs push/stream; SLAs; rate limits.
Odds taxonomy: market keys consistency and market depth (main lines vs props).
Historical depth: seasons, closing lines, and lineup history for model training.
Licensing & redistribution: whether you can display odds and store historical odds.
Cost & scalability: pricing per sport, per call, or per event; how it scales with traffic.
Stability & support: incident response, documentation quality, change management.
ID mapping support: cross-provider mapping or stable unique IDs.

Page 8

Page 9

4.4 Provider Coverage Matrix (High-Level)
Provider
Sportradar

Stats Perform (Opta)

Genius Sports

SportsDataIO

SportMonks (Football)

The Odds API

Betfair Exchange API

Strengths
Broad multi-sport
coverage; enterprisegrade; offers sports
data and odds
products.
Premium match/event
data and advanced
metrics; strong in top
sports.
Official data & lowlatency odds feeds for
operators; strong for
betting use cases.
Odds + stats +
injuries/lineups + news;
offers OpenAPI;
includes GRid ID
mapping service.
Soccer-focused odds +
bookmaker endpoints;
strong for football
ecosystem.
Quick access to
bookmaker odds for
many sports; simple
REST API.
Market data + traded
volumes via
betting/stream APIs;
can support liquidity
indicators.

Limitations / Notes
Commercial contract
required; licensing
constraints; costs can
be high.

Best Use
Enterprise production
backbone

Commercial contract;
coverage depends on
sport/league.

Model features and
premium experiences

Commercial contract;
rights and coverage
vary by competition.

Official/low-latency
pipelines

Coverage and pricing
depend on plan;
confirm bookmaker list
per region.

MVP to production for
US-focused, plus ID
mapping

Primarily football;
other sports require
other providers.

Soccer-first MVP and
market depth

Bookmaker list
depends on regions;
may not include all
desired brands; depth
varies.
Exchange markets
differ from sportsbook;
licensing and usage
rules apply.

Fast prototyping, price
comparison

Volume/marketsentiment signals and
live tracking

4.5 Bookmaker Data Access Reality Check
Many sportsbook brands do not provide a public odds API. In practice you typically have three paths:
A) Use a licensed odds aggregation provider that already covers those books
B) Sign a direct commercial integration/affiliate data agreement with each sportsbook
C) Avoid: web scraping or reverse engineering (high risk: legal, stability, blocking)
The plan below assumes A + B, and explicitly avoids C for a professional, scalable platform.

Page 10

5. System Architecture
5.1 High-Level Architecture Overview
SportsAi is designed as a modular platform with:
• Data ingestion services (fixtures/results, odds/offers, news)
• Normalization and ID mapping layer
• Core APIs for search/filtering and odds comparison
• AI/ML services for personalization and insights
• Web + mobile clients
• Observability and admin tooling

5.2 Suggested Service Decomposition (Microservices)
Service
gateway-api
identity-service
sports-catalog-service
fixtures-service
odds-service
offers-service
news-service
favorites-service
search-filter-service
ai-insights-service
analytics-service
admin-portal

Responsibilities
Public API gateway (REST/GraphQL), auth, rate
limiting, request routing.
Users, sessions, OAuth, device management,
RBAC, consent.
Sports/leagues/teams/players catalogs;
localization.
Schedules, results, standings; event state
changes.
Odds ingestion, normalization, best-odds
computation, line movement.
Promotions/boosted odds (if available), deep
links, book metadata.
News ingestion, tagging (teams/players),
summarization for UI.
Favorites, alerts, notification rules, saved filter
presets.
Query builder, saved searches, filter evaluation,
caching.
Probability models, EV calculations, explanation
generation, personalization logic.
Event tracking, funnel metrics, A/B testing.
Partner management, mapping QA, content
moderation, ops dashboards.

5.3 Data Stores







PostgreSQL - Canonical entities (sports, leagues, teams, events, markets, users, favorites).
Redis - Caching for hot queries (next 12h events, best odds per market, user feed).
ClickHouse or TimescaleDB - High-frequency odds time-series and line movement.
OpenSearch/Elasticsearch - Search: teams/leagues, fuzzy match, query autosuggest.
Object storage (S3 compatible) - Raw provider payload archives, model artifacts, logs.
Data Warehouse (BigQuery/Snowflake) - Training datasets, analytics, long-term storage.

Page 11

5.4 Event Streaming
Use an event bus (Kafka/PubSub/RabbitMQ) to decouple ingestion from processing.
Key topics:
• fixtures.updates
• odds.snapshots
• odds.updates
• mapping.changes
• news.items
• ai.signals
• notifications.queue

Page 12

6. Canonical Data Model
A canonical model is mandatory to compare multiple sportsbooks and data providers. The model is
provider-agnostic and stores cross-references for each provider's IDs.

6.1 Core Entities
Entity
Sport
League/Competition
Season
Team/Competitor
Player
Event/Match

Market
Outcome

Bookmaker
Offer/OddsQuote
Promotion

Key Fields
id, key, name, icon,
default_time_zone_rules
id, sport_id, country, name, tier,
seasonality
id, league_id, year, start/end,
stage metadata
id, league_id (or multi-league),
name, short_name, country
id, team_id, name, position,
status, external_ids
id, sport_id, league_id,
start_time_utc, status,
home_id, away_id, venue,
round, tv
id, sport_id, market_key, name,
period (FT/HT/Q1/etc),
live_supported
id, market_id, outcome_key,
name
(Home/Draw/Away/Over/Under
/etc)
id, brand, region,
license_jurisdictions,
deep_link_templates
id, event_id, bookmaker_id,
market_id, outcome_id, odds,
line, timestamp, is_live
id, bookmaker_id, event_id,
title, type, terms, start/end,
tracking_link

Notes
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.
Stored in relational DB; external
IDs kept in mapping tables.

6.2 Provider Mapping Tables
Mapping tables keep provider-specific identifiers and names. Example tables:
• provider_event_map(provider, provider_event_id, canonical_event_id, confidence, last_verified)
• provider_team_map(provider, provider_team_id, canonical_team_id, confidence)
• provider_market_map(provider, provider_market_key, canonical_market_key, transform_rules)
Mapping is continuously validated via automated checks + admin QA tools.

Page 13

6.3 Odds Normalization Rules







Normalize odds format (store decimal; display decimal/american/fractional by user setting).
Normalize timestamps to UTC; store provider timestamp and ingested_at timestamp.
Normalize market periods (FT/HT/Q1 etc) and ensure sport-specific mapping.
Normalize line formats (e.g., -1.5 spread; 2.5 totals; Asian handicap quarter-lines).
Deduplicate updates: ignore unchanged odds within a small tolerance; keep full history in timeseries store.
Track source and confidence: provider, ingestion pipeline, mapping confidence, and any fallbacks.

Page 14

7. Filtering, Search, and Personalization
7.1 Time Window Filters
Built-in presets (also available in per-sport settings):
Preset
Today

Definition
Events with start_time in user's local day (00:0023:59).
start_time in [now, now+1h].
start_time in [now, now+4h].
start_time in [now, now+12h].
start_time in [now+X, now+Y] with quick sliders.

Next 1 hour
Next 4 hours
Next 12 hours
Custom

7.2 Global Filters (All Sports)










Sport, League/Competition, Country/Region, Season/Stage
Event status: upcoming, live, finished, postponed, cancelled
Time window (presets + custom)
Bookmaker selection (include/exclude)
Odds range (min/max), line range, implied probability range
Availability: show only markets offered by N+ books
Sort: start time, best odds, biggest book-to-book spread, model confidence, EV
Favorites: only favorite teams/leagues, or exclude them
Notification eligibility: matches that trigger alerts

7.3 Market & Period Filters (Sport-Specific)
Each sport has a Settings tab where users can enable/disable markets and periods.
Examples: Soccer -> Half-time markets; Basketball -> Q1/Q2/Q3/Q4; Tennis -> Set 1/Set 2; etc.

7.4 Advanced Filters (Power Users)









Line movement: % change, direction, movement over last N minutes/hours
Consensus vs best-book difference: show value gaps
In-play only markets; or pre-match only
Market suspension state (live): include/exclude suspended markets
News tags: injuries, lineup confirmed, transfer rumors, weather (where relevant)
Model-based filters: predicted win probability >= X, confidence >= Y
Risk profile: conservative / balanced / aggressive (impacts AI ranking)
User-defined custom filters (query builder) saved as presets

7.5 Saved Presets and Per-Sport Settings
Users can create presets like:
• 'Soccer - HT markets only, top leagues, next 4h'
• 'NBA - player props, next 12h, exclude low-liquidity books'
Presets are stored per sport and can be pinned to the sport tab.

Page 15

Page 16

8. UI/UX Specification
8.1 UI/UX Principles







Fast-to-value: user sees relevant matches and best odds within 2 taps.
Progressive disclosure: simple default view; advanced filters are optional.
Consistency: same interaction patterns across sports; sport-specific exceptions are explicit.
Trust: show data freshness, source, and mapping confidence for odds.
Accessibility: readable typography, color-contrast compliant, keyboard navigation (web).
Performance: smooth scrolling, virtualized lists, skeleton loading.

8.2 Information Architecture (IA)
Primary navigation tabs (mobile bottom nav / web sidebar):
1) Home (For You)
2) Sports (Top 10 sports)
3) Tips (AI Insights)
4) Favorites
5) Settings
Secondary navigation within a sport: Events • Live • Leagues • Settings

8.3 Core UI Components
Component
Event Card
Odds Comparison Table
Market Selector
Filter Chips + Builder
Line Movement Mini-Chart
AI Insight Panel
News Cards
Saved Preset Picker

Description
Start time, teams, competition, quick markets
(best odds), status badge, favorite toggle.
Rows = bookmakers, columns = outcomes;
highlight best odds; show diff.
Searchable list of markets grouped by period
(FT/HT/Q1 etc).
Chips for active filters; 'Edit' opens builder with
sections.
Sparkline per outcome/line, last N
hours/minutes.
Probability, confidence, key factors, caution
notes.
Tagged to teams/players, with timestamps and
source.
Dropdown or horizontal list to switch presets
quickly.

Page 17

8.4 Screen Inventory (User App)
Screen ID
APP-001
APP-002
APP-003
APP-004
APP-005
APP-006
APP-010
APP-020
APP-030
APP-031
APP-032
APP-033
APP-034
APP-035
APP-036
APP-037
APP-038
APP-039
APP-040
APP-041
APP-042
APP-043
APP-044
APP-045
APP-046
APP-047
APP-048
APP-049
APP-060
APP-061
APP-062
APP-063
APP-064
APP-065
APP-066
APP-070
APP-071
APP-080
APP-081
APP-090
APP-091
APP-092
APP-100
APP-101

Name
Welcome / Onboarding start
Select Sports (Top 10)
Select Favorite Teams/Leagues
Select Sportsbooks (bookmaker preferences)
Set Risk Profile + Responsible Gambling options
Notifications permissions
Home (For You feed)
Sports Hub (list of sports)
Soccer - Events List
Soccer - Sport Settings
Basketball - Events List
Basketball - Sport Settings
Tennis - Events List
Tennis - Sport Settings
Baseball - Events List
Baseball - Sport Settings
American Football - Events List
American Football - Sport Settings
Ice Hockey - Events List
Ice Hockey - Sport Settings
Cricket - Events List
Cricket - Sport Settings
Rugby - Events List
Rugby - Sport Settings
MMA - Events List
MMA - Sport Settings
eSports - Events List
eSports - Sport Settings
Event Detail - Overview
Event Detail - Odds Comparison
Event Detail - Markets & Periods
Event Detail - Stats & History
Event Detail - News & Context
Event Detail - Line Movement
Event Detail - AI Insight
Filters Builder
Preset Manager
Favorites
Favorite Team Detail
AI Tips - List
AI Tip - Detail & Explanation
AI Tips Settings
Bookmakers - List
Bookmaker - Detail
Page 18

APP-110
APP-111
APP-112
APP-113

Account Settings
Display Preferences
Privacy & Data Controls
Responsible Gambling Settings

Page 19

8.5 Detailed Screen Specifications
APP-001 - Welcome / Onboarding Start
Purpose: Introduce the product value and collect consent for data processing.
Key UI components:




Hero value statement: 'Compare odds across sportsbooks and get personalized insights.'
Buttons: Continue, Sign in, Terms & Privacy links
Language selector (optional)

Key interactions:




Continue -> onboarding flow
Sign in -> auth screens
Open Terms/Privacy

Primary API calls:



POST /v1/analytics/event (app_open)
GET /v1/config/public (feature flags, legal copy, supported regions)

States & edge cases:



Offline mode: show cached value statement and retry
Unsupported region: show limited experience message if required by policy

Analytics events:



onboarding_start
legal_opened

Implementation notes:


Do not hard-block without legal review; allow browsing content where permitted.

APP-002 - Select Sports
Purpose: Let users choose which of the top 10 sports they care about to personalize defaults.
Key UI components:




Grid of sports (icons + names)
Select all / clear
Continue button

Key interactions:
Page 20




Tap sport toggles selection
Continue saves preferences and proceeds

Primary API calls:



GET /v1/sports
POST /v1/users/me/preferences (selectedSports)

States & edge cases:



If user selects none -> default to Soccer + Basketball
If API fails -> use bundled static sports list and sync later

Analytics events:


sports_selected

APP-003 - Select Favorite Teams/Leagues
Purpose: Seed favorites to power a personalized feed and alerts.
Key UI components:




Search bar (team/league)
Suggested popular teams per selected sport
List with follow toggles

Key interactions:




Search -> autocomplete and results
Follow/unfollow teams
Continue

Primary API calls:



GET /v1/search?q=...&type=team,league
POST /v1/users/me/favorites

States & edge cases:



No results -> show hints
Rate limit -> backoff and show partial results

Analytics events:


favorites_seeded

Page 21

APP-004 - Select Sportsbooks (Bookmaker Preferences)
Purpose: Select which sportsbooks to compare and set region/licensing constraints.
Key UI components:





Bookmaker list with logos and region tags
Toggle include/exclude
Optional 'Use my location' region suggestion
Continue

Key interactions:




Toggle bookmaker inclusion
Sort by region or popularity
Continue saves selection

Primary API calls:



GET /v1/bookmakers?region=...
POST /v1/users/me/preferences (bookmakers)

States & edge cases:



If a selected bookmaker has no data for a sport -> show availability warning
If region unknown -> default to Global + allow user override

Analytics events:


bookmakers_selected

APP-005 - Risk Profile + Responsible Gambling Settings
Purpose: Set user risk appetite and show responsible gambling controls.
Key UI components:





Risk slider: Conservative / Balanced / Aggressive
Optional daily time limit / reminder toggle
Links to help resources
Continue

Key interactions:



Adjust slider updates explanation
Enable reminders
Page 22



Continue

Primary API calls:


POST /v1/users/me/preferences (riskProfile, rgSettings)

States & edge cases:



If user is underage or unknown age -> enforce age gate (policy decision)
If user declines -> store minimal preferences

Analytics events:


risk_profile_set

Page 23

APP-010 - Home (For You Feed)
Purpose: Show a personalized list of upcoming events based on favorites and saved presets.
Key UI components:





Time window selector (Today / Next 1h / Next 4h / Next 12h)
Filter chips (active preset)
Event card list (virtualized)
Quick actions: Favorite, Share, Alert

Key interactions:




Change time window updates list instantly (client cache + server query)
Tap event opens Event Detail
Long-press event opens quick odds compare modal

Primary API calls:




GET /v1/feed?window=...&preset=... (server-side personalization)
GET /v1/events?filters=... (fallback)
GET /v1/odds/best?eventIds=...

States & edge cases:




Empty feed -> suggest selecting favorites or changing presets
Partial odds -> display 'some books unavailable'
Stale data -> show 'updated X minutes ago' banner

Analytics events:



feed_view
event_open_from_feed

APP-020 - Sports Hub (List of Sports)
Purpose: Entry point for sport-specific browsing and sport settings.
Key UI components:




Top 10 sports list/grid
Pinned sports shortcuts
Search leagues

Key interactions:


Tap sport -> sport events list

Page 24




Tap settings icon -> sport settings
Search -> leagues

Primary API calls:



GET /v1/sports
GET /v1/users/me/preferences (pinnedSports)

States & edge cases:


If user has not pinned sports -> show 'Pin your top sports' prompt

Analytics events:


sports_hub_view

Page 25

APP-030 - Soccer - Events List
Purpose: Browse Soccer events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=Soccer&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_soccer_events_view

APP-031 - Soccer - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Soccer.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Page 26

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Match Odds (1X2) - Full Time, Double Chance - Full Time, Over/Under
2.5 - Full Time, Both Teams to Score - Full Time, Half Time Result, Asian Handicap (main)
Suggested sport-specific filters: Period: Full Time / Half Time, Market groups: Main lines / Goals /
Cards / Corners / Player props, League tier, Team form filters, Lineups confirmed

APP-032 - Basketball - Events List
Purpose: Browse Basketball events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:

Page 27





GET /v1/events?sport=Basketball&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_basketball_events_view

APP-033 - Basketball - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Basketball.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:

Page 28




Default markets suggestion: Moneyline, Point Spread, Total Points, Team Totals, Quarter Markets
(Q1-Q4), Key Player Props (PTS/REB/AST)
Suggested sport-specific filters: Period: Game / 1H / Q1-Q4, Props: players, Back-to-back games,
Injury status

APP-034 - Tennis - Events List
Purpose: Browse Tennis events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=Tennis&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_tennis_events_view

APP-035 - Tennis - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Tennis.
Key UI components:

Page 29







Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Match Winner, Set Winner, Total Games, Handicap Games, First Set
Winner
Suggested sport-specific filters: Surface type, Tournament tier, Best-of-3 vs Best-of-5

APP-036 - Baseball - Events List
Purpose: Browse Baseball events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:



Change time window
Apply filters (chips)
Page 30




Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=Baseball&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_baseball_events_view

APP-037 - Baseball - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Baseball.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:

Page 31




If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Moneyline, Run Line, Total Runs, First 5 Innings (Moneyline/Total),
Inning Props (optional)
Suggested sport-specific filters: Starting pitchers known, Ballpark factors (optional), Weather (wind)

APP-038 - American Football - Events List
Purpose: Browse American Football events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=American Football&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_american_football_events_view

Page 32

APP-039 - American Football - Sport Settings
Purpose: Configure default markets, periods, and filter presets for American Football.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Moneyline, Point Spread, Total Points, Team Totals, Player Props (QB
yards, TDs), 1st Half markets
Suggested sport-specific filters: Weather (wind/rain), Injury report severity, Home/away splits

APP-040 - Ice Hockey - Events List
Purpose: Browse Ice Hockey events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only
Page 33

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=Ice Hockey&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_ice_hockey_events_view

APP-041 - Ice Hockey - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Ice Hockey.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:



GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)

Page 34



PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Moneyline (incl. OT rules), Puck Line, Total Goals, Period markets, Team
Totals
Suggested sport-specific filters: Goalie confirmed, Back-to-back games, Travel distance (optional)

APP-042 - Cricket - Events List
Purpose: Browse Cricket events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=Cricket&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:

Page 35



sport_cricket_events_view

APP-043 - Cricket - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Cricket.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Match Winner, Top Batsman/Bowler (where available), Total Runs
(innings), Method of dismissal props (optional)
Suggested sport-specific filters: Format (T20/ODI/Test), Venue, Toss result (live)

APP-044 - Rugby - Events List
Purpose: Browse Rugby events using sport-specific market presets and filters.
Key UI components:


Time window selector (Today / Next 1h / Next 4h / Next 12h)

Page 36






League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=Rugby&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_rugby_events_view

APP-045 - Rugby - Sport Settings
Purpose: Configure default markets, periods, and filter presets for Rugby.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset
Page 37

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Match Winner, Point Spread, Total Points, Try scorer (where available),
Half-time markets
Suggested sport-specific filters: Competition, International vs club, Weather

APP-046 - MMA - Events List
Purpose: Browse MMA events using sport-specific market presets and filters.
Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=MMA&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:



No events -> show alternative window and popular leagues
Missing odds -> show provider/source label

Page 38



High latency -> show skeleton loading

Analytics events:


sport_mma_events_view

APP-047 - MMA - Sport Settings
Purpose: Configure default markets, periods, and filter presets for MMA.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:





Enable/disable market groups
Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Fight Winner, Method of Victory, Round Betting, Total Rounds
Suggested sport-specific filters: Weight class, Short-notice replacement indicator, Reach/age stats
(optional)

APP-048 - eSports - Events List
Purpose: Browse eSports events using sport-specific market presets and filters.

Page 39

Key UI components:






Time window selector (Today / Next 1h / Next 4h / Next 12h)
League selector + search
Filter chips + 'More filters'
Event list with quick best-odds row for default markets
Toggle: show live only / upcoming only

Key interactions:





Change time window
Apply filters (chips)
Tap event -> event detail
Swipe left on event -> favorite/alert actions

Primary API calls:




GET /v1/events?sport=eSports&window=...&filters=...
GET /v1/odds/best?eventIds=...&marketKeys=default
GET /v1/leagues?sport=...

States & edge cases:




No events -> show alternative window and popular leagues
Missing odds -> show provider/source label
High latency -> show skeleton loading

Analytics events:


sport_esports_events_view

APP-049 - eSports - Sport Settings
Purpose: Configure default markets, periods, and filter presets for eSports.
Key UI components:






Market groups with toggles (main, totals, props, etc.)
Period selector (FT/HT/Q/etc where applicable)
Default sorting setting (start time / best odds / best EV)
Save preset button
Reset to defaults

Key interactions:


Enable/disable market groups

Page 40





Choose default markets shown in event cards
Save as preset (name + optional pin)
Reset

Primary API calls:




GET /v1/markets?sport=... (canonical markets list)
POST /v1/users/me/presets (sport-specific preset)
PATCH /v1/users/me/preferences (defaultSportSettings)

States & edge cases:



If user disables all markets -> require at least 1 default market
If a market not supported by selected books -> show warning

Implementation notes:



Default markets suggestion: Match Winner, Map Winner, Handicap Maps, Total Rounds/Kills (where
available)
Suggested sport-specific filters: Patch version (where available), Map pool, LAN vs online

Page 41

APP-060 - Event Detail - Overview
Purpose: Provide a single summary view: teams, competition, start time, and key markets.
Key UI components:





Header: teams + logos, start time, league badge, live indicator
Quick stats: form, standings position (if available), H2H record snapshot
Best odds panel for 2-4 default markets
Tabs: Odds • Markets • Stats • News • Line Movement • AI

Key interactions:




Switch tabs
Favorite teams
Share event link

Primary API calls:




GET /v1/events/{eventId}
GET /v1/odds/best?eventId=...&marketKeys=...
GET /v1/stats/preview?eventId=...

States & edge cases:



If teams unknown (TBD) -> show placeholders
If league not mapped -> show provider label and disable some tabs

Analytics events:


event_detail_view

APP-061 - Event Detail - Odds Comparison
Purpose: Compare odds from multiple sportsbooks for a selected market.
Key UI components:






Market selector
Odds comparison table (book rows, outcomes columns)
Highlight best odds
Deep link buttons per bookmaker (if allowed)
Toggle: include promotions / boosted odds (if available)

Key interactions:


Change market

Page 42





Sort books by best outcome or by brand
Open bookmaker detail
Copy odds / share

Primary API calls:



GET /v1/odds?eventId=...&marketKey=...&isLive=...
GET /v1/bookmakers (for logos and deep link templates)

States & edge cases:



If some books missing market -> show 'Not offered' in cells
If odds delayed -> show 'updated Xs ago'

Analytics events:



odds_compare_view
deep_link_click

Implementation notes:


Avoid implying that higher odds guarantee profit. Show implied probability and a neutral
explanation.

APP-062 - Event Detail - Markets & Periods
Purpose: Browse all markets for the event, grouped by period and market type.
Key UI components:





Search bar for markets
Grouped market list (FT, HT, Q1, etc)
Favorites: pin markets
Availability badges per bookmaker count

Key interactions:




Search/filter markets
Pin market to favorites
Open market in Odds Comparison tab

Primary API calls:



GET /v1/markets/event/{eventId} (available markets + counts)
GET /v1/odds/best?eventId=...&marketKeys=...

States & edge cases:
Page 43




Large market list -> virtualize
Markets appear/disappear in-play -> handle updates gracefully

APP-063 - Event Detail - Stats & History
Purpose: Show relevant history: team form, head-to-head, standings, player availability.
Key UI components:





Form tables (last 5-10 matches)
H2H list
Standings snapshot (league)
Injuries/lineups panel

Key interactions:



Change history window (last 5/10/20)
Toggle home/away splits

Primary API calls:





GET /v1/history/team?teamId=...&limit=...
GET /v1/history/h2h?teamA=...&teamB=...
GET /v1/standings?leagueId=...&season=...
GET /v1/injuries?eventId=... (if available)

States & edge cases:



If no historical data -> show fallback stats (ELO/ratings)
If lineup not confirmed -> show status and expected lineups if allowed

APP-064 - Event Detail - News & Context
Purpose: Provide trusted context (injury news, previews) linked to teams/players.
Key UI components:




News list (tagged to event/team/player)
Source labels + timestamps
AI-generated short summary (optional, with source citations)

Key interactions:



Open full article in in-app browser
Bookmark important news

Page 44



Report incorrect mapping

Primary API calls:



GET /v1/news?eventId=...&teamIds=...
POST /v1/feedback/news-mapping

States & edge cases:



No news -> show 'No major updates' and link to team news
Paywalled sources -> open external browser

APP-065 - Event Detail - Line Movement
Purpose: Show odds and line movement over time for selected market/outcome.
Key UI components:





Outcome selector
Line movement chart (time-series)
Book selector or consensus mode
Markers: lineup confirmed, major injury news, suspension

Key interactions:



Zoom time range (1h/4h/12h/24h)
Switch between books or consensus

Primary API calls:


GET /v1/odds/history?eventId=...&marketKey=...&book=...&range=...

States & edge cases:



If no history allowed by license -> show only latest snapshot
If chart too dense -> downsample

APP-066 - Event Detail - AI Insight
Purpose: Explain model-based probabilities and how they relate to sportsbook prices.
Key UI components:




Probability estimate for outcomes
Confidence score + calibration note
Key factors list (form, injuries, matchup stats, odds movement)

Page 45




User-specific recommendation alignment (based on preset)
Responsible gambling disclaimer

Key interactions:




User feedback: helpful/not helpful
Adjust preferences (risk, markets) -> refresh ranking
View explanation details

Primary API calls:



GET /v1/ai/insight?eventId=...&presetId=...
POST /v1/ai/feedback

States & edge cases:



If model unavailable for sport/league -> show 'insight not available yet' with roadmap
If news sources missing -> don't fabricate; show limited factors

Analytics events:



ai_insight_view
ai_feedback

Page 46

APP-070 - Filters Builder
Purpose: A structured query builder that allows maximum filtering options without overwhelming users.
Key UI components:





Sections: Time, Competitions, Teams, Markets, Bookmakers, Odds & Lines, AI Signals
Search within filters
Preview count of matching events
Save preset (name, sport scope, pin to tab)

Key interactions:




Toggle filters and see live preview count
Save preset
Reset and undo

Primary API calls:



POST /v1/search/preview-count (filters payload)
POST /v1/users/me/presets

States & edge cases:



Conflicting filters -> show validation messages
Very broad filters -> warn about performance and suggest narrowing

APP-071 - Preset Manager
Purpose: Manage saved presets: rename, reorder, pin, duplicate, delete.
Key UI components:




Preset list grouped by sport
Pin toggles
Actions menu

Key interactions:




Drag reorder
Duplicate preset
Delete preset (confirm)

Primary API calls:



GET /v1/users/me/presets
PATCH /v1/users/me/presets/{id}

Page 47



DELETE /v1/users/me/presets/{id}

States & edge cases:


If user has no presets -> suggest templates

APP-080 - Favorites
Purpose: Centralized view of favorite teams/leagues/markets and their upcoming matches.
Key UI components:




Tabs: Teams • Leagues • Markets
Upcoming events list filtered to favorites
Quick alert rules

Key interactions:




Remove favorite
Open favorite detail
Create alert

Primary API calls:



GET /v1/users/me/favorites
GET /v1/events?favoritesOnly=true&window=...

States & edge cases:


Empty favorites -> CTA to add favorites

APP-090 - AI Tips - List
Purpose: Show a ranked list of AI insights for today based on user presets and favorites.
Key UI components:





Preset selector
Ranked tip cards (event, market, probability, confidence, best odds)
Filter: today/next 1h/4h/12h
Feedback buttons

Key interactions:



Change preset updates ranking
Open tip detail

Page 48



Provide feedback

Primary API calls:



GET /v1/ai/tips?window=...&presetId=...
GET /v1/odds/best?eventIds=...

States & edge cases:



No tips -> broaden filters or show educational content
Explain that tips are probabilistic and not guarantees

Analytics events:


ai_tips_list_view

APP-091 - AI Tip - Detail & Explanation
Purpose: Deep dive into one recommended event/market with transparent reasoning.
Key UI components:





Tip summary (market, recommendation, odds range)
Probability and confidence
Evidence sections: stats, H2H, injuries, odds movement, news
Model card: last updated, training coverage, limitations

Key interactions:




Open underlying event detail
Toggle explanation depth (simple vs advanced)
Save tip

Primary API calls:





GET /v1/ai/tip/{tipId}
GET /v1/events/{eventId}
GET /v1/odds/history?...
GET /v1/news?...

States & edge cases:



If some evidence sources missing -> show 'Not available' rather than hallucinating
If odds changed significantly -> show 'odds moved' banner

Analytics events:

Page 49




ai_tip_detail_view
tip_saved

APP-092 - AI Tips Settings
Purpose: Allow users to control AI behavior and which variables matter most.
Key UI components:





Sport scope selector
Variables weight sliders (form, injuries, odds movement, H2H, volume proxies)
Risk profile and confidence threshold
Exclude markets/leagues toggle

Key interactions:




Adjust weights -> preview changes
Set confidence threshold (e.g., show only tips with confidence >= 0.65)
Reset to default

Primary API calls:




GET /v1/users/me/ai-settings
PATCH /v1/users/me/ai-settings
POST /v1/ai/tips/preview

States & edge cases:


If advanced weights disabled -> show simplified toggles

Page 50

APP-100 - Bookmakers - List
Purpose: Explain which sportsbooks are supported and their coverage per sport/region.
Key UI components:





Bookmaker list with logos
Coverage badges (sports count, markets depth)
User toggle include/exclude
Data freshness indicators

Key interactions:



Open bookmaker detail
Toggle include/exclude

Primary API calls:



GET /v1/bookmakers?region=...&includeCoverage=true
PATCH /v1/users/me/preferences (bookmakers)

States & edge cases:


If bookmaker temporarily offline -> show status

APP-101 - Bookmaker - Detail
Purpose: Provide transparency: what markets are supported, update interval, and deep link behavior.
Key UI components:





Brand profile: license/region tags
Supported sports and markets
Deep link examples
Known limitations

Key interactions:



Copy deep link
Report data issue

Primary API calls:




GET /v1/bookmakers/{bookmakerId}
GET /v1/bookmakers/{bookmakerId}/coverage
POST /v1/feedback/bookmaker

States & edge cases:
Page 51



If bookmaker coverage depends on user region -> show region picker

APP-110 - Account Settings
Purpose: Manage account details and security.
Key UI components:





Profile fields
Password / 2FA controls
Connected devices
Delete account request

Key interactions:




Update profile
Enable 2FA
Request account deletion

Primary API calls:





GET /v1/users/me
PATCH /v1/users/me
POST /v1/auth/2fa/enable
POST /v1/users/me/delete-request

States & edge cases:


Sensitive actions require re-authentication

APP-111 - Display Preferences
Purpose: Control odds format, timezone, and UI options.
Key UI components:





Odds format selector (Decimal/American/Fractional)
Timezone auto/manual
Default time window
Theme (light/dark/system)

Key interactions:



Change odds format updates all views
Set default window

Page 52

Primary API calls:


PATCH /v1/users/me/preferences (display)

States & edge cases:


If device timezone changes -> prompt to update

APP-112 - Privacy & Data Controls
Purpose: Let users control personalization and data retention.
Key UI components:




Consent toggles (analytics, personalization, push notifications)
Data export request
Data retention explanation

Key interactions:



Toggle consent updates immediately
Request export

Primary API calls:



PATCH /v1/users/me/consents
POST /v1/users/me/export

States & edge cases:


Some features disabled if consent off (explain clearly)

APP-113 - Responsible Gambling Settings
Purpose: Provide in-app safety controls and reminders.
Key UI components:




Session reminders
Optional self-exclusion linkouts
Resources by region

Key interactions:



Set reminders
Open resources

Page 53

Primary API calls:



PATCH /v1/users/me/rg-settings
GET /v1/content/rg-resources?region=...

States & edge cases:


If region unknown -> show global resources

Page 54

9. Public API Specification (v1)
9.1 API Principles
Versioning: /v1/ prefix; backward-compatible changes only in minor releases.
Authentication: OAuth2/JWT for user endpoints; API keys for internal services and partners.
Pagination: cursor-based for large lists; limit default 50.
Filtering: structured JSON filters for complex queries (POST /events/search) plus simpler GET query
params for common cases.
Idempotency: for POST endpoints that create resources (use Idempotency-Key header).
Rate limiting: per-user and per-IP; return 429 with Retry-After.








9.2 Common Response Envelope
{
"data": { /* payload */ },
"meta": {
"requestId": "uuid",
"generatedAt": "2026-01-10T12:00:00Z"
},
"errors": []
}

9.3 Error Model
{
"errors": [
{
"code": "VALIDATION_ERROR",
"message": "marketKey is required",
"field": "marketKey",
"details": { }
}
]
}

Page 55

9.4 Auth Endpoints
Method
POST
POST
POST
POST
POST
POST

Path
/v1/auth/signup
/v1/auth/login
/v1/auth/logout
/v1/auth/refresh
/v1/auth/2fa/enable
/v1/auth/2fa/verify

Page 56

Purpose
Create account
Obtain JWT
Invalidate session
Refresh token
Enable 2FA
Verify 2FA code

9.5 Sports Catalog
Catalog Endpoints
Method
GET

Path
/v1/sports

GET

/v1/leagues?sport={sportKey}

GET
GET

/v1/teams?leagueId=...
/v1/players?teamId=...

GET

/v1/search?
q=...&type=team,league,player

Notes
List supported sports (top 10 +
future expansion).
List leagues/competitions for a
sport.
List teams in a league.
List players in a team (where
available).
Unified search with fuzzy
matching.

9.6 Events & Fixtures
Event Endpoints
Method
GET
POST
GET
GET
GET
GET
GET

Path
/v1/events?
window=today&sport=soccer
/v1/events/search
/v1/events/{eventId}
/v1/standings?
leagueId=...&season=...
/v1/history/team?
teamId=...&limit=10
/v1/history/h2h?
teamA=...&teamB=...&limit=10
/v1/injuries?eventId=... or
teamId=...

Notes
Simple list for common use.
Advanced filtering with JSON
body.
Event detail.
Standings snapshot.
Team form history.
Head-to-head history.
Injuries/lineups if available.

9.7 Markets, Odds, and Offers
Odds Endpoints
Method
GET

Path
/v1/markets?sport=soccer

GET

/v1/markets/event/{eventId}

GET

/v1/odds?
eventId=...&marketKey=...&isLiv
e=false
/v1/odds/best?

GET

Page 57

Notes
Canonical market list for a
sport.
Markets available for an event +
bookmaker counts.
Odds snapshots per bookmaker.
Best odds per outcome for

eventId=...&marketKeys=...
/v1/odds/history?
eventId=...&marketKey=...&boo
kmakerId=...&range=12h
/v1/offers?
eventId=...&bookmakerId=...

quick UI.
Line movement time-series (if
licensed).

News Endpoints
Method
GET
GET
POST

Path
/v1/news?eventId=...&limit=20
/v1/news?teamId=...&limit=20
/v1/news/summarize

POST

/v1/feedback/news-mapping

Notes
News items linked to an event.
Team news feed.
Generate short summaries for
UI (optional).
User reports incorrect
linking/mapping.

GET
GET

Promotions/boosts for an event
(if available).

9.8 News

9.9 Users, Preferences, Favorites
User Endpoints
Method
GET
PATCH
GET
PATCH
GET
POST
DELETE
GET
POST
PATCH
DELETE

Path
/v1/users/me
/v1/users/me
/v1/users/me/preferences
/v1/users/me/preferences
/v1/users/me/favorites
/v1/users/me/favorites
/v1/users/me/favorites/
{favoriteId}
/v1/users/me/presets
/v1/users/me/presets
/v1/users/me/presets/
{presetId}
/v1/users/me/presets/
{presetId}

Notes
Current user profile.
Update profile.
All preferences.
Update preferences (sports,
books, display).
Favorites list.
Add favorites.
Remove favorite.
Saved filter presets.
Create preset.
Update preset.
Delete preset.

9.10 AI Insights
AI Endpoints
Method
GET

Path
/v1/ai/insight?

Page 58

Notes
Explainable insight for a specific

GET

eventId=...&presetId=...
/v1/ai/tips?
window=...&presetId=...
/v1/ai/tip/{tipId}

POST
GET
PATCH

/v1/ai/feedback
/v1/users/me/ai-settings
/v1/users/me/ai-settings

GET

Page 59

event.
Ranked list of tips for user
preferences.
Tip detail with evidence
references.
User feedback on insight/tip.
AI personalization settings.
Update AI settings.

9.11 Events Search - Filter Schema (POST /v1/events/search)
Request body example (flexible and extensible):
{
"sport": "soccer",
"timeWindow": { "type": "next", "hours": 4 },
"status": ["upcoming", "live"],
"leagues": ["EPL", "UCL"],
"teams": { "include": ["ARS", "MCI"], "exclude": [] },
"markets": {
"includeMarketKeys": ["soccer_match_odds_ft", "soccer_total_goals_ft"],
"periods": ["FT", "HT"]
},
"bookmakers": { "include": ["unibet", "stake", "superbet"], "exclude": [] },
"odds": { "minDecimal": 1.70, "maxDecimal": 2.50 },
"availability": { "minBookmakersOffering": 3 },
"sort": [{ "field": "startTime", "direction": "asc" }],
"pagination": { "cursor": null, "limit": 50 }
}

Response body example:
{
"data": {
"events": [
{
"eventId": "evt_123",
"sport": "soccer",
"league": "EPL",
"startTimeUtc": "2026-01-10T19:00:00Z",
"status": "upcoming",
"home": { "teamId": "t_ars", "name": "Arsenal" },

Page 60

"away": { "teamId": "t_mci", "name": "Man City" },
"bestOdds": {
"soccer_match_odds_ft": {
"home": { "bookmaker": "unibet", "odds": 2.35 },
"draw": { "bookmaker": "bet365", "odds": 3.40 },
"away": { "bookmaker": "superbet", "odds": 2.90 }
}
}
}
],
"nextCursor": "cursor_abc"
},
"meta": { "requestId": "uuid", "generatedAt": "..." },
"errors": []
}

9.12 Odds Snapshot - Response Schema (GET /v1/odds)
{
"data": {
"eventId": "evt_123",
"marketKey": "soccer_match_odds_ft",
"period": "FT",
"outcomes": ["home", "draw", "away"],
"quotes": [
{
"bookmaker": "unibet",
"updatedAt": "2026-01-10T18:35:12Z",
"odds": { "home": 2.35, "draw": 3.40, "away": 2.90 },
"line": null,
"isLive": false,

Page 61

"source": { "provider": "odds_provider_x", "confidence": 0.98 }
}
]
}
}

Page 62

10. Integration Plan (Detailed)
10.1 Integration Phases
Phase
Phase 0 - Contracts & Licensing
Phase 1 - Provider Proof of Concept
Phase 2 - Canonical Model & Mapping
Phase 3 - Add Bookmakers and Sports
Phase 4 - AI Insights MVP
Phase 5 - Scale & Optimize

Deliverables
Negotiate data rights for odds display, historical
storage, and redistribution limits. Confirm
sports/regions/markets coverage.
Integrate 1 sports data provider + 1 odds provider
for 1-2 sports. Validate mapping and latency.
Build mapping tools, automate conflict detection,
establish QA workflow.
Expand sportsbook coverage to 10+ books and
sports to top 10; add live support where
available.
Train baseline models for 2-3 sports; integrate
news and odds movement; ship explainable
insights.
Performance, caching, monitoring, and data cost
optimization.

10.2 Provider Integration Pattern (Standard)
All provider integrations should follow a consistent adapter pattern:
• Provider Adapter: fetch, parse, validate
• Normalizer: map provider schema -> canonical model
• Mapper: resolve IDs, names, and market keys
• Publisher: emit canonical updates to event bus
• Archive: store raw payloads (for debugging and replay)
• Observability: metrics per endpoint (latency, errors, rate limits)

10.3 Ingestion SLAs & Cadence
Recommended baseline cadence:
• Fixtures (upcoming): refresh every 5-15 minutes; plus daily full sync
• Results and statuses: refresh every 10-60 seconds for live; slower for non-live
• Pre-match odds: refresh every 30-120 seconds depending on provider limits
• Live odds (if streaming): ingest via websocket/stream; else poll 1-5 seconds
• News: poll every 2-5 minutes, with push where available

Page 63

10.4 Provider-Specific Details
10.4.1 Sportradar
What to use it for
 Multi-sport fixtures, schedules, and results for top sports
 Historical data for model training and H2H
 Optional: odds comparison APIs (aggregated odds) and/or odds products
Integration steps
 Create Sportradar developer account and obtain API keys
 Select sport packages and coverage matrix; confirm leagues and languages
 Implement adapter with backoff and caching; respect rate limits
 Map Sportradar event/team IDs to canonical IDs; store in provider mapping tables
 Validate start times and competitors; reconcile conflicts with other providers
Data quality checks
 Verify event uniqueness by (sport, league, start_time, home, away)
 Detect rescheduled events: start_time changes beyond threshold
 Detect team name changes and alias list updates

10.4.2 Stats Perform (Opta)
What to use it for
 Premium event-level stats and advanced metrics
 Feature richness for AI models (e.g., shots, xG, advanced team/player metrics)
Integration steps
 Obtain commercial feed/API credentials
 Implement sport-by-sport adapters (soccer/basketball/football etc)
 Normalize to canonical stat models and ensure consistent units
 Join with canonical events via mapping layer (team/event mapping is critical)
Notes
 Opta-style data is extremely valuable for model features; cost and licensing are typically enterprise.

10.4.3 Genius Sports
What to use it for
 Official real-time sports data and low-latency odds feeds (operator-grade)
 Integrity features and official partnerships depending on sport

Page 64

Integration steps
 Negotiate contract and rights for data display/storage
 Prefer streaming endpoints if provided; else poll using delta endpoints
 Normalize odds and state updates; publish to event bus
 Set up redundancy and failover to secondary provider for fixtures/results

10.4.4 The Odds API
What to use it for
 Fast prototyping and broad sportsbook odds coverage (varies by region)
 Simple REST calls for upcoming events and odds snapshots
Integration steps
 Obtain API key; configure regions, sports, and markets
 Build bookmaker mapping: provider bookmaker keys -> canonical bookmaker IDs
 Use scheduled polling for upcoming events and odds
 Store snapshots in time-series DB; compute best odds per event/market
Operational notes
 Monitor quota usage; cache results aggressively for public traffic
 Implement provider-specific market key mapping

10.4.5 SportsDataIO
What to use it for
 Odds feeds (pre-match, in-play, historical/closing lines depending on plan)
 Injuries, lineups, and news feeds to power context and AI features
 Optional: GRid ID mapping service to map IDs across providers
Integration steps
 Obtain API key; choose sports packages
 Implement per-sport ingest pipelines (NFL/NBA/NHL/MLB etc)
 Normalize odds into canonical Market/Outcome model
 Consume injuries and lineup feeds; link to teams/players via canonical IDs
 Use GRid mapping where available to reduce manual mapping effort

10.4.6 SportMonks (Football)
What to use it for
 Soccer fixtures, odds, bookmakers, and predictions (depending on subscription)
Page 65



Bookmaker endpoints can help structure and availability checks

Integration steps
 Obtain API key; implement paging for large league coverage
 Use bookmaker and odds endpoints to ingest per fixture and bookmaker
 Map SportMonks fixture IDs to canonical event IDs
 Normalize markets and odds; store with timestamps

10.4.7 Betfair Exchange API
What to use it for
 Exchange market odds and traded volumes for liquidity/market sentiment proxies
 Low-latency stream API for in-play updates
Integration steps
 Create Betfair developer account; obtain credentials
 Use market navigation endpoints to discover relevant markets
 Subscribe to Stream API for price/volume updates for selected markets
 Map Betfair market types to canonical markets (MATCH_ODDS, etc.)
 Publish volume/price changes as AI signals (do not treat as ground truth probabilities)
Notes
 Exchange markets differ from sportsbook; treat as complementary signal.
 Ensure compliance with Betfair terms and any licensing constraints.

10.5 Notes on Pinnacle and Other Restricted APIs
Some sportsbook APIs are not publicly available or have become restricted to select partners. Treat
direct integrations as commercial projects, and always keep a licensed aggregation provider as a fallback
to maintain coverage continuity.

Page 66

11. Odds Comparison & Offer Differentiation Logic
11.1 Best Odds Computation
For each (event, market, outcome):
7. Collect latest odds per bookmaker (freshness threshold depends on live vs pre-match).
8. Exclude suspended/invalid offers.
9. Select the maximum decimal odds as best odds.
10. Compute implied probability = 1 / odds (decimal).
11. Compute spread: best_odds - median_odds (or consensus) and show as delta.

11.2 Line Differences
For markets with lines (spreads, totals, Asian handicap), differences are multi-dimensional:
• Line value (e.g., 2.5 vs 2.75)
• Odds price for that line
SportsAi must normalize line formats and allow users to compare either:
A) Same line across books (price comparison)
B) Best line for a target price band (line shopping)

11.3 Promotions and Boosts
Promotions are only shown if provided by a licensed feed or affiliate program. A promotion must
include:
• Bookmaker, event/market linkage, terms, start/end, and tracking/deep link.
The UI should clearly separate promotions from baseline odds to avoid confusion.

11.4 Data Freshness and Confidence Indicators





Show 'Last updated' timestamp per bookmaker row.
Show a small warning icon if odds older than threshold (e.g., > 2 min pre-match, > 15 sec live).
Show 'source provider' in details (for transparency).
Expose mapping confidence internally; optionally show to users only if low-confidence mapping is
detected.

Page 67

12. AI / ML Specification
12.1 AI Feature Set (User-Facing)






Personalized daily insights: ranked list of events/markets that match user presets.
Probability estimates + confidence for supported markets.
Explainable reasoning: key factors and links to evidence (stats, news, injuries, odds movement).
Alerts: notify when odds cross a threshold or when model signals change materially.
Natural-language summaries per event (short, source-cited) for quick scanning.

12.2 AI System Components
Component
Feature Store

Role
Computes and stores model features per (event,
team, player).
Versioned models per sport/market; A/B testing
support.
Online scoring for upcoming events; caching for
repeated calls.
Fetches relevant stats + news for explanations;
enforces 'no hallucination' rules.
Combines probabilities, odds, confidence, user
preferences, and risk profile to rank insights.
Captures user feedback and outcomes for
continuous improvement.

Model Registry
Inference Service
Evidence Retriever
Ranking Engine
Feedback Loop

12.3 Baseline Modeling Approach by Sport
Start with interpretable, well-understood baselines; evolve to gradient boosting / deep models later.
Sport
Soccer
Basketball
Tennis
Baseball
American Football
Ice Hockey
Cricket
Rugby
MMA

Baseline Approach
Poisson/xG-based goal models + ELO; markets:
1X2, O/U 2.5, BTTS.
ELO + regression on
possessions/offensive/defensive rating; markets:
moneyline, spread, totals.
Player Elo (surface-adjusted) + serve/return stats;
markets: match winner, set winner.
Starting pitcher + team wOBA/ERA components;
markets: moneyline, totals.
ELO + EPA-based features; markets: moneyline,
spread, totals.
ELO + expected goals proxies; markets:
moneyline, totals.
Team rating + venue + format; markets: match
winner.
Team rating + injuries + venue; markets: match
winner/spread.
Fighter rating + reach/age + style stats; markets:
Page 68

eSports

moneyline/method (later).
Team rating + map pool; markets: match winner.

Page 69

12.4 Feature Engineering (Examples)
General
 Team/fighter/player rating (ELO-style), rating delta
 Recent form (last N games): wins, goal/point differential, xG proxy
 Rest days, travel distance (where available)
 Home advantage indicator
 Injury/lineup strength deltas (starters out)
 Market signals: odds movement and consensus changes
Soccer-specific
 Expected goals for/against trends
 Shot quality, possession-adjusted metrics
 Set-piece and defensive metrics
 Lineup confirmation time and changes
Basketball-specific
 Pace, offensive/defensive rating trends
 Back-to-back indicator
 Player usage rates and injuries
Tennis-specific
 Surface-adjusted Elo
 Serve/return hold/break rates
 Fatigue: matches played in last 7 days

12.5 Using Odds as a Signal (Carefully)
Sportsbook odds embed market expectations and are often strong predictors. However, using odds
directly can cause leakage and can bias the model towards the bookmakers. Recommendation:
• Use odds movement features (direction/magnitude) as signals
• Keep a 'pure stats' model as a baseline benchmark
• Calibrate model outputs to avoid overconfidence
• Always explain that predictions are probabilistic

12.6 Evaluation & Calibration






Backtesting with time-based splits (train on past seasons, test on future).
Metrics: Brier score, log loss, calibration curve, AUC (where relevant).
Profitability analysis: only as diagnostic; do not promise returns.
Coverage metrics: which leagues/markets the model supports and where it is weak.
Online monitoring: drift detection and recalibration schedules.

Page 70

12.7 Personalization & Ranking
Ranking should reflect user preferences, not only predicted probability. Inputs:
• User-selected markets (e.g., HT only)
• Favorite teams/leagues
• Risk profile and confidence threshold
• Odds availability across selected sportsbooks
Output: a ranked list of candidate insights with explanations and uncertainty.

12.8 Responsible Gambling Messaging (AI)





No guarantees, no 'sure bets', no misleading certainty wording.
Explain uncertainty and show confidence intervals where possible.
Allow users to disable AI tips entirely.
Provide reminders and regional resources.

Page 71

13. Security, Privacy, and Compliance
13.1 Security Requirements








Encrypt data in transit (TLS) and at rest.
JWT short-lived access tokens; refresh tokens stored securely.
RBAC for admin portal; audit logs for mapping changes and provider keys.
Secret management (Vault/KMS) for provider credentials.
Rate limiting and WAF for public APIs.
Input validation and output encoding to prevent injection/XSS.
Dependency scanning and CI security checks.

13.2 Privacy Requirements





Store minimal PII; separate user identity from analytics identifiers where possible.
User consent for personalization and analytics; allow opt-out.
Data export and deletion workflows.
GDPR/CCPA compliance planning (depending on launch regions).

13.3 Compliance Considerations (Betting Context)
SportsAi is an information and comparison platform. Depending on the jurisdiction and feature set, it
may still be considered gambling-related. Before launch:
• Confirm whether odds display is permitted in target regions
• Validate affiliate and marketing regulations
• Implement age gating if required
• Include responsible gambling links and messaging

13.4 Data Licensing and Redistribution
Most premium sports data and odds feeds restrict redistribution and historical storage. The architecture
supports:
• Storing canonical entities that are not restricted
• Storing raw odds history only if explicitly allowed
• Displaying odds only in permitted contexts (e.g., to logged-in users in allowed regions)
Always review provider terms and obtain legal sign-off.

Page 72

14. Performance, Scalability, and Reliability
14.1 Target SLAs (Example)
Metric
Public API p95 latency
Odds update ingest latency
Uptime
RPO/RTO

Target
< 300ms for cached queries; < 800ms for
uncached
< 10s pre-match; < 2s for streaming live
99.9% monthly (production)
RPO <= 5 minutes; RTO <= 30 minutes (example)

14.2 Caching Strategy





Cache sports/leagues/teams for 24h with background refresh.
Cache event lists for each sport and time window for 15-60s.
Cache best-odds per event/market for 5-15s (live) or 30-60s (pre-match).
Use stale-while-revalidate to keep UI responsive.

14.3 Real-Time Delivery to Clients
Use WebSockets or Server-Sent Events for:
• live odds updates on active event detail pages
• alert triggers
Fallback: polling with exponential backoff.

14.4 Observability





Metrics: provider API latency, error rates, quota usage, mapping mismatch counts.
Tracing: requestId propagation across services.
Logging: structured JSON logs with PII redaction.
Alerting: provider outages, odds staleness, failed ingestion pipelines.

Page 73

15. QA, Testing, and Data Quality
15.1 Automated Tests






Unit tests for adapters: parsing and normalization.
Contract tests: provider response schema validation (OpenAPI where available).
Integration tests: end-to-end ingestion -> canonical DB -> API response.
UI tests: critical flows (sport selection, event detail, odds compare).
Load tests: event list queries and live odds fanout.

15.2 Data Quality Checks






Duplicate event detection and merge rules.
Odds sanity checks (odds > 1.0 decimal; detect spikes).
Bookmaker coverage checks (expected number of offers per sport/time window).
Mapping confidence thresholds; route low-confidence items to admin QA.
Anomaly detection for provider outages (sudden drop in updates).

15.3 Admin QA Tools (Required)
To scale to 10 sports and 10+ sportsbooks, manual QA must be supported by tools:
• Event mapping review (provider event -> canonical event)
• Market mapping review (provider market keys -> canonical market keys)
• Bookmaker coverage dashboards
• Reconciliation reports (fixtures/results mismatches)

Page 74

16. Delivery Roadmap
16.1 MVP (6-10 Weeks Typical)






Sports: Soccer + Basketball + Tennis (initial), with architecture ready for top 10 expansion.
Odds provider: 1 aggregator providing multi-book coverage; at least 5 books in MVP.
Core UI: Sport list, events list with time windows, event detail odds comparison.
Basic favorites and saved presets.
Basic AI: descriptive summaries + simple probability baseline for one market (soccer 1X2).

16.2 Beta (10-16 Weeks Typical)






Expand to top 10 sports and 10+ sportsbooks (subject to data access).
Add line movement charts and alerting.
Add AI ranking and user feedback loop.
Admin portal for mapping QA.
Improve performance and caching.

16.3 v1 Production





Enterprise provider redundancy (two independent fixture/result sources).
Model coverage expansion to more sports/markets.
Compliance hardening and region-based feature gating.
SLO monitoring and on-call runbooks.

Page 75

Appendix A. Filter Catalog (Comprehensive)
This catalog defines all filter options supported by the platform. Filters are grouped by category. Each
filter has:
• key (stable identifier)
• UI label
• data type
• API field mapping
• sport applicability
Filter Key
time.window

UI Label
Time Window

time.start_afte
r

Start After

time.start_bef
ore

Start Before

status

Event Status

is_live

Live Only

sport

Sport

league.include

Leagues
Include
Leagues
Exclude

league.exclude
country

Country

team.include

Teams Include

team.exclude

Teams Exclude

favorites.only

Favorites Only

Description
Preset
windows:
today/next
1h/4h/12h/cus
tom
Events starting
after a given
timestamp
Events starting
before a given
timestamp
upcoming/
live/finished/
postponed/
cancelled
Only live
events
Select sport
key
Only selected
leagues
Exclude
selected
leagues
Country/
region for
league
Events
involving
selected
teams
Exclude events
involving
selected
teams
Only favorites

Type
enum/object

UI Control
segmented
control +
date/time
picker

Applies To
all

datetime

datetime
picker

all

datetime

datetime
picker

all

enum[]

multi-select

all

bool

toggle

all

enum

dropdown

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

bool

toggle

all

Page 76

bookmaker.inc
lude
bookmaker.ex
clude

Bookmakers
Include
Bookmakers
Exclude

availability.mi
n_books

Min
Bookmakers
Offering

offers.promos
_only

Promotions
Only

offers.cashout

Cashout
Available

odds.min

Min Odds

odds.max

Max Odds

line.min

Min Line

line.max

Max Line

implied_prob.
min
implied_prob.
max
odds.spread.m
in

Min Implied
Probability
Max Implied
Probability
Min Book-toBook Spread

movement.dir
ection

Odds
Movement
Direction
Min
Movement
Magnitude

movement.ma
gnitude.min
movement.loo
kback

Movement
Lookback

market.includ
e_keys

Markets
Include

feed
Only selected
bookmakers
Exclude
selected
bookmakers
Require
market
offered by at
least N books
Only events
with
promotions/b
oosts
Only offers
with cashout
(if data
available)
Minimum
decimal odds
Maximum
decimal odds
Minimum line
value
(spread/total)
Maximum line
value
(spread/total)
1/odds >= min

string[]

multi-select

all

string[]

multi-select

all

int

stepper

all

bool

toggle

all

bool

toggle

all

float

range slider

all

float

range slider

all

float

range slider

sports with
lines

float

range slider

sports with
lines

float

range slider

all

1/odds <= max

float

range slider

all

Best odds median odds
>= threshold
up/down/any

float

slider

all

enum

dropdown

all

Absolute
odds/line
movement >=
threshold
Time window
for movement
computation
Only selected
market keys

float

slider

all

enum

dropdown

all

string[]

multi-select

all

Page 77

market.exclud
e_keys
periods

Markets
Exclude
Periods

market.props_
only
stats.form.win
dow

Props Only

stats.form.min
_win_pct
stats.h2h.wind
ow
standings.max
_rank
injuries.exclud
e_star_out

Min Win %
(Form)
H2H Window

lineups.only_c
onfirmed

Lineups
Confirmed
Only

ai.enabled
ai.confidence.
min

AI Tips
Enabled
Min Model
Confidence

ai.probability.
min

Min Predicted
Probability

ai.ev.min

Min Expected
Value

ai.risk_profile

Risk Profile

soccer.market.
ht_only
soccer.cards.in
clude

Half Time
Markets Only
Cards Markets

soccer.corners
.include

Corners
Markets

Form Window

Max Standings
Rank
Exclude if Star
Out

Exclude
market keys
FT/HT/Q1/Q2
etc
Only player
prop markets
Last N games
used for form
filters
Win % in last N
games
Last N H2H
matches
Only teams
ranked <= N
Exclude events
where a star
player is out
(definition per
sport)
Only show
events with
confirmed
starting
lineups
Include AI
ranked results
Only show if
confidence >=
threshold
Only show
outcomes with
prob >=
threshold
Only show if
EV metric >=
threshold
Conservative/
Balanced/
Aggressive
Restrict to HT
markets
Include/
exclude card
markets
Include/
exclude corner

string[]

multi-select

all

string[]

multi-select

all

bool

toggle

some

int

stepper

team sports

float

slider

team sports

int

stepper

team sports

int

stepper

league sports

bool

toggle

sports w/
injury data

bool

toggle

soccer/
basketball/etc

bool

toggle

all

float

slider

supported
sports

float

slider

supported
sports

float

slider

supported
sports

enum

segmented

all

bool

toggle

soccer

bool

toggle

soccer

bool

toggle

soccer

Page 78

basketball.qua
rters
tennis.surface

Quarter
Periods
Surface

baseball.starti
ng_pitchers.kn
own

SP Known
Only

nfl.weather.wi
nd_max

Max Wind

hockey.goalie_
confirmed

Goalie
Confirmed

cricket.format
mma.weight_c
lass
esports.game

Cricket Format
Weight Class

market.group.
main_lines

Market Group:
Main Lines

market.group.
totals

Market Group:
Totals

market.group.
spreads

Market Group:
Spreads

market.group.
asian_handica
p

Market Group:
Asian
Handicap

market.group.
double_chanc
e

Market Group:
Double
Chance

market.group.
btts

Market Group:
Btts

market.group.

Market Group:

eSports Game

markets
Select
quarters
Hard/Clay/
Grass
Only games
with
confirmed
starting
pitchers
Exclude games
above wind
threshold
Only games
with
confirmed
goalie
T20/ODI/Test
Select weight
classes
CS2/LoL/
Dota/Valorant
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable

enum[]

multi-select

basketball

enum[]

multi-select

tennis

bool

toggle

baseball

float

slider

american_foot
ball

bool

toggle

ice_hockey

enum[]
enum[]

multi-select
multi-select

cricket
mma

enum[]

multi-select

esports

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sport-

Page 79

correct_score

Correct Score

market.group.
player_props

Market Group:
Player Props

market.group.
team_props

Market Group:
Team Props

market.group.
futures

Market Group:
Futures

market.group.
same_game_p
arlay

Market Group:
Same Game
Parlay

market.group.
bet_builder

Market Group:
Bet Builder

market.group.
period_market
s

Market Group:
Period
Markets

market.group.
specials

Market Group:
Specials

stats.rating_di
ff.min

Min Rating Diff

stats.rating_di
ff.max

Max Rating
Diff

stats.total_poi
nts_avg.min
stats.total_poi
nts_avg.max
stats.defense_
rank.max

Min Avg Total
Points/Goals
Max Avg Total
Points/Goals
Max Defense
Rank

stats.offense_r

Max Offense

this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Enable/disable
this market
group in
results
Min rating
difference
between
competitors
Max rating
difference
between
competitors
Minimum
average total
Maximum
average total
Only teams
with defense
rank <= N
Only teams

dependent
bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

bool

toggle

sportdependent

float

slider

team sports

float

slider

team sports

float

slider

team sports

float

slider

team sports

int

stepper

team sports

int

stepper

team sports

Page 80

ank.max

Rank

custom.tag.1

Custom Tag 1

custom.tag.2

Custom Tag 2

custom.tag.3

Custom Tag 3

custom.tag.4

Custom Tag 4

custom.tag.5

Custom Tag 5

custom.tag.6

Custom Tag 6

custom.tag.7

Custom Tag 7

custom.tag.8

Custom Tag 8

custom.tag.9

Custom Tag 9

custom.tag.10

Custom Tag 10

custom.tag.11

Custom Tag 11

custom.tag.12

Custom Tag 12

with offense
rank <= N
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

Page 81

custom.tag.13

Custom Tag 13

custom.tag.14

Custom Tag 14

custom.tag.15

Custom Tag 15

custom.tag.16

Custom Tag 16

custom.tag.17

Custom Tag 17

custom.tag.18

Custom Tag 18

custom.tag.19

Custom Tag 19

custom.tag.20

Custom Tag 20

custom.tag.21

Custom Tag 21

custom.tag.22

Custom Tag 22

custom.tag.23

Custom Tag 23

tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

Page 82

custom.tag.24

Custom Tag 24

custom.tag.25

Custom Tag 25

custom.tag.26

Custom Tag 26

custom.tag.27

Custom Tag 27

custom.tag.28

Custom Tag 28

custom.tag.29

Custom Tag 29

custom.tag.30

Custom Tag 30

custom.tag.31

Custom Tag 31

custom.tag.32

Custom Tag 32

custom.tag.33

Custom Tag 33

custom.tag.34

Custom Tag 34

custom.tag.35

Custom Tag 35

User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

Page 83

custom.tag.36

Custom Tag 36

custom.tag.37

Custom Tag 37

custom.tag.38

Custom Tag 38

custom.tag.39

Custom Tag 39

custom.tag.40

Custom Tag 40

configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).
User-defined
tag filter
(admin
configured).

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

string[]

multi-select

all

Page 84

Appendix B. Canonical Market Catalog (Top 10 Sports)
This catalog defines canonical market keys used internally. Provider-specific market keys are mapped to
these canonical keys.
Sport
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer
Soccer

Canonical
Market Key
soccer_match
_odds_ft
soccer_match
_odds_ht
soccer_double
_chance_ft
soccer_draw_
no_bet_ft
soccer_asian_
handicap_ft
soccer_asian_
handicap_ht
soccer_total_g
oals_ft
soccer_total_g
oals_ht
soccer_btts_ft
soccer_correct
_score_ft
soccer_ht_ft
soccer_corner
s_total_ft
soccer_cards_
total_ft
soccer_first_g
oal
soccer_clean_
sheet
soccer_player
_goal_anytime
soccer_win_to
_nil
soccer_btts_a
nd_win
soccer_total_g
oals_1h
soccer_team_t

Display Name

Period

Line Type

Outcomes

Match Odds
(1X2)
Match Odds
(1X2)
Double
Chance
Draw No Bet

FT

none

HT

none

FT

none

home/draw/
away
home/draw/
away
1X/12/X2

FT

none

home/away

Asian
Handicap
Asian
Handicap
Total Goals
O/U
Total Goals
O/U
Both Teams To
Score
Correct Score

FT

handicap

home/away

HT

handicap

home/away

FT

total

over/under

HT

total

over/under

FT

none

yes/no

FT

none

scoreline

Half Time /
Full Time
Corners O/U

multi

none

htft outcomes

FT

total

over/under

Cards O/U

FT

total

over/under

First Team to
Score
Clean Sheet

FT

none

FT

none

Player
Anytime Goal
Win to Nil

FT

none

home/away/
no_goal
home_yes/
no,away_yes/
no
player yes/no

FT

none

home/away

BTTS & Win

FT

none

Total Goals
O/U 1st Half
Team Total

1H

total

home+yes/
away+yes/no
over/under

FT

total

home

Page 85

Soccer
Soccer
Soccer
Soccer
Basketball
Basketball
Basketball
Basketball

Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball
Basketball

otal_goals

Goals

soccer_penalt
y_awarded
soccer_red_ca
rd
soccer_to_qua
lify
soccer_bet_bu
ilder
basketball_mo
neyline
basketball_spr
ead
basketball_tot
al_points
basketball_tea
m_total_point
s

Penalty
Awarded
Red Card

FT

none

over/under,
away
over/under
yes/no

FT

none

yes/no

To Qualify

FT

none

home/away

Bet Builder
(SGP)
Moneyline

FT

composite

varies

Game

none

home/away

Point Spread

Game

handicap

home/away

Total Points
O/U
Team Total
Points

Game

total

over/under

Game

total

basketball_1h
_moneyline
basketball_1h
_spread
basketball_1h
_total
basketball_q1
_moneyline
basketball_q1
_spread
basketball_q1
_total
basketball_pla
yer_points
basketball_pla
yer_rebounds
basketball_pla
yer_assists
basketball_pla
yer_threes
basketball_rac
e_to_points
basketball_alt
_spreads
basketball_alt
_totals

1st Half
Moneyline
1st Half
Spread
1st Half Total

1H

none

home
over/under,
away
over/under
home/away

1H

handicap

home/away

1H

total

over/under

Q1 Moneyline

Q1

none

home/away

Q1 Spread

Q1

handicap

home/away

Q1 Total

Q1

total

over/under

Player Points
O/U
Player
Rebounds O/U
Player Assists
O/U
Player 3PT
Made O/U
Race to N
Points
Alternate
Spreads
Alternate
Totals

Game

total

Game

total

Game

total

Game

total

Game

none

player
over/under
player
over/under
player
over/under
player
over/under
home/away

Game

handicap

home/away

Game

total

over/under

Page 86

Basketball

basketball_do
uble_double
basketball_trip
le_double
basketball_wi
nning_margin
tennis_match_
winner
tennis_set_wi
nner
tennis_total_g
ames
tennis_game_
handicap
tennis_first_se
t_winner
tennis_total_s
ets
tennis_correct
_score_sets
tennis_first_br
eak

Player DoubleDouble
Player TripleDouble
Winning
Margin
Match Winner

Game

none

yes/no

Game

none

yes/no

Game

none

ranges

Match

none

Set Winner

Set

none

Total Games
O/U
Game
Handicap
1st Set Winner

Match

total

player1/
player2
player1/
player2
over/under

Match

handicap

Set1

none

Total Sets O/U

Match

total

player1/
player2
player1/
player2
over/under

Correct Score
(Sets)
First Break of
Serve

Match

none

2-0/2-1 etc

Match

none

Tennis

tennis_aces

Match

total

Tennis

tennis_double
_faults
baseball_mon
eyline
baseball_run_l
ine
baseball_total
_runs
baseball_team
_total_runs
baseball_first_
5_moneyline
baseball_first_
5_total
baseball_first_
inning_runs
baseball_hom
e_runs
baseball_pitch
er_strikeouts
football_mone
yline

Player Aces
O/U
Player Double
Faults O/U
Moneyline

Match

total

Game

none

player1/
player2/
no_break
player
over/under
player
over/under
home/away

Run Line

Game

handicap

home/away

Total Runs
O/U
Team Total
Runs
First 5 Innings
Moneyline
First 5 Innings
Total
1st Inning
Runs
Home Runs

Game

total

over/under

Game

total

F5

none

home/away
over/under
home/away

F5

total

over/under

1I

total

over/under

Game

total

over/under

Pitcher
Strikeouts O/U
Moneyline

Game

total

Game

none

player
over/under
home/away

Basketball
Basketball
Tennis
Tennis
Tennis
Tennis
Tennis
Tennis
Tennis
Tennis

Baseball
Baseball
Baseball
Baseball
Baseball
Baseball
Baseball
Baseball
Baseball
American
Football

Page 87

American
Football
American
Football
American
Football
American
Football
American
Football
American
Football
American
Football
American
Football
American
Football
American
Football
American
Football
Ice Hockey
Ice Hockey
Ice Hockey
Ice Hockey
Ice Hockey
Ice Hockey
Ice Hockey
Ice Hockey
Cricket
Cricket
Cricket

football_sprea
d
football_total_
points
football_team
_total_points
football_1h_m
oneyline
football_1h_sp
read
football_1h_to
tal
football_q1_to
tal
football_playe
r_passing_yar
ds
football_playe
r_rushing_yar
ds
football_playe
r_receiving_ya
rds
football_anyti
me_td
hockey_mone
yline
hockey_puck_l
ine
hockey_total_
goals
hockey_team_
total_goals
hockey_period
1_moneyline
hockey_period
1_total
hockey_period
_total
hockey_player
_points
cricket_match
_winner
cricket_toss_w
inner
cricket_total_r
uns_innings

Point Spread

Game

handicap

home/away

Total Points

Game

total

over/under

Team Total
Points
1st Half
Moneyline
1st Half
Spread
1st Half Total

Game

total

1H

none

home/away
over/under
home/away

1H

handicap

home/away

1H

total

over/under

Q1 Total

Q1

total

over/under

QB Passing
Yards O/U

Game

total

player
over/under

Rushing Yards
O/U

Game

total

player
over/under

Receiving
Yards O/U

Game

total

player
over/under

Anytime TD
Scorer
Moneyline

Game

none

player yes/no

Game

none

home/away

Puck Line

Game

handicap

home/away

Total Goals

Game

total

over/under

Team Total
Goals
1st Period
Moneyline
1st Period
Total Goals
Period Total
Goals
Player Points
O/U
Match Winner

Game

total

P1

none

P1

total

home/away
over/under
home/away/
draw
over/under

Pn

total

over/under

Game

total

Match

none

Toss Winner

Pre

none

player
over/under
team1/
team2/draw
team1/team2

Total Runs
(Innings)

Innings

total

over/under

Page 88

Cricket
Cricket
Cricket
Rugby
Rugby
Rugby
Rugby
Rugby
MMA
MMA
MMA
MMA
eSports
eSports
eSports
eSports
eSports

cricket_top_ba
tsman
cricket_top_b
owler
cricket_match
_runs
rugby_match_
winner
rugby_spread
rugby_total_p
oints
rugby_team_t
otal_points
rugby_anytim
e_try
mma_fight_wi
nner
mma_method
_of_victory
mma_round_b
etting
mma_total_ro
unds
esports_match
_winner
esports_map_
winner
esports_handi
cap_maps
esports_total_
rounds
esports_total_
kills

Top Batsman

Innings

none

players

Top Bowler

Innings

none

players

Match Total
Runs
Match Winner

Match

total

over/under

Match

none

Point Spread
Total Points

Match
Match

handicap
total

home/away/
draw
home/away
over/under

Team Total
Points
Anytime Try
Scorer
Fight Winner

Match

total

Match

none

Fight

none

Method of
Victory
Round Betting

Fight

none

Fight

none

fighterA/
fighterB
KO/TKO, Sub,
Decision
round + fighter

Total Rounds

Fight

total

over/under

Match Winner

Match

none

team1/team2

Map Winner

Map

none

team1/team2

Handicap
Maps
Total Rounds

Match

handicap

team1/team2

Map

total

over/under

Total Kills

Map

total

over/under

Page 89

home/away
over/under
player yes/no

Appendix C. Database Schema (Simplified DDL)
The following is a simplified schema intended for discussion. Final schema depends on provider licensing
and selected stack.
-- Canonical events
CREATE TABLE events (
event_id

TEXT PRIMARY KEY,

sport_key

TEXT NOT NULL,

league_id

TEXT NOT NULL,

start_time_utc

TIMESTAMP NOT NULL,

status

TEXT NOT NULL,

home_team_id

TEXT,

away_team_id

TEXT,

venue

TEXT,

round

TEXT,

created_at

TIMESTAMP NOT NULL DEFAULT NOW(),

updated_at

TIMESTAMP NOT NULL DEFAULT NOW()

);

-- Bookmakers
CREATE TABLE bookmakers (
bookmaker_id

TEXT PRIMARY KEY,

brand_key

TEXT UNIQUE NOT NULL,

display_name

TEXT NOT NULL,

region_key

TEXT,

deep_link_template TEXT,
created_at

TIMESTAMP NOT NULL DEFAULT NOW()

);

-- Latest odds snapshot (hot store)
CREATE TABLE odds_latest (

Page 90

event_id

TEXT NOT NULL,

bookmaker_id

TEXT NOT NULL,

market_key

TEXT NOT NULL,

outcome_key

TEXT NOT NULL,

line_value

NUMERIC NULL,

odds_decimal

NUMERIC NOT NULL,

is_live

BOOLEAN NOT NULL,

updated_at

TIMESTAMP NOT NULL,

PRIMARY KEY (event_id, bookmaker_id, market_key, outcome_key, line_value, is_live)
);

-- Provider mapping example
CREATE TABLE provider_event_map (
provider_key

TEXT NOT NULL,

provider_event_id

TEXT NOT NULL,

event_id

TEXT NOT NULL,

confidence

NUMERIC NOT NULL DEFAULT 1.0,

last_verified_at

TIMESTAMP,

PRIMARY KEY (provider_key, provider_event_id)
);

Appendix D. Notifications & Alerts
Users can configure alerts per sport, league, team, market, and odds threshold. Alerts should be ratelimited and debounced to prevent spam.

Alert Types
Type
Odds Threshold
Line Movement
Match Starting

Description
Notify when odds cross above/below a userdefined value.
Notify when the line moves by X within lookback
window.
Notify N minutes before a favorite match starts.

Page 91

Lineup Confirmed
AI Signal Change

Notify when lineup becomes confirmed
(soccer/basketball).
Notify when model confidence crosses a
threshold or ranking changes.

Alert Rule Example
{
"ruleId": "alrt_123",
"sport": "soccer",
"teams": ["t_ars"],
"marketKey": "soccer_match_odds_ft",
"outcomeKey": "home",
"bookmakers": ["unibet", "bet365"],
"trigger": { "type": "odds_above", "value": 2.20 },
"cooldownMinutes": 30,
"enabled": true
}

Page 92

Appendix E. Provider Contract & Licensing Checklist










Sports/leagues/markets covered; explicitly list exclusions.
Latency SLA (pre-match vs live) and update mechanism (polling vs streaming).
Redistribution rights: can you display odds publicly? to logged-in users? can you cache?
Historical storage rights: can you store and replay odds history? for how long?
Attribution requirements: logos, brand names, data source labels.
Rate limits and quotas; burst rules; cost overages.
Change management: versioning, deprecation notice periods.
Support: incident response times and escalation contacts.
GDPR/data processing agreements if any user data is shared (ideally none).

Appendix F. Glossary
Term
Canonical Model
Market
Outcome
Line
Consensus
EV (Expected Value)
Streaming API

Definition
Internal normalized representation independent
of provider.
A betting market, e.g., Match Odds, Total Goals.
A selection within a market, e.g.,
Home/Draw/Away.
A numeric value for spreads/totals/handicaps
(e.g., 2.5).
Aggregated reference odds computed from
available books.
A metric comparing model probability vs odds;
used for ranking, not guarantees.
Push-based updates (websocket) for low-latency
odds.

Appendix G. References (Public)
These references are included to help engineering and product teams quickly find official documentation
and provider marketing pages for evaluation.









Sportradar Sports Data API - developer and product pages
Sportradar Odds Data APIs - Odds Comparison API reference
Betfair Exchange API - developer portal (Betting API + Stream API)
The Odds API - documentation and bookmaker/market lists
SportsDataIO - odds API and OpenAPI swagger files
SportMonks - odds endpoints and bookmakers documentation
Genius Sports - Data & Odds APIs overview
Stats Perform - Opta / Dynamic Stats API pages

Page 93

Appendix H. Extended API Details
This appendix expands key endpoints with parameter and field definitions. It is intended to function as
an implementation checklist for backend and frontend teams.

H.1 GET /v1/events
Parameter
sport

Location
query

Type
string

Required
no

window

query

enum

no

startTimeGte

query

datetime

no

startTimeLte

query

datetime

no

status

query

string[]

no

leagueIds
teamIds
favoritesOnly

query
query
query

string[]
string[]
bool

no
no
no

limit

query

int

no

cursor

query

string

no

Description
Sport key (e.g.,
soccer,
basketball).
today | next_1h |
next_4h |
next_12h |
custom
Override lower
bound (UTC)
Override upper
bound (UTC)
Event statuses to
include
Filter by leagues
Filter by teams
Only favorites
feed
Pagination limit
(default 50)
Cursor for
pagination

H.2 POST /v1/events/search (Body Fields)
Parameter
sport
timeWindow

Location
body
body

Type
string
object

Required
yes
yes

status
leagues.include

body
body

string[]
string[]

no
no

leagues.exclude

body

string[]

no

teams.include
teams.exclude
markets.includeM
arketKeys
markets.periods

body
body
body

string[]
string[]
string[]

no
no
no

body

string[]

no

bookmakers.inclu
de

body

string[]

no

Page 94

Description
Sport key
Preset or custom
time window
Statuses
Leagues to
include
Leagues to
exclude
Teams to include
Teams to exclude
Canonical market
keys
Periods
(FT/HT/Q1 etc)
Bookmaker keys

odds.minDecimal
odds.maxDecimal
availability.minBo
okmakersOffering
sort
pagination

body
body
body

number
number
int

no
no
no

body
body

array
object

no
no

Min odds
Max odds
Minimum books
offering market
Sort fields
Cursor + limit

H.3 GET /v1/odds
Parameter
eventId

Location
query

Type
string

Required
yes

marketKey

query

string

yes

isLive

query

bool

no

bookmakers

query

string[]

no

oddsFormat

query

enum

no

Description
Canonical event
ID
Canonical market
key
Whether to
request live odds
if supported
Optional subset of
bookmakers
decimal |
american |
fractional (server
can also return
decimal only)

H.4 GET /v1/odds/history
Parameter
eventId

Location
query

Type
string

Required
yes

marketKey

query

string

yes

bookmakerId

query

string

no

mode
range

query
query

enum
enum

no
no

sample

query

enum

no

Page 95

Description
Canonical event
ID
Canonical market
key
Bookmaker to
chart (optional)
book | consensus
1h | 4h | 12h |
24h | 7d
raw | 1s | 5s | 30s
| 1m
(downsampling)

Appendix I. Admin Portal (Operations & QA)
A professional odds comparison platform requires continuous operations tooling. This appendix specifies
core admin screens and workflows.

I.1 Admin Screen Inventory
Screen ID
ADM-001
ADM-002
ADM-010
ADM-011
ADM-012
ADM-020
ADM-030
ADM-040
ADM-050

Name
Provider Status Dashboard
Ingestion Jobs & Backfill
Event Mapping QA
Team Mapping QA
Market Mapping QA
Bookmaker Coverage Monitoring
User Feedback Queue (mapping issues, bad odds)
Feature Flags & Config
AI Model Registry & Rollouts

I.2 Event Mapping QA Workflow
12. Ingestion detects a new provider event that cannot be confidently mapped.
13. System creates a mapping task with candidates (based on time/teams/league similarity).
14. Admin reviews candidates, confirms mapping, or creates a new canonical event.
15. Mapping decision is audited and stored with confidence and reviewer ID.
16. Downstream: odds and stats re-associate to the canonical event; caches are invalidated.

I.3 Market Mapping QA Workflow
17. Provider introduces a new market key or changes naming.
18. Adapter flags unmapped market and stores samples.
19. Admin maps provider market -> canonical market; defines period and line transform rules.
20. Automated tests validate mapping against sample payloads.
21. Deployment: mapping rules are versioned and rolled out safely.

Page 96

Appendix J. Observability Metrics Catalog
Below is a baseline list of metrics to instrument from day one. Use Prometheus/OpenTelemetry naming
conventions.
Metric
provider_http_requests_total{p
rovider,endpoint,status}
provider_http_latency_ms_buck
et{provider,endpoint}
provider_rate_limit_hits_total{p
rovider}
ingest_events_processed_total{
provider,type}
ingest_events_failed_total{prov
ider,type,reason}
odds_updates_per_minute{spor
t,bookmaker}
odds_staleness_seconds{sport,
bookmaker}
mapping_unresolved_total{prov
ider,entity}
api_requests_total{route,status
}
api_latency_ms_bucket{route}
ws_connections_active
ai_inference_latency_ms_bucke
t{model}
ai_tip_coverage_ratio{sport}

Type
Counter

Counter

Description
Total provider requests by
status code.
Latency distribution per
provider endpoint.
How often rate limits occur.

Counter

Fixtures/odds/news processed.

Counter

Failures by reason.

Gauge

Update rate monitoring.

Gauge

How stale latest odds are.

Gauge
Counter

Unresolved mapping tasks
backlog.
Public API usage and errors.

Histogram
Gauge
Histogram

Public API latency.
Active websocket connections.
AI inference latency.

Gauge

Share of events for which AI can
generate tips.

Histogram

Page 97

Appendix K. Bookmaker Integration Details
This appendix defines how SportsAi represents bookmakers and offers, and how deep links and tracking
should be handled in a compliant, user-friendly way.

K.1 Bookmaker Metadata Fields
Field
brand_key
display_name
region_key

Description
Stable key used internally (e.g., unibet, superbet).
Human readable brand name.
Region/jurisdiction grouping (EU, UK, US, LATAM,
etc).
List of jurisdictions/markets where the brand is
licensed (if maintained).
Sports where odds coverage exists (from provider
coverage).
Main lines only vs props vs bet builder.
Template for event/market deep links.
Affiliate/ref parameters (if applicable).
Light/dark SVG/PNG assets.
active | degraded | offline (ops-controlled).

license_tags
supported_sports
supported_markets_depth
deep_link_template
tracking_params
logo_assets
status

K.2 Deep Link Strategy






Prefer provider-supported deep links when available (highest accuracy).
Fallback to bookmaker home page link if event-level linking is not permitted.
Always label the link action clearly: 'Open in {Bookmaker}'.
Track clicks for analytics only if user consent allows.
Do not auto-redirect users without explicit action.

K.3 Offer Normalization (Promos/Boosts)
Standardized promotion fields (if provided by data feed):
{
"promotionId": "promo_123",
"bookmaker": "superbet",
"title": "Odds Boost: Team A to win",
"type": "odds_boost",
"eventId": "evt_123",
"marketKey": "soccer_match_odds_ft",
"terms": "Short terms text...",
"startTimeUtc": "2026-01-10T00:00:00Z",
"endTimeUtc": "2026-01-10T23:59:59Z",

Page 98

"deepLink": "https://...",
"tracking": { "affiliateId": "aff_x", "campaign": "boosts" }
}

Page 99

Appendix L. Data Retention & Storage Policy (Suggested)
Final retention policy depends on provider licenses and regional regulations. This appendix proposes a
conservative default.
Data Type
Raw provider payloads

Default Retention
7-30 days

Canonical fixtures/results

Indefinite

Latest odds snapshots
Odds history time-series
User analytics events

7-30 days
0 days unless licensed;
otherwise 6-24 months
13 months

AI training datasets

As needed; anonymized

Page 100

Notes
For debugging and replay;
delete sooner if not allowed.
Typically allowed; verify
provider terms.
For UI and short-term analytics.
Only if license permits storage
of historical odds.
Common retention; allow user
opt-out/deletion.
Ensure no PII; document
provenance.

Appendix M. QA Test Case Matrix (Sample)
This matrix lists representative test cases for MVP-to-v1. Expand during QA planning.
ID
TC-001

Area
Onboarding

Scenario
Complete onboarding
workflow end-to-end

TC-002

Sports Browsing

TC-003

Filters

TC-004

Odds Compare

TC-005

Event Detail

Complete sports
browsing workflow
end-to-end
Apply multiple filters
(time window + league
+ market +
bookmakers) and save
preset
Compare odds for an
event where 3 books
offer market and 2 do
not
Complete event detail
workflow end-to-end

TC-006

Favorites

Complete favorites
workflow end-to-end

TC-007

AI Tips

Request AI tips with
confidence threshold
set high

TC-008

Notifications

TC-009

Performance

Create odds threshold
alert and simulate odds
crossing
Complete performance
workflow end-to-end

TC-010

Security

TC-011

Onboarding

TC-012

Sports Browsing

TC-013

Filters

Attempt to call
/v1/users/me without
auth
Complete onboarding
workflow end-to-end
Complete sports
browsing workflow
end-to-end
Apply multiple filters
(time window + league
+ market +
Page 101

Expected Result
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Results match preview
count; preset persists
and reloads correctly
Table shows odds for 3
books, 'Not offered' for
others; best odds
highlighted
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Only tips with
confidence >=
threshold shown;
empty state if none
Single notification
delivered; cooldown
enforced
No crashes; correct UI
states; analytics
emitted
401 Unauthorized; no
user data leaked
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Results match preview
count; preset persists
and reloads correctly

bookmakers) and save
preset
Compare odds for an
event where 3 books
offer market and 2 do
not
Complete event detail
workflow end-to-end

TC-014

Odds Compare

TC-015

Event Detail

TC-016

Favorites

Complete favorites
workflow end-to-end

TC-017

AI Tips

Request AI tips with
confidence threshold
set high

TC-018

Notifications

TC-019

Performance

Create odds threshold
alert and simulate odds
crossing
Complete performance
workflow end-to-end

TC-020

Security

TC-021

Onboarding

TC-022

Sports Browsing

TC-023

Filters

TC-024

Odds Compare

TC-025

Event Detail

TC-026

Favorites

Complete favorites
workflow end-to-end

TC-027

AI Tips

Request AI tips with

Attempt to call
/v1/users/me without
auth
Complete onboarding
workflow end-to-end
Complete sports
browsing workflow
end-to-end
Apply multiple filters
(time window + league
+ market +
bookmakers) and save
preset
Compare odds for an
event where 3 books
offer market and 2 do
not
Complete event detail
workflow end-to-end

Page 102

Table shows odds for 3
books, 'Not offered' for
others; best odds
highlighted
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Only tips with
confidence >=
threshold shown;
empty state if none
Single notification
delivered; cooldown
enforced
No crashes; correct UI
states; analytics
emitted
401 Unauthorized; no
user data leaked
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Results match preview
count; preset persists
and reloads correctly
Table shows odds for 3
books, 'Not offered' for
others; best odds
highlighted
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Only tips with

confidence threshold
set high
TC-028

Notifications

Create odds threshold
alert and simulate odds
crossing
Complete performance
workflow end-to-end

TC-029

Performance

TC-030

Security

TC-031

Onboarding

TC-032

Sports Browsing

TC-033

Filters

TC-034

Odds Compare

TC-035

Event Detail

TC-036

Favorites

Complete favorites
workflow end-to-end

TC-037

AI Tips

Request AI tips with
confidence threshold
set high

TC-038

Notifications

TC-039

Performance

Create odds threshold
alert and simulate odds
crossing
Complete performance
workflow end-to-end

TC-040

Security

TC-041

Onboarding

Attempt to call
/v1/users/me without
auth
Complete onboarding
workflow end-to-end
Complete sports
browsing workflow
end-to-end
Apply multiple filters
(time window + league
+ market +
bookmakers) and save
preset
Compare odds for an
event where 3 books
offer market and 2 do
not
Complete event detail
workflow end-to-end

Attempt to call
/v1/users/me without
auth
Complete onboarding

Page 103

confidence >=
threshold shown;
empty state if none
Single notification
delivered; cooldown
enforced
No crashes; correct UI
states; analytics
emitted
401 Unauthorized; no
user data leaked
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Results match preview
count; preset persists
and reloads correctly
Table shows odds for 3
books, 'Not offered' for
others; best odds
highlighted
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Only tips with
confidence >=
threshold shown;
empty state if none
Single notification
delivered; cooldown
enforced
No crashes; correct UI
states; analytics
emitted
401 Unauthorized; no
user data leaked
No crashes; correct UI

workflow end-to-end
TC-042

Sports Browsing

Complete sports
browsing workflow
end-to-end
Apply multiple filters
(time window + league
+ market +
bookmakers) and save
preset
Compare odds for an
event where 3 books
offer market and 2 do
not
Complete event detail
workflow end-to-end

TC-043

Filters

TC-044

Odds Compare

TC-045

Event Detail

TC-046

Favorites

Complete favorites
workflow end-to-end

TC-047

AI Tips

Request AI tips with
confidence threshold
set high

TC-048

Notifications

TC-049

Performance

Create odds threshold
alert and simulate odds
crossing
Complete performance
workflow end-to-end

TC-050

Security

TC-051

Onboarding

TC-052

Sports Browsing

TC-053

Filters

TC-054

Odds Compare

Attempt to call
/v1/users/me without
auth
Complete onboarding
workflow end-to-end
Complete sports
browsing workflow
end-to-end
Apply multiple filters
(time window + league
+ market +
bookmakers) and save
preset
Compare odds for an
event where 3 books
offer market and 2 do

Page 104

states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Results match preview
count; preset persists
and reloads correctly
Table shows odds for 3
books, 'Not offered' for
others; best odds
highlighted
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Only tips with
confidence >=
threshold shown;
empty state if none
Single notification
delivered; cooldown
enforced
No crashes; correct UI
states; analytics
emitted
401 Unauthorized; no
user data leaked
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Results match preview
count; preset persists
and reloads correctly
Table shows odds for 3
books, 'Not offered' for
others; best odds

not
Complete event detail
workflow end-to-end

TC-055

Event Detail

TC-056

Favorites

Complete favorites
workflow end-to-end

TC-057

AI Tips

Request AI tips with
confidence threshold
set high

TC-058

Notifications

TC-059

Performance

Create odds threshold
alert and simulate odds
crossing
Complete performance
workflow end-to-end

TC-060

Security

Attempt to call
/v1/users/me without
auth

Page 105

highlighted
No crashes; correct UI
states; analytics
emitted
No crashes; correct UI
states; analytics
emitted
Only tips with
confidence >=
threshold shown;
empty state if none
Single notification
delivered; cooldown
enforced
No crashes; correct UI
states; analytics
emitted
401 Unauthorized; no
user data leaked



# Part 3: Original Design Specification (Superbet Inspired V1)

SportsAi - Mobile Design Specification
Superbet-inspired sportsbook UX patterns adapted for multi-book odds comparison

Version
Date
Owner
Status

v1.0
2026-01-10
Product & Design
Internal Draft

Table of Contents
NOTE: In Microsoft Word, right-click this page and choose 'Update Field' if you insert an automatic TOC in
your template. This document uses heading styles so a TOC can be generated.

1. Scope and Non-goals
This design specification defines the user experience, information architecture, core screens, and UI
component system for SportsAi (mobile-first). The visual direction is inspired by common sportsbook
patterns observed in the Superbet app (e.g., bold red brand accents, persistent bottom navigation, event
list cards with prominent odds, quick access to Live and Tickets/Betslip), but all layouts, tokens, and
components are original to SportsAi.

1.1 In scope






Mobile app (iOS + Android) design system and screen specifications.
Top-10 sports navigation and sport-specific settings tabs (filters).
Multi-book odds comparison and differences between bookmaker offers.
Filters: time windows (Today, Next 1h, Next 4h, Next 12h) + advanced filter builder.
AI Insights surfaces (tips feed + explanations) and responsible-gambling UX guardrails.

1.2 Explicit non-goals (v1)




Replicating any proprietary Superbet UI assets 1:1 (icons, layouts, copy).
Handling deposits/withdrawals inside SportsAi (deep-link out to bookmakers instead).
Final brand name/logo design (this spec focuses on product UI patterns).

2. Reference UX Patterns (Superbet-inspired)
Observed common sportsbook patterns relevant to SportsAi. These are guidance patterns, not exact copies.

2.1 Persistent bottom navigation
Use a 5-item bottom navigation bar for primary sections. Superbet’s mobile UX commonly uses bottom
navigation for fast reachability to Home, Live, Sports, Tickets/Betslip, and Games. SportsAi adapts this into:
Home, Sports, Live, Compare, Account.

2.2 Red as primary brand accent + high-contrast hierarchy
Superbet brand direction emphasizes strong red accents. SportsAi uses a similar approach: red for primary
actions, headers, and key promotional surfaces, while keeping content areas light and readable.

2.3 Event lists optimized for scanning
Event rows/cards must allow users to compare odds quickly: team names, start time, league context, and 23 primary market odds visible without opening the event.

2.4 Betslip/Tickets paradigm (adapted)
While SportsAi is not a bookmaker, users still need a 'selection slip' to compare multiple picks across
platforms. We keep the mental model of a betslip/ticket but rename it to 'Slip' or 'Compare Slip' to avoid
regulatory confusion.

2.5 Wireframe references (original)
The following wireframes illustrate how Superbet-like patterns can be adapted for SportsAi without copying
exact layouts.

Figure: Home: promo + quick actions + event list + bottom nav

Figure: Event Detail: tabs + key markets + bookmaker compare

Figure: Filters: time window presets + market presets + save

3. Design Principles
Principle
Speed to decision

Implication for UI
Users should understand what to do within 3
seconds on any screen.
Prioritize information density without clutter:
consistent rows, chips, and odds pills.
Always show source bookmaker, timestamp, and
'last updated' for odds.
Everything is filterable; users can save presets per
sport and per market.
Age gate, responsible gambling messaging, and no
misleading guarantees.

Scanability
Trust and transparency
Personal control
Safe & compliant

4. Information Architecture
Primary navigation and key sub-areas. This structure is optimized for one-handed mobile use.

4.1 Bottom navigation (5 items)
Tab
Home
Sports
Live
Compare
Account

Primary job-to-be-done
Quickly see what matters now
(favorites + top events).
Browse by sport/league; apply
sport-specific filters.
Track in-play events and odds
updates.
Compare offers/odds across
bookmakers and build a compare
slip.
Preferences, filters, notifications,
responsible gambling tools.

Key sub-pages
Promo highlights, For You, Top
Live, Trending markets
Top 10 sports list, Leagues, Sport
settings
Live list, Live event, match
tracker
Comparison view, Differences,
Deep links
Favorites, Saved filters, Odds
format, Alerts

4.2 Global entry points





Global search (teams, leagues, events, players).
Notification bell (odds movement alerts, favorite team match reminders).
Profile avatar / account chip (quick access to settings).
Floating Slip button (optional) when user has selections.

5. Visual Design System
5.1 Color system (tokens)
Tokens are defined to support light mode first, with optional dark mode. Values below are recommended
starting points.

Token
Brand/Primary

Hex
#FF0000

Usage
Primary CTA, header,
active states

Brand/Secondary

#EE4A4B

Bg/Canvas
Bg/Subtle

#FFFFFF
#F5F6F8

Text/Primary

#111827

Secondary accent,
hover/pressed blends
Primary background
Grouped sections, list
backgrounds
Body text

Text/Secondary

#6B7280

State/Success

#16A34A

State/Warning

#F59E0B

Secondary labels,
metadata
Up movement,
win/positive
Risk/warning

State/Error

#DC2626

Errors, destructive

Notes
Superbet’s brand red is
commonly represented
as #FF0000 in brand
listings.
Use for softer red
surfaces.
Light-first.
Improves scanability.
WCAG-friendly contrast
on white.
Use sparingly.
Avoid overuse to reduce
bias.
Use for 'odds changed'
warnings.
Differentiate from
brand red via
hue/weight.

5.2 Typography
Use a system-first type scale (SF Pro / Roboto) or Inter if available. Typography must support fast scanning
of odds and teams.
Style
H1
H2
H3

Size
24
18
16

Weight
Bold
Bold
SemiBold

Body
Caption

14
12

Regular
Regular

Odds

16

Bold

Use
Screen titles (rare)
Section titles
Card titles, market
headers
Default
League, timestamps,
bookmaker name
Odds pills and
comparison table values

5.3 Spacing, grid, and radii





Base spacing unit: 4pt (use 4/8/12/16/24/32).
Card padding: 12-16pt; list row height: 56-72pt depending on sport density.
Corner radius: 12pt for cards; 999pt for chips/pills.
Elevation: use subtle shadow only for floating surfaces (bottom sheets, sticky slip).

6. Component Library (Superbet-inspired patterns)
Components are specified as reusable building blocks. All components must support: loading, empty, error,
disabled, and accessibility states.

6.1 Odds Pill
A compact, tappable chip showing a price for a specific outcome (e.g., 1, X, 2).
Property
Size
Content
States
Behavior

Spec
Min width 56pt; height 36pt; internal padding 10pt
horizontal.
Outcome label (optional) + odds value (bold).
Default, Selected, Disabled, Suspended,
OddsChangedUp, OddsChangedDown.
Tap adds selection to Compare Slip (or toggles
selection). Long press opens market details.

6.2 Event Card / Row
List item optimized for scanning. Must show: time, teams/players, league, and 2-3 primary odds.





Left: start time + live indicator (dot) + period/score (if live).
Center: participant names (2-line), optional form/injury badges.
Right: 2-3 odds pills (FT 1X2 default), plus 'More' chevron.
Secondary row: best bookmaker badge (e.g., 'Best @ 2.10 Unibet') and last update timestamp.

6.3 Bookmaker Offer Row
Row in the comparison table showing bookmaker, odds, and key differences (bonus, cashout, limits if
known).





Book logo + name + region tag (if required).
Odds value aligned right; highlight best odds for the selected outcome.
Differences chips: 'Cashout', 'Boost', 'Live', 'Min stake', 'Max payout' (data permitting).
CTA: 'Open' deep link to bookmaker event page (external).

6.4 Filter Chips + Advanced Filter Builder




Chips show active filters; tap to edit; long press to reorder (optional).
Advanced builder uses a bottom sheet with sections: Time, Sport, League, Market, Team, Odds range,
Bookmakers, AI signals.
Must support 'Save preset' and 'Set as default for this sport'.

6.5 Segmented control: Half-time vs Full-time
A two-option segmented control used across sports to switch default market sets (FT/HT).
Rules:




Default is Full-time (FT).
Persist user choice per sport.
Switching changes visible odds pills in lists and event pages.

7. Screen Specifications
Each screen definition includes purpose, layout, key components, interactions, and edge cases. IDs are used
for backlog and QA reference.

H-01 Home
Purpose: User lands here to see personalized content: favorites, top events, live highlights.
Layout & Components:






Top bar with search + notifications + quick access to saved filters.
Promo carousel (optional) + quick actions row.
For You section: events filtered by favorites + time window default.
Trending section: popular leagues/markets.
Sticky Compare Slip button appears when selections > 0.

Interactions:





Swipe down to refresh.
Tap odds pill to add/remove selection.
Tap event opens Event Detail.
Tap 'Time window' chips to change scope (Today/1h/4h/12h).

Edge cases / states:



If user has no favorites: show onboarding card 'Pick teams/leagues'.
If no events in time window: show empty state with quick reset.

S-01 Sports Hub
Purpose: Browse top 10 sports and jump to leagues or live lists.
Layout & Components:




Top 10 sport tiles (icon + name).
Search within sport.
Recent sports row (last visited).

Interactions:



Tap sport -> Sport Landing.
Long press sport -> open Sport Settings (filters).

Edge cases / states:


If sport not supported in region: show disabled tile with explanation.

S-02 Sport Landing
Purpose: Sport-specific feed with its own settings tab (filters).

Layout & Components:




Header: sport name + settings icon.
Tabs: Matches, Live, Leagues, Settings.
Default market preset switcher (FT/HT).

Interactions:



Changing FT/HT updates list odds.
Settings changes persist for sport.

Edge cases / states:


If live tab has 0: show 'No live now' + next matches.

L-01 Live
Purpose: Fast access to live events and in-play odds movement.
Layout & Components:



Live filter: sport, league, time since start.
Live event cards with score, clock, key markets.

Interactions:



Tap event -> Live Event Detail.
Enable 'Auto-refresh' toggle (with battery note).

Edge cases / states:


If streaming unavailable: hide streaming CTA, keep tracker.

E-01 Event Detail
Purpose: Deep view: markets, stats, H2H, news and bookmaker offers.
Layout & Components:





Header: teams + time + favorite star.
Tabs: Odds, Stats, H2H, News.
Key markets grid + expand all markets.
Compare table with best odds highlighted.

Interactions:




Tap odds pill -> add to slip.
Change market -> comparison table updates.
Tap bookmaker row -> open offer details + deep link.

Edge cases / states:



If a bookmaker is missing for this event: show 'Not available'.
If odds stale (older than X minutes): show warning banner.

C-01 Compare
Purpose: User compares bookmakers for selected events/markets/outcomes.
Layout & Components:




Compare slip: list of selections.
For each selection: a bookmaker comparison table.
Differences section: bonus, cashout, payout limits (if data).

Interactions:



Sort bookmakers by best odds, best bonus, fastest payout (if available).
Batch open links (confirmation modal).

Edge cases / states:


If user has 0 selections: show empty state with suggested events.

F-01 Filters (Bottom Sheet)
Purpose: Quick filtering and saving presets.
Layout & Components:






Time window chips: Today/1h/4h/12h.
Market presets: FT 1X2, O/U 2.5, BTTS, etc.
Odds range slider.
Bookmakers multiselect.
Save preset + set default.

Interactions:



Reset all returns to sport default.
Apply closes sheet and refreshes list.

Edge cases / states:


If filters result > 500 events: prompt user to narrow.

A-01 AI Tips Feed
Purpose: Personalized suggestions (not guarantees) with transparent rationale.
Layout & Components:





Tip card: event, pick, confidence band, key reasons, risk tags.
Filters: sport/time window/only favorites.
Disclaimers + responsible-gambling CTA.

Interactions:



Tap tip -> Tip Detail.
Thumbs up/down -> preference learning.

Edge cases / states:


If user disables AI: hide tab and surface in Settings.

A-02 AI Tip Detail
Purpose: Explain the model inputs and why the tip fits user settings.
Layout & Components:





Pick summary + confidence.
Factors: form, H2H, injuries/news, odds movement, schedule fatigue.
Best odds across bookmakers for this pick.
User settings match score (e.g., 'Matches your strategy 8/10').

Interactions:



Tap factor -> open source snippet (news/h2h).
Tap 'Change strategy' -> AI settings.

Edge cases / states:


If insufficient data: show 'Low data' and reduce confidence.

P-01 Profile & Settings
Purpose: User controls preferences, odds formats, alerts, and safe play tools.
Layout & Components:






Favorites: teams/leagues/players.
Odds format: decimal/fractional/American.
Default bookmakers and exclusions.
Notification settings.
Responsible gambling links + limit reminders (if applicable).

Interactions:


Changes apply globally; sport-level overrides allowed.

Edge cases / states:



If user is logged out: show sign-in CTA (optional depending on business model).

8. States, Messaging, and Trust Indicators






Every odds value must show recency (e.g., 'Updated 12s ago').
If odds change while user is viewing: show inline delta indicators (up/down) and optional toast.
Loading: use skeleton rows for event lists.
Errors: differentiate 'provider down' vs 'no events'. Provide retry.
Empty states should include one-tap reset and a suggestion (change time window, add favorites).

9. Accessibility & Localization
9.1 Accessibility





Target WCAG AA contrast for text and important icons.
Support dynamic type/font scaling (iOS) and font size (Android).
Touch targets: minimum 44x44pt.
Screen reader labels: odds pills must read 'Outcome, odds, bookmaker best' when applicable.

9.2 Localization & formatting





Language: start with EN + RO + SR (expand later).
Locale-aware date/time and decimal separators.
Odds formats: Decimal (default), Fractional, American.
Right-to-left support planned (do not hardcode left/right).

10. Analytics Events (Design-owned naming)
Define events so product analytics can measure funnel and UI effectiveness.
Event name
view_home
tap_odds_pill

Triggered when
Home screen rendered
User taps an odds pill

open_event_detail
apply_filters

Event detail opened
User applies filters

save_filter_preset
open_bookmaker_deeplink

User saves a preset
User taps Open to bookmaker

ai_tip_feedback

User thumbs up/down a tip

11. Design QA Checklist



All screens: verify safe areas, notch, bottom gesture bar spacing.
All lists: verify skeleton/loading, empty, error, offline states.

Key properties
time_window, has_favorites
event_id, market_key, outcome,
current_best_book
event_id, source_screen
sport, preset_name,
time_window
preset_name, sport
bookmaker_id, event_id,
market_key
tip_id, feedback






Filters: verify preset save/load, reset, and sport-level defaults.
Comparison: verify best odds highlight, ties, missing bookmakers, stale odds.
AI tips: verify disclaimers visible, no guarantee language, explainability available.
Accessibility: verify VoiceOver/TalkBack labels and touch target sizes.

12. Appendix - Figma Library Conventions





Pages: 00-Cover, 01-Tokens, 02-Components, 03-Templates, 04-Flows, 05-Prototypes, 99-Archive.
Component naming: [Category]/[Component]/[Variant]/[State].
Token naming: color.brand.primary, spacing.16, radius.12, type.body.14.
Use Auto Layout for all cards and lists; avoid absolute positioning except for overlays.

References
Public sources used only to understand high-level patterns (not to replicate proprietary designs):




Brandfetch - Superbet brand colors (https://brandfetch.com/superbet.ro)
APKPure listing screenshots for Superbet app (e.g.,
https://apkpure.com/superbet-sportska-kladionica/rs.superbet.sport)
Apple App Store listing for Superbet Sports Betting (https://apps.apple.com/ro/app/superbet-sportsbetting/id1314878525)

