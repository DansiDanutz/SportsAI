# Changelog

All notable changes to SportsAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-02-10 - "Arbitrage Priority"

### 🎯 Major Changes
- **Arbitrage detection now primary feature** - Complete rebranding around arbitrage opportunities
- **Real-time arbitrage alerts** - Sub-5 second detection from odds changes
- **"Winning Tips" credit system** - Premium arbitrage opportunities unlock with credits
- **10+ sportsbook integration** - Professional odds comparison across major operators

### ✨ Added
- Real-time arbitrage detection engine with mathematical formulas
- Value scoring algorithm (profit margin, bookmaker trust, odds stability, liquidity)
- Professional odds comparison across 10+ sportsbooks
- Support for 2-way, 3-way (1X2), and multi-way markets
- Credit-based monetization for high-confidence opportunities (>1% profit, >0.95 confidence)
- Staking recommendations within sportsbook limits
- Line movement tracking with historical charts
- Direct betting links to sportsbook pages
- Support for Decimal, American, and Fractional odds formats
- WebSocket real-time updates for odds and arbitrage opportunities
- Comprehensive admin dashboard for arbitrage monitoring

### 🔧 Technical Improvements
- **Backend:** Upgraded to NestJS with Fastify for better performance
- **Frontend:** Migrated to React 18 with TypeScript
- **Database:** PostgreSQL 16 + Redis caching layer
- **Real-time:** WebSocket + Server-Sent Events implementation
- **Authentication:** OAuth2 + JWT with role-based access control
- **API:** REST + GraphQL hybrid with OpenAPI documentation
- **Monitoring:** Prometheus + Grafana + Sentry integration
- **Testing:** 90%+ test coverage across backend and frontend

### 🌍 Sports Coverage
- Soccer/Football (Premier League, Champions League, World Cup)
- Basketball (NBA, EuroLeague, NCAA)
- Tennis (ATP, WTA, Grand Slams)
- Baseball (MLB, NPB)
- American Football (NFL, NCAA)
- Ice Hockey (NHL, KHL)
- Cricket (IPL, BBL, International)
- Rugby (Union & League)
- MMA/UFC (All major promotions)
- eSports (CS2, LoL, Dota 2, Valorant)

### 🏪 Sportsbook Integrations
- Superbet, Betano, Unibet, Stake
- bet365, William Hill, Betfair (Exchange + Sportsbook)
- Paddy Power, Ladbrokes, 888sport

### 📊 Performance SLAs
- API latency: <300ms (cached), <800ms (uncached)
- Pre-match odds update: <10 seconds
- Live odds update: <2 seconds
- Uptime: 99.9% monthly SLA
- Arbitrage detection: <5s from odds change

## [4.0.0] - 2026-01-15 - "Professional Upgrade"

### ✨ Added
- Multi-sport support (expanded to 10 sports)
- Advanced filtering and search capabilities
- User favorites and custom presets
- Email/SMS notifications for opportunities
- Mobile-responsive design improvements

### 🔧 Changed
- Complete UI/UX redesign with professional theme
- Improved odds ingestion pipeline
- Enhanced database schema for better performance
- Upgraded to Node.js 20 LTS

### 🐛 Fixed
- Odds synchronization timing issues
- Memory leaks in WebSocket connections
- Timezone handling for different regions

## [3.0.0] - 2025-12-01 - "Multi-Source Integration"

### ✨ Added
- Integration with 5+ major sportsbooks
- Automated odds comparison engine
- Basic arbitrage opportunity detection
- User authentication and profiles
- Real-time odds updates via WebSocket

### 🔧 Changed
- Migrated from REST-only to hybrid REST/GraphQL API
- Implemented Redis caching for frequently accessed odds
- Added Prisma ORM for better database management

## [2.0.0] - 2025-09-15 - "Odds Comparison Platform"

### ✨ Added
- Multi-sportsbook odds comparison
- Soccer/Football focus with major leagues
- Basic web interface for odds viewing
- PostgreSQL database for odds storage
- Docker containerization

### 🔧 Changed
- Complete rewrite from Python to Node.js/TypeScript
- Switched from SQLite to PostgreSQL
- Implemented proper CI/CD pipeline

## [1.0.0] - 2025-06-01 - "Initial Release"

### ✨ Added
- Basic sports data aggregation
- Simple odds display interface
- SQLite database for local storage
- Python-based backend with Flask
- Basic HTML/CSS frontend

### 🎯 Initial Features
- Single sportsbook integration (prototype)
- Soccer odds display
- Manual odds refresh
- Basic error handling

---

## 🔮 Upcoming Releases

### [5.1.0] - Q1 2026 - "Mobile Excellence"
- React Native mobile applications (iOS/Android)
- Push notifications for arbitrage opportunities
- Offline mode with data synchronization
- Enhanced mobile-specific UI/UX

### [5.2.0] - Q2 2026 - "AI Insights"
- Machine learning predictions for odds movements
- AI-powered betting recommendations
- Sentiment analysis from sports news
- Predictive arbitrage opportunity modeling

### [6.0.0] - Q3 2026 - "Enterprise Suite"
- Multi-tenant architecture for resellers
- White-label platform capabilities
- Advanced analytics and reporting
- Enterprise-grade security and compliance

---

## 📝 Notes

### Breaking Changes in 5.0.0
- **API Changes:** Complete API restructure - all endpoints changed
- **Database Schema:** Migration required from v4.x
- **Authentication:** New JWT-based system replaces old session-based auth
- **WebSocket Events:** New event structure for real-time updates

### Migration Guide
For upgrading from v4.x to v5.x, please refer to our [Migration Guide](docs/setup/MIGRATION_4_TO_5.md).

### Support Policy
- **Current Version (5.x):** Full support with regular updates
- **Previous Version (4.x):** Security updates only until June 2026
- **Legacy Versions (1.x-3.x):** End of life - upgrade recommended

---

## 🤝 Contributors

Special thanks to all contributors who made SportsAI possible:
- Core development team
- Beta testers and early adopters
- Sportsbook integration partners
- Open source community contributors

---

**📅 Last Updated:** February 10, 2026  
**🔗 Full Release Notes:** [GitHub Releases](https://github.com/Sports-AI/SportsAI/releases)