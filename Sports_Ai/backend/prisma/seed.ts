import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Sports
  const soccer = await prisma.sport.upsert({
    where: { key: 'soccer' },
    update: {},
    create: {
      key: 'soccer',
      name: 'Soccer',
      icon: 'soccer-ball',
    },
  });

  const basketball = await prisma.sport.upsert({
    where: { key: 'basketball' },
    update: {},
    create: {
      key: 'basketball',
      name: 'Basketball',
      icon: 'basketball',
    },
  });

  const baseball = await prisma.sport.upsert({
    where: { key: 'baseball' },
    update: {},
    create: {
      key: 'baseball',
      name: 'Baseball',
      icon: 'baseball',
    },
  });

  const tennis = await prisma.sport.upsert({
    where: { key: 'tennis' },
    update: {},
    create: {
      key: 'tennis',
      name: 'Tennis',
      icon: 'tennis',
    },
  });

  // Create Leagues
  const premierLeague = await prisma.league.upsert({
    where: { id: 'premier-league' },
    update: {},
    create: {
      id: 'premier-league',
      sportId: soccer.id,
      name: 'Premier League',
      country: 'England',
      tier: 1,
    },
  });

  const laLiga = await prisma.league.upsert({
    where: { id: 'la-liga' },
    update: {},
    create: {
      id: 'la-liga',
      sportId: soccer.id,
      name: 'La Liga',
      country: 'Spain',
      tier: 1,
    },
  });

  const serieA = await prisma.league.upsert({
    where: { id: 'serie-a' },
    update: {},
    create: {
      id: 'serie-a',
      sportId: soccer.id,
      name: 'Serie A',
      country: 'Italy',
      tier: 1,
    },
  });

  const bundesliga = await prisma.league.upsert({
    where: { id: 'bundesliga' },
    update: {},
    create: {
      id: 'bundesliga',
      sportId: soccer.id,
      name: 'Bundesliga',
      country: 'Germany',
      tier: 1,
    },
  });

  const ligue1 = await prisma.league.upsert({
    where: { id: 'ligue-1' },
    update: {},
    create: {
      id: 'ligue-1',
      sportId: soccer.id,
      name: 'Ligue 1',
      country: 'France',
      tier: 1,
    },
  });

  const eredivisie = await prisma.league.upsert({
    where: { id: 'eredivisie' },
    update: {},
    create: {
      id: 'eredivisie',
      sportId: soccer.id,
      name: 'Eredivisie',
      country: 'Netherlands',
      tier: 1,
    },
  });

  const primeiraLiga = await prisma.league.upsert({
    where: { id: 'primeira-liga' },
    update: {},
    create: {
      id: 'primeira-liga',
      sportId: soccer.id,
      name: 'Primeira Liga',
      country: 'Portugal',
      tier: 1,
    },
  });

  const championship = await prisma.league.upsert({
    where: { id: 'championship' },
    update: {},
    create: {
      id: 'championship',
      sportId: soccer.id,
      name: 'Championship',
      country: 'England',
      tier: 2,
    },
  });

  const scottishPremiership = await prisma.league.upsert({
    where: { id: 'scottish-premiership' },
    update: {},
    create: {
      id: 'scottish-premiership',
      sportId: soccer.id,
      name: 'Scottish Premiership',
      country: 'Scotland',
      tier: 1,
    },
  });

  const belgianProLeague = await prisma.league.upsert({
    where: { id: 'belgian-pro-league' },
    update: {},
    create: {
      id: 'belgian-pro-league',
      sportId: soccer.id,
      name: 'Belgian Pro League',
      country: 'Belgium',
      tier: 1,
    },
  });

  const swissSuperLeague = await prisma.league.upsert({
    where: { id: 'swiss-super-league' },
    update: {},
    create: {
      id: 'swiss-super-league',
      sportId: soccer.id,
      name: 'Swiss Super League',
      country: 'Switzerland',
      tier: 1,
    },
  });

  const austrianBundesliga = await prisma.league.upsert({
    where: { id: 'austrian-bundesliga' },
    update: {},
    create: {
      id: 'austrian-bundesliga',
      sportId: soccer.id,
      name: 'Austrian Bundesliga',
      country: 'Austria',
      tier: 1,
    },
  });

  const turkishSuperLig = await prisma.league.upsert({
    where: { id: 'turkish-super-lig' },
    update: {},
    create: {
      id: 'turkish-super-lig',
      sportId: soccer.id,
      name: 'Turkish Super Lig',
      country: 'Turkey',
      tier: 1,
    },
  });

  const russianPremierLeague = await prisma.league.upsert({
    where: { id: 'russian-premier-league' },
    update: {},
    create: {
      id: 'russian-premier-league',
      sportId: soccer.id,
      name: 'Russian Premier League',
      country: 'Russia',
      tier: 1,
    },
  });

  const ukrainianPremierLeague = await prisma.league.upsert({
    where: { id: 'ukrainian-premier-league' },
    update: {},
    create: {
      id: 'ukrainian-premier-league',
      sportId: soccer.id,
      name: 'Ukrainian Premier League',
      country: 'Ukraine',
      tier: 1,
    },
  });

  const greekSuperLeague = await prisma.league.upsert({
    where: { id: 'greek-super-league' },
    update: {},
    create: {
      id: 'greek-super-league',
      sportId: soccer.id,
      name: 'Greek Super League',
      country: 'Greece',
      tier: 1,
    },
  });

  const danishSuperliga = await prisma.league.upsert({
    where: { id: 'danish-superliga' },
    update: {},
    create: {
      id: 'danish-superliga',
      sportId: soccer.id,
      name: 'Danish Superliga',
      country: 'Denmark',
      tier: 1,
    },
  });

  const norwegianEliteserien = await prisma.league.upsert({
    where: { id: 'norwegian-eliteserien' },
    update: {},
    create: {
      id: 'norwegian-eliteserien',
      sportId: soccer.id,
      name: 'Eliteserien',
      country: 'Norway',
      tier: 1,
    },
  });

  const swedishAllsvenskan = await prisma.league.upsert({
    where: { id: 'swedish-allsvenskan' },
    update: {},
    create: {
      id: 'swedish-allsvenskan',
      sportId: soccer.id,
      name: 'Allsvenskan',
      country: 'Sweden',
      tier: 1,
    },
  });

  const czechFirstLeague = await prisma.league.upsert({
    where: { id: 'czech-first-league' },
    update: {},
    create: {
      id: 'czech-first-league',
      sportId: soccer.id,
      name: 'Czech First League',
      country: 'Czech Republic',
      tier: 1,
    },
  });

  const polishEkstraklasa = await prisma.league.upsert({
    where: { id: 'polish-ekstraklasa' },
    update: {},
    create: {
      id: 'polish-ekstraklasa',
      sportId: soccer.id,
      name: 'Ekstraklasa',
      country: 'Poland',
      tier: 1,
    },
  });

  const croatianFirstLeague = await prisma.league.upsert({
    where: { id: 'croatian-first-league' },
    update: {},
    create: {
      id: 'croatian-first-league',
      sportId: soccer.id,
      name: 'Croatian First League',
      country: 'Croatia',
      tier: 1,
    },
  });

  const serbianSuperLiga = await prisma.league.upsert({
    where: { id: 'serbian-super-liga' },
    update: {},
    create: {
      id: 'serbian-super-liga',
      sportId: soccer.id,
      name: 'Serbian Super Liga',
      country: 'Serbia',
      tier: 1,
    },
  });

  const romanianLiga1 = await prisma.league.upsert({
    where: { id: 'romanian-liga-1' },
    update: {},
    create: {
      id: 'romanian-liga-1',
      sportId: soccer.id,
      name: 'Liga 1',
      country: 'Romania',
      tier: 1,
    },
  });

  const nba = await prisma.league.upsert({
    where: { id: 'nba' },
    update: {},
    create: {
      id: 'nba',
      sportId: basketball.id,
      name: 'NBA',
      country: 'USA',
      tier: 1,
    },
  });

  const mlb = await prisma.league.upsert({
    where: { id: 'mlb' },
    update: {},
    create: {
      id: 'mlb',
      sportId: baseball.id,
      name: 'MLB',
      country: 'USA',
      tier: 1,
    },
  });

  const atp = await prisma.league.upsert({
    where: { id: 'atp' },
    update: {},
    create: {
      id: 'atp',
      sportId: tennis.id,
      name: 'ATP Tour',
      country: 'International',
      tier: 1,
    },
  });

  // Create Teams
  const teams = await Promise.all([
    // Soccer - Premier League
    prisma.team.upsert({
      where: { id: 'liverpool' },
      update: {},
      create: {
        id: 'liverpool',
        leagueId: premierLeague.id,
        name: 'Liverpool FC',
        shortName: 'LIV',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'manchester-city' },
      update: {},
      create: {
        id: 'manchester-city',
        leagueId: premierLeague.id,
        name: 'Manchester City',
        shortName: 'MCI',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'manchester-utd' },
      update: {},
      create: {
        id: 'manchester-utd',
        leagueId: premierLeague.id,
        name: 'Manchester United',
        shortName: 'MUN',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'arsenal' },
      update: {},
      create: {
        id: 'arsenal',
        leagueId: premierLeague.id,
        name: 'Arsenal',
        shortName: 'ARS',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'chelsea' },
      update: {},
      create: {
        id: 'chelsea',
        leagueId: premierLeague.id,
        name: 'Chelsea',
        shortName: 'CHE',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'tottenham' },
      update: {},
      create: {
        id: 'tottenham',
        leagueId: premierLeague.id,
        name: 'Tottenham Hotspur',
        shortName: 'TOT',
        country: 'England',
      },
    }),
    // Soccer - La Liga
    prisma.team.upsert({
      where: { id: 'real-madrid' },
      update: {},
      create: {
        id: 'real-madrid',
        leagueId: laLiga.id,
        name: 'Real Madrid',
        shortName: 'RMA',
        country: 'Spain',
      },
    }),
    prisma.team.upsert({
      where: { id: 'barcelona' },
      update: {},
      create: {
        id: 'barcelona',
        leagueId: laLiga.id,
        name: 'FC Barcelona',
        shortName: 'BAR',
        country: 'Spain',
      },
    }),
    prisma.team.upsert({
      where: { id: 'atletico-madrid' },
      update: {},
      create: {
        id: 'atletico-madrid',
        leagueId: laLiga.id,
        name: 'Atletico Madrid',
        shortName: 'ATM',
        country: 'Spain',
      },
    }),
    // Soccer - Serie A (Italy)
    prisma.team.upsert({
      where: { id: 'juventus' },
      update: {},
      create: {
        id: 'juventus',
        leagueId: serieA.id,
        name: 'Juventus',
        shortName: 'JUV',
        country: 'Italy',
      },
    }),
    prisma.team.upsert({
      where: { id: 'inter-milan' },
      update: {},
      create: {
        id: 'inter-milan',
        leagueId: serieA.id,
        name: 'Inter Milan',
        shortName: 'INT',
        country: 'Italy',
      },
    }),
    prisma.team.upsert({
      where: { id: 'ac-milan' },
      update: {},
      create: {
        id: 'ac-milan',
        leagueId: serieA.id,
        name: 'AC Milan',
        shortName: 'ACM',
        country: 'Italy',
      },
    }),
    prisma.team.upsert({
      where: { id: 'napoli' },
      update: {},
      create: {
        id: 'napoli',
        leagueId: serieA.id,
        name: 'Napoli',
        shortName: 'NAP',
        country: 'Italy',
      },
    }),
    prisma.team.upsert({
      where: { id: 'roma' },
      update: {},
      create: {
        id: 'roma',
        leagueId: serieA.id,
        name: 'AS Roma',
        shortName: 'ROM',
        country: 'Italy',
      },
    }),
    prisma.team.upsert({
      where: { id: 'lazio' },
      update: {},
      create: {
        id: 'lazio',
        leagueId: serieA.id,
        name: 'Lazio',
        shortName: 'LAZ',
        country: 'Italy',
      },
    }),
    // Soccer - Bundesliga (Germany)
    prisma.team.upsert({
      where: { id: 'bayern-munich' },
      update: {},
      create: {
        id: 'bayern-munich',
        leagueId: bundesliga.id,
        name: 'Bayern Munich',
        shortName: 'BAY',
        country: 'Germany',
      },
    }),
    prisma.team.upsert({
      where: { id: 'borussia-dortmund' },
      update: {},
      create: {
        id: 'borussia-dortmund',
        leagueId: bundesliga.id,
        name: 'Borussia Dortmund',
        shortName: 'BVB',
        country: 'Germany',
      },
    }),
    prisma.team.upsert({
      where: { id: 'rb-leipzig' },
      update: {},
      create: {
        id: 'rb-leipzig',
        leagueId: bundesliga.id,
        name: 'RB Leipzig',
        shortName: 'RBL',
        country: 'Germany',
      },
    }),
    prisma.team.upsert({
      where: { id: 'bayer-leverkusen' },
      update: {},
      create: {
        id: 'bayer-leverkusen',
        leagueId: bundesliga.id,
        name: 'Bayer Leverkusen',
        shortName: 'LEV',
        country: 'Germany',
      },
    }),
    prisma.team.upsert({
      where: { id: 'eintracht-frankfurt' },
      update: {},
      create: {
        id: 'eintracht-frankfurt',
        leagueId: bundesliga.id,
        name: 'Eintracht Frankfurt',
        shortName: 'SGE',
        country: 'Germany',
      },
    }),
    // Soccer - Ligue 1 (France)
    prisma.team.upsert({
      where: { id: 'psg' },
      update: {},
      create: {
        id: 'psg',
        leagueId: ligue1.id,
        name: 'Paris Saint-Germain',
        shortName: 'PSG',
        country: 'France',
      },
    }),
    prisma.team.upsert({
      where: { id: 'marseille' },
      update: {},
      create: {
        id: 'marseille',
        leagueId: ligue1.id,
        name: 'Olympique Marseille',
        shortName: 'OM',
        country: 'France',
      },
    }),
    prisma.team.upsert({
      where: { id: 'lyon' },
      update: {},
      create: {
        id: 'lyon',
        leagueId: ligue1.id,
        name: 'Olympique Lyon',
        shortName: 'OL',
        country: 'France',
      },
    }),
    prisma.team.upsert({
      where: { id: 'monaco' },
      update: {},
      create: {
        id: 'monaco',
        leagueId: ligue1.id,
        name: 'AS Monaco',
        shortName: 'MON',
        country: 'Monaco',
      },
    }),
    prisma.team.upsert({
      where: { id: 'lille' },
      update: {},
      create: {
        id: 'lille',
        leagueId: ligue1.id,
        name: 'Lille OSC',
        shortName: 'LIL',
        country: 'France',
      },
    }),
    // Soccer - Eredivisie (Netherlands)
    prisma.team.upsert({
      where: { id: 'ajax' },
      update: {},
      create: {
        id: 'ajax',
        leagueId: eredivisie.id,
        name: 'Ajax',
        shortName: 'AJA',
        country: 'Netherlands',
      },
    }),
    prisma.team.upsert({
      where: { id: 'psv' },
      update: {},
      create: {
        id: 'psv',
        leagueId: eredivisie.id,
        name: 'PSV Eindhoven',
        shortName: 'PSV',
        country: 'Netherlands',
      },
    }),
    prisma.team.upsert({
      where: { id: 'feyenoord' },
      update: {},
      create: {
        id: 'feyenoord',
        leagueId: eredivisie.id,
        name: 'Feyenoord',
        shortName: 'FEY',
        country: 'Netherlands',
      },
    }),
    // Soccer - Primeira Liga (Portugal)
    prisma.team.upsert({
      where: { id: 'benfica' },
      update: {},
      create: {
        id: 'benfica',
        leagueId: primeiraLiga.id,
        name: 'Benfica',
        shortName: 'BEN',
        country: 'Portugal',
      },
    }),
    prisma.team.upsert({
      where: { id: 'porto' },
      update: {},
      create: {
        id: 'porto',
        leagueId: primeiraLiga.id,
        name: 'FC Porto',
        shortName: 'POR',
        country: 'Portugal',
      },
    }),
    prisma.team.upsert({
      where: { id: 'sporting-cp' },
      update: {},
      create: {
        id: 'sporting-cp',
        leagueId: primeiraLiga.id,
        name: 'Sporting CP',
        shortName: 'SCP',
        country: 'Portugal',
      },
    }),
    // Soccer - Championship (England)
    prisma.team.upsert({
      where: { id: 'leeds' },
      update: {},
      create: {
        id: 'leeds',
        leagueId: championship.id,
        name: 'Leeds United',
        shortName: 'LEE',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'leicester' },
      update: {},
      create: {
        id: 'leicester',
        leagueId: championship.id,
        name: 'Leicester City',
        shortName: 'LEI',
        country: 'England',
      },
    }),
    prisma.team.upsert({
      where: { id: 'sunderland' },
      update: {},
      create: {
        id: 'sunderland',
        leagueId: championship.id,
        name: 'Sunderland',
        shortName: 'SUN',
        country: 'England',
      },
    }),
    // Soccer - Scottish Premiership
    prisma.team.upsert({
      where: { id: 'celtic' },
      update: {},
      create: {
        id: 'celtic',
        leagueId: scottishPremiership.id,
        name: 'Celtic',
        shortName: 'CEL',
        country: 'Scotland',
      },
    }),
    prisma.team.upsert({
      where: { id: 'rangers' },
      update: {},
      create: {
        id: 'rangers',
        leagueId: scottishPremiership.id,
        name: 'Rangers',
        shortName: 'RAN',
        country: 'Scotland',
      },
    }),
    // Soccer - Belgian Pro League
    prisma.team.upsert({
      where: { id: 'club-brugge' },
      update: {},
      create: {
        id: 'club-brugge',
        leagueId: belgianProLeague.id,
        name: 'Club Brugge',
        shortName: 'BRU',
        country: 'Belgium',
      },
    }),
    prisma.team.upsert({
      where: { id: 'anderlecht' },
      update: {},
      create: {
        id: 'anderlecht',
        leagueId: belgianProLeague.id,
        name: 'Anderlecht',
        shortName: 'AND',
        country: 'Belgium',
      },
    }),
    // Soccer - Swiss Super League
    prisma.team.upsert({
      where: { id: 'young-boys' },
      update: {},
      create: {
        id: 'young-boys',
        leagueId: swissSuperLeague.id,
        name: 'Young Boys',
        shortName: 'YB',
        country: 'Switzerland',
      },
    }),
    prisma.team.upsert({
      where: { id: 'basel' },
      update: {},
      create: {
        id: 'basel',
        leagueId: swissSuperLeague.id,
        name: 'FC Basel',
        shortName: 'BAS',
        country: 'Switzerland',
      },
    }),
    // Soccer - Austrian Bundesliga
    prisma.team.upsert({
      where: { id: 'salzburg' },
      update: {},
      create: {
        id: 'salzburg',
        leagueId: austrianBundesliga.id,
        name: 'Red Bull Salzburg',
        shortName: 'SAL',
        country: 'Austria',
      },
    }),
    prisma.team.upsert({
      where: { id: 'rapid-wien' },
      update: {},
      create: {
        id: 'rapid-wien',
        leagueId: austrianBundesliga.id,
        name: 'Rapid Wien',
        shortName: 'RAP',
        country: 'Austria',
      },
    }),
    // Soccer - Turkish Super Lig
    prisma.team.upsert({
      where: { id: 'galatasaray' },
      update: {},
      create: {
        id: 'galatasaray',
        leagueId: turkishSuperLig.id,
        name: 'Galatasaray',
        shortName: 'GAL',
        country: 'Turkey',
      },
    }),
    prisma.team.upsert({
      where: { id: 'fenerbahce' },
      update: {},
      create: {
        id: 'fenerbahce',
        leagueId: turkishSuperLig.id,
        name: 'Fenerbahce',
        shortName: 'FEN',
        country: 'Turkey',
      },
    }),
    prisma.team.upsert({
      where: { id: 'besiktas' },
      update: {},
      create: {
        id: 'besiktas',
        leagueId: turkishSuperLig.id,
        name: 'Besiktas',
        shortName: 'BES',
        country: 'Turkey',
      },
    }),
    // Soccer - Russian Premier League
    prisma.team.upsert({
      where: { id: 'zenit' },
      update: {},
      create: {
        id: 'zenit',
        leagueId: russianPremierLeague.id,
        name: 'Zenit St. Petersburg',
        shortName: 'ZEN',
        country: 'Russia',
      },
    }),
    prisma.team.upsert({
      where: { id: 'spartak-moscow' },
      update: {},
      create: {
        id: 'spartak-moscow',
        leagueId: russianPremierLeague.id,
        name: 'Spartak Moscow',
        shortName: 'SPA',
        country: 'Russia',
      },
    }),
    // Soccer - Ukrainian Premier League
    prisma.team.upsert({
      where: { id: 'shakhtar' },
      update: {},
      create: {
        id: 'shakhtar',
        leagueId: ukrainianPremierLeague.id,
        name: 'Shakhtar Donetsk',
        shortName: 'SHA',
        country: 'Ukraine',
      },
    }),
    prisma.team.upsert({
      where: { id: 'dynamo-kyiv' },
      update: {},
      create: {
        id: 'dynamo-kyiv',
        leagueId: ukrainianPremierLeague.id,
        name: 'Dynamo Kyiv',
        shortName: 'DYN',
        country: 'Ukraine',
      },
    }),
    // Soccer - Greek Super League
    prisma.team.upsert({
      where: { id: 'olympiacos' },
      update: {},
      create: {
        id: 'olympiacos',
        leagueId: greekSuperLeague.id,
        name: 'Olympiacos',
        shortName: 'OLY',
        country: 'Greece',
      },
    }),
    prisma.team.upsert({
      where: { id: 'panathinaikos' },
      update: {},
      create: {
        id: 'panathinaikos',
        leagueId: greekSuperLeague.id,
        name: 'Panathinaikos',
        shortName: 'PAN',
        country: 'Greece',
      },
    }),
    // Soccer - Danish Superliga
    prisma.team.upsert({
      where: { id: 'copenhagen' },
      update: {},
      create: {
        id: 'copenhagen',
        leagueId: danishSuperliga.id,
        name: 'FC Copenhagen',
        shortName: 'FCK',
        country: 'Denmark',
      },
    }),
    // Soccer - Norwegian Eliteserien
    prisma.team.upsert({
      where: { id: 'rosenborg' },
      update: {},
      create: {
        id: 'rosenborg',
        leagueId: norwegianEliteserien.id,
        name: 'Rosenborg',
        shortName: 'ROS',
        country: 'Norway',
      },
    }),
    // Soccer - Swedish Allsvenskan
    prisma.team.upsert({
      where: { id: 'malmo-ff' },
      update: {},
      create: {
        id: 'malmo-ff',
        leagueId: swedishAllsvenskan.id,
        name: 'Malmo FF',
        shortName: 'MFF',
        country: 'Sweden',
      },
    }),
    // Soccer - Czech First League
    prisma.team.upsert({
      where: { id: 'sparta-prague' },
      update: {},
      create: {
        id: 'sparta-prague',
        leagueId: czechFirstLeague.id,
        name: 'Sparta Prague',
        shortName: 'SPA',
        country: 'Czech Republic',
      },
    }),
    prisma.team.upsert({
      where: { id: 'slavia-prague' },
      update: {},
      create: {
        id: 'slavia-prague',
        leagueId: czechFirstLeague.id,
        name: 'Slavia Prague',
        shortName: 'SLA',
        country: 'Czech Republic',
      },
    }),
    // Soccer - Polish Ekstraklasa
    prisma.team.upsert({
      where: { id: 'legia-warsaw' },
      update: {},
      create: {
        id: 'legia-warsaw',
        leagueId: polishEkstraklasa.id,
        name: 'Legia Warsaw',
        shortName: 'LEG',
        country: 'Poland',
      },
    }),
    // Soccer - Croatian First League
    prisma.team.upsert({
      where: { id: 'dinamo-zagreb' },
      update: {},
      create: {
        id: 'dinamo-zagreb',
        leagueId: croatianFirstLeague.id,
        name: 'Dinamo Zagreb',
        shortName: 'DIN',
        country: 'Croatia',
      },
    }),
    // Soccer - Serbian Super Liga
    prisma.team.upsert({
      where: { id: 'red-star' },
      update: {},
      create: {
        id: 'red-star',
        leagueId: serbianSuperLiga.id,
        name: 'Red Star Belgrade',
        shortName: 'RSB',
        country: 'Serbia',
      },
    }),
    prisma.team.upsert({
      where: { id: 'partizan' },
      update: {},
      create: {
        id: 'partizan',
        leagueId: serbianSuperLiga.id,
        name: 'Partizan Belgrade',
        shortName: 'PAR',
        country: 'Serbia',
      },
    }),
    // Soccer - Romanian Liga 1
    prisma.team.upsert({
      where: { id: 'steaua' },
      update: {},
      create: {
        id: 'steaua',
        leagueId: romanianLiga1.id,
        name: 'FCSB',
        shortName: 'FCS',
        country: 'Romania',
      },
    }),
    prisma.team.upsert({
      where: { id: 'cfr-cluj' },
      update: {},
      create: {
        id: 'cfr-cluj',
        leagueId: romanianLiga1.id,
        name: 'CFR Cluj',
        shortName: 'CFR',
        country: 'Romania',
      },
    }),
    // Basketball - NBA
    prisma.team.upsert({
      where: { id: 'lakers' },
      update: {},
      create: {
        id: 'lakers',
        leagueId: nba.id,
        name: 'Los Angeles Lakers',
        shortName: 'LAL',
        country: 'USA',
      },
    }),
    prisma.team.upsert({
      where: { id: 'celtics' },
      update: {},
      create: {
        id: 'celtics',
        leagueId: nba.id,
        name: 'Boston Celtics',
        shortName: 'BOS',
        country: 'USA',
      },
    }),
    prisma.team.upsert({
      where: { id: 'warriors' },
      update: {},
      create: {
        id: 'warriors',
        leagueId: nba.id,
        name: 'Golden State Warriors',
        shortName: 'GSW',
        country: 'USA',
      },
    }),
    prisma.team.upsert({
      where: { id: 'heat' },
      update: {},
      create: {
        id: 'heat',
        leagueId: nba.id,
        name: 'Miami Heat',
        shortName: 'MIA',
        country: 'USA',
      },
    }),
    // Baseball - MLB
    prisma.team.upsert({
      where: { id: 'yankees' },
      update: {},
      create: {
        id: 'yankees',
        leagueId: mlb.id,
        name: 'New York Yankees',
        shortName: 'NYY',
        country: 'USA',
      },
    }),
    prisma.team.upsert({
      where: { id: 'red-sox' },
      update: {},
      create: {
        id: 'red-sox',
        leagueId: mlb.id,
        name: 'Boston Red Sox',
        shortName: 'BOS',
        country: 'USA',
      },
    }),
    prisma.team.upsert({
      where: { id: 'dodgers' },
      update: {},
      create: {
        id: 'dodgers',
        leagueId: mlb.id,
        name: 'Los Angeles Dodgers',
        shortName: 'LAD',
        country: 'USA',
      },
    }),
  ]);

  console.log(`Created ${teams.length} teams`);

  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(15, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(20, 0, 0, 0);

  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  inThreeDays.setHours(18, 0, 0, 0);

  // Create Events
  const events = await Promise.all([
    // Liverpool matches (should show when Liverpool is favorited)
    prisma.event.upsert({
      where: { id: 'event-liverpool-mancity' },
      update: {},
      create: {
        id: 'event-liverpool-mancity',
        sportId: soccer.id,
        leagueId: premierLeague.id,
        homeId: 'liverpool',
        awayId: 'manchester-city',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Anfield',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-manutd-liverpool' },
      update: {},
      create: {
        id: 'event-manutd-liverpool',
        sportId: soccer.id,
        leagueId: premierLeague.id,
        homeId: 'manchester-utd',
        awayId: 'liverpool',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Old Trafford',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-liverpool-chelsea' },
      update: {},
      create: {
        id: 'event-liverpool-chelsea',
        sportId: soccer.id,
        leagueId: premierLeague.id,
        homeId: 'liverpool',
        awayId: 'chelsea',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'Anfield',
      },
    }),
    // Arsenal match (not Liverpool - should be filtered out)
    prisma.event.upsert({
      where: { id: 'event-arsenal-tottenham' },
      update: {},
      create: {
        id: 'event-arsenal-tottenham',
        sportId: soccer.id,
        leagueId: premierLeague.id,
        homeId: 'arsenal',
        awayId: 'tottenham',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Emirates Stadium',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-chelsea-mancity' },
      update: {},
      create: {
        id: 'event-chelsea-mancity',
        sportId: soccer.id,
        leagueId: premierLeague.id,
        homeId: 'chelsea',
        awayId: 'manchester-city',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Stamford Bridge',
      },
    }),
    // Real Madrid match (should show if Real Madrid is favorited)
    prisma.event.upsert({
      where: { id: 'event-real-barca' },
      update: {},
      create: {
        id: 'event-real-barca',
        sportId: soccer.id,
        leagueId: laLiga.id,
        homeId: 'real-madrid',
        awayId: 'barcelona',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Santiago Bernabeu',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-atletico-real' },
      update: {},
      create: {
        id: 'event-atletico-real',
        sportId: soccer.id,
        leagueId: laLiga.id,
        homeId: 'atletico-madrid',
        awayId: 'real-madrid',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'Metropolitano',
      },
    }),
    // Serie A matches (Italy)
    prisma.event.upsert({
      where: { id: 'event-juve-inter' },
      update: {},
      create: {
        id: 'event-juve-inter',
        sportId: soccer.id,
        leagueId: serieA.id,
        homeId: 'juventus',
        awayId: 'inter-milan',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Allianz Stadium',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-milan-napoli' },
      update: {},
      create: {
        id: 'event-milan-napoli',
        sportId: soccer.id,
        leagueId: serieA.id,
        homeId: 'ac-milan',
        awayId: 'napoli',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'San Siro',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-roma-lazio' },
      update: {},
      create: {
        id: 'event-roma-lazio',
        sportId: soccer.id,
        leagueId: serieA.id,
        homeId: 'roma',
        awayId: 'lazio',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'Stadio Olimpico',
      },
    }),
    // Bundesliga matches (Germany)
    prisma.event.upsert({
      where: { id: 'event-bayern-dortmund' },
      update: {},
      create: {
        id: 'event-bayern-dortmund',
        sportId: soccer.id,
        leagueId: bundesliga.id,
        homeId: 'bayern-munich',
        awayId: 'borussia-dortmund',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Allianz Arena',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-leipzig-leverkusen' },
      update: {},
      create: {
        id: 'event-leipzig-leverkusen',
        sportId: soccer.id,
        leagueId: bundesliga.id,
        homeId: 'rb-leipzig',
        awayId: 'bayer-leverkusen',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Red Bull Arena',
      },
    }),
    // Ligue 1 matches (France)
    prisma.event.upsert({
      where: { id: 'event-psg-marseille' },
      update: {},
      create: {
        id: 'event-psg-marseille',
        sportId: soccer.id,
        leagueId: ligue1.id,
        homeId: 'psg',
        awayId: 'marseille',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Parc des Princes',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-lyon-monaco' },
      update: {},
      create: {
        id: 'event-lyon-monaco',
        sportId: soccer.id,
        leagueId: ligue1.id,
        homeId: 'lyon',
        awayId: 'monaco',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Groupama Stadium',
      },
    }),
    // Eredivisie matches (Netherlands)
    prisma.event.upsert({
      where: { id: 'event-ajax-psv' },
      update: {},
      create: {
        id: 'event-ajax-psv',
        sportId: soccer.id,
        leagueId: eredivisie.id,
        homeId: 'ajax',
        awayId: 'psv',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Johan Cruyff Arena',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-feyenoord-ajax' },
      update: {},
      create: {
        id: 'event-feyenoord-ajax',
        sportId: soccer.id,
        leagueId: eredivisie.id,
        homeId: 'feyenoord',
        awayId: 'ajax',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'De Kuip',
      },
    }),
    // Primeira Liga matches (Portugal)
    prisma.event.upsert({
      where: { id: 'event-benfica-porto' },
      update: {},
      create: {
        id: 'event-benfica-porto',
        sportId: soccer.id,
        leagueId: primeiraLiga.id,
        homeId: 'benfica',
        awayId: 'porto',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Estadio da Luz',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-sporting-benfica' },
      update: {},
      create: {
        id: 'event-sporting-benfica',
        sportId: soccer.id,
        leagueId: primeiraLiga.id,
        homeId: 'sporting-cp',
        awayId: 'benfica',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Estadio Jose Alvalade',
      },
    }),
    // Scottish Premiership
    prisma.event.upsert({
      where: { id: 'event-celtic-rangers' },
      update: {},
      create: {
        id: 'event-celtic-rangers',
        sportId: soccer.id,
        leagueId: scottishPremiership.id,
        homeId: 'celtic',
        awayId: 'rangers',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Celtic Park',
      },
    }),
    // Turkish Super Lig
    prisma.event.upsert({
      where: { id: 'event-gala-fener' },
      update: {},
      create: {
        id: 'event-gala-fener',
        sportId: soccer.id,
        leagueId: turkishSuperLig.id,
        homeId: 'galatasaray',
        awayId: 'fenerbahce',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Rams Park',
      },
    }),
    // Belgian Pro League
    prisma.event.upsert({
      where: { id: 'event-brugge-anderlecht' },
      update: {},
      create: {
        id: 'event-brugge-anderlecht',
        sportId: soccer.id,
        leagueId: belgianProLeague.id,
        homeId: 'club-brugge',
        awayId: 'anderlecht',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'Jan Breydel Stadium',
      },
    }),
    // Austrian Bundesliga
    prisma.event.upsert({
      where: { id: 'event-salzburg-rapid' },
      update: {},
      create: {
        id: 'event-salzburg-rapid',
        sportId: soccer.id,
        leagueId: austrianBundesliga.id,
        homeId: 'salzburg',
        awayId: 'rapid-wien',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Red Bull Arena Salzburg',
      },
    }),
    // Championship (England)
    prisma.event.upsert({
      where: { id: 'event-leeds-leicester' },
      update: {},
      create: {
        id: 'event-leeds-leicester',
        sportId: soccer.id,
        leagueId: championship.id,
        homeId: 'leeds',
        awayId: 'leicester',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Elland Road',
      },
    }),
    // Greek Super League
    prisma.event.upsert({
      where: { id: 'event-olympiacos-pao' },
      update: {},
      create: {
        id: 'event-olympiacos-pao',
        sportId: soccer.id,
        leagueId: greekSuperLeague.id,
        homeId: 'olympiacos',
        awayId: 'panathinaikos',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'Karaiskakis Stadium',
      },
    }),
    // Serbian Super Liga
    prisma.event.upsert({
      where: { id: 'event-redstar-partizan' },
      update: {},
      create: {
        id: 'event-redstar-partizan',
        sportId: soccer.id,
        leagueId: serbianSuperLiga.id,
        homeId: 'red-star',
        awayId: 'partizan',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Rajko Mitic Stadium',
      },
    }),
    // NBA matches
    prisma.event.upsert({
      where: { id: 'event-lakers-warriors' },
      update: {},
      create: {
        id: 'event-lakers-warriors',
        sportId: basketball.id,
        leagueId: nba.id,
        homeId: 'lakers',
        awayId: 'warriors',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Crypto.com Arena',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-celtics-lakers' },
      update: {},
      create: {
        id: 'event-celtics-lakers',
        sportId: basketball.id,
        leagueId: nba.id,
        homeId: 'celtics',
        awayId: 'lakers',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'TD Garden',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-heat-celtics' },
      update: {},
      create: {
        id: 'event-heat-celtics',
        sportId: basketball.id,
        leagueId: nba.id,
        homeId: 'heat',
        awayId: 'celtics',
        startTimeUtc: inThreeDays,
        status: 'upcoming',
        venue: 'FTX Arena',
      },
    }),
    // MLB matches
    prisma.event.upsert({
      where: { id: 'event-yankees-redsox' },
      update: {},
      create: {
        id: 'event-yankees-redsox',
        sportId: baseball.id,
        leagueId: mlb.id,
        homeId: 'yankees',
        awayId: 'red-sox',
        startTimeUtc: tomorrow,
        status: 'upcoming',
        venue: 'Yankee Stadium',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-dodgers-yankees' },
      update: {},
      create: {
        id: 'event-dodgers-yankees',
        sportId: baseball.id,
        leagueId: mlb.id,
        homeId: 'dodgers',
        awayId: 'yankees',
        startTimeUtc: dayAfter,
        status: 'upcoming',
        venue: 'Dodger Stadium',
      },
    }),
    // Live events
    prisma.event.upsert({
      where: { id: 'event-live-arsenal-chelsea' },
      update: { status: 'live' },
      create: {
        id: 'event-live-arsenal-chelsea',
        sportId: soccer.id,
        leagueId: premierLeague.id,
        homeId: 'arsenal',
        awayId: 'chelsea',
        startTimeUtc: new Date(),
        status: 'live',
        venue: 'Emirates Stadium',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-live-heat-celtics' },
      update: { status: 'live' },
      create: {
        id: 'event-live-heat-celtics',
        sportId: basketball.id,
        leagueId: nba.id,
        homeId: 'heat',
        awayId: 'celtics',
        startTimeUtc: new Date(),
        status: 'live',
        venue: 'FTX Arena',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-live-yankees-redsox' },
      update: { status: 'live' },
      create: {
        id: 'event-live-yankees-redsox',
        sportId: baseball.id,
        leagueId: mlb.id,
        homeId: 'yankees',
        awayId: 'red-sox',
        startTimeUtc: new Date(),
        status: 'live',
        venue: 'Yankee Stadium',
      },
    }),
  ]);

  console.log(`Created ${events.length} events`);

  // Get test user to create favorites
  const testUser = await prisma.user.findFirst({
    where: { email: 'test_free_user@example.com' },
  });

  if (testUser) {
    // Create favorites for the test user
    await prisma.favorite.deleteMany({
      where: { userId: testUser.id },
    });

    const favorites = await Promise.all([
      prisma.favorite.create({
        data: {
          userId: testUser.id,
          entityType: 'team',
          entityId: 'liverpool',
        },
      }),
      prisma.favorite.create({
        data: {
          userId: testUser.id,
          entityType: 'team',
          entityId: 'lakers',
        },
      }),
      prisma.favorite.create({
        data: {
          userId: testUser.id,
          entityType: 'team',
          entityId: 'real-madrid',
        },
      }),
      prisma.favorite.create({
        data: {
          userId: testUser.id,
          entityType: 'team',
          entityId: 'yankees',
        },
      }),
    ]);

    console.log(`Created ${favorites.length} favorites for test user`);
  } else {
    console.log('Test user not found, skipping favorites creation');
  }

  // Create League Standings
  const currentYear = new Date().getFullYear();
  const season = `${currentYear - 1}-${currentYear}`;

  // Premier League Standings
  const plStandings = [
    { teamId: 'liverpool', position: 1, played: 21, won: 14, drawn: 5, lost: 2, goalsFor: 48, goalsAgainst: 18, goalDifference: 30, points: 47, form: 'WWDWW' },
    { teamId: 'arsenal', position: 2, played: 21, won: 13, drawn: 5, lost: 3, goalsFor: 42, goalsAgainst: 21, goalDifference: 21, points: 44, form: 'WDWWL' },
    { teamId: 'manchester-city', position: 3, played: 21, won: 12, drawn: 6, lost: 3, goalsFor: 45, goalsAgainst: 22, goalDifference: 23, points: 42, form: 'DDWWW' },
    { teamId: 'chelsea', position: 4, played: 21, won: 11, drawn: 6, lost: 4, goalsFor: 40, goalsAgainst: 25, goalDifference: 15, points: 39, form: 'WDWDL' },
    { teamId: 'tottenham', position: 5, played: 21, won: 10, drawn: 5, lost: 6, goalsFor: 38, goalsAgainst: 28, goalDifference: 10, points: 35, form: 'LWWDW' },
    { teamId: 'manchester-utd', position: 6, played: 21, won: 9, drawn: 6, lost: 6, goalsFor: 32, goalsAgainst: 26, goalDifference: 6, points: 33, form: 'DWLDW' },
  ];

  for (const standing of plStandings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'premier-league',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'premier-league',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${plStandings.length} Premier League standings entries`);

  // La Liga Standings
  const laLigaStandings = [
    { teamId: 'real-madrid', position: 1, played: 20, won: 14, drawn: 4, lost: 2, goalsFor: 42, goalsAgainst: 15, goalDifference: 27, points: 46, form: 'WWWDW' },
    { teamId: 'barcelona', position: 2, played: 20, won: 13, drawn: 5, lost: 2, goalsFor: 45, goalsAgainst: 20, goalDifference: 25, points: 44, form: 'DWWWW' },
    { teamId: 'atletico-madrid', position: 3, played: 20, won: 11, drawn: 6, lost: 3, goalsFor: 35, goalsAgainst: 18, goalDifference: 17, points: 39, form: 'WDDWL' },
  ];

  for (const standing of laLigaStandings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'la-liga',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'la-liga',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${laLigaStandings.length} La Liga standings entries`);

  // Serie A Standings
  const serieAStandings = [
    { teamId: 'inter-milan', position: 1, played: 20, won: 15, drawn: 3, lost: 2, goalsFor: 48, goalsAgainst: 15, goalDifference: 33, points: 48, form: 'WWWWW' },
    { teamId: 'napoli', position: 2, played: 20, won: 13, drawn: 5, lost: 2, goalsFor: 40, goalsAgainst: 18, goalDifference: 22, points: 44, form: 'WDWWW' },
    { teamId: 'juventus', position: 3, played: 20, won: 11, drawn: 7, lost: 2, goalsFor: 35, goalsAgainst: 16, goalDifference: 19, points: 40, form: 'WDDWD' },
    { teamId: 'ac-milan', position: 4, played: 20, won: 10, drawn: 6, lost: 4, goalsFor: 32, goalsAgainst: 20, goalDifference: 12, points: 36, form: 'WDLWW' },
    { teamId: 'roma', position: 5, played: 20, won: 9, drawn: 5, lost: 6, goalsFor: 28, goalsAgainst: 22, goalDifference: 6, points: 32, form: 'LWWDL' },
    { teamId: 'lazio', position: 6, played: 20, won: 8, drawn: 6, lost: 6, goalsFor: 30, goalsAgainst: 25, goalDifference: 5, points: 30, form: 'DWLDW' },
  ];

  for (const standing of serieAStandings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'serie-a',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'serie-a',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${serieAStandings.length} Serie A standings entries`);

  // Bundesliga Standings
  const bundesligaStandings = [
    { teamId: 'bayer-leverkusen', position: 1, played: 18, won: 15, drawn: 3, lost: 0, goalsFor: 50, goalsAgainst: 16, goalDifference: 34, points: 48, form: 'WWWWW' },
    { teamId: 'bayern-munich', position: 2, played: 18, won: 13, drawn: 2, lost: 3, goalsFor: 52, goalsAgainst: 22, goalDifference: 30, points: 41, form: 'WDWWL' },
    { teamId: 'borussia-dortmund', position: 3, played: 18, won: 10, drawn: 5, lost: 3, goalsFor: 40, goalsAgainst: 25, goalDifference: 15, points: 35, form: 'DWWDW' },
    { teamId: 'rb-leipzig', position: 4, played: 18, won: 10, drawn: 3, lost: 5, goalsFor: 38, goalsAgainst: 24, goalDifference: 14, points: 33, form: 'LWWWW' },
    { teamId: 'eintracht-frankfurt', position: 5, played: 18, won: 8, drawn: 5, lost: 5, goalsFor: 32, goalsAgainst: 26, goalDifference: 6, points: 29, form: 'WDWLD' },
  ];

  for (const standing of bundesligaStandings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'bundesliga',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'bundesliga',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${bundesligaStandings.length} Bundesliga standings entries`);

  // Ligue 1 Standings
  const ligue1Standings = [
    { teamId: 'psg', position: 1, played: 19, won: 14, drawn: 3, lost: 2, goalsFor: 48, goalsAgainst: 18, goalDifference: 30, points: 45, form: 'WWWDW' },
    { teamId: 'monaco', position: 2, played: 19, won: 11, drawn: 5, lost: 3, goalsFor: 38, goalsAgainst: 22, goalDifference: 16, points: 38, form: 'DWWWL' },
    { teamId: 'lille', position: 3, played: 19, won: 10, drawn: 6, lost: 3, goalsFor: 32, goalsAgainst: 18, goalDifference: 14, points: 36, form: 'WDWWD' },
    { teamId: 'marseille', position: 4, played: 19, won: 9, drawn: 5, lost: 5, goalsFor: 30, goalsAgainst: 24, goalDifference: 6, points: 32, form: 'LWDWW' },
    { teamId: 'lyon', position: 5, played: 19, won: 8, drawn: 6, lost: 5, goalsFor: 28, goalsAgainst: 22, goalDifference: 6, points: 30, form: 'DWDWL' },
  ];

  for (const standing of ligue1Standings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'ligue-1',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'ligue-1',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${ligue1Standings.length} Ligue 1 standings entries`);

  // Eredivisie Standings
  const eredivisieStandings = [
    { teamId: 'psv', position: 1, played: 18, won: 16, drawn: 1, lost: 1, goalsFor: 58, goalsAgainst: 15, goalDifference: 43, points: 49, form: 'WWWWW' },
    { teamId: 'feyenoord', position: 2, played: 18, won: 12, drawn: 3, lost: 3, goalsFor: 42, goalsAgainst: 20, goalDifference: 22, points: 39, form: 'WWDWL' },
    { teamId: 'ajax', position: 3, played: 18, won: 10, drawn: 4, lost: 4, goalsFor: 38, goalsAgainst: 22, goalDifference: 16, points: 34, form: 'WLWWD' },
  ];

  for (const standing of eredivisieStandings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'eredivisie',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'eredivisie',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${eredivisieStandings.length} Eredivisie standings entries`);

  // Primeira Liga Standings
  const primeiraLigaStandings = [
    { teamId: 'sporting-cp', position: 1, played: 17, won: 15, drawn: 1, lost: 1, goalsFor: 45, goalsAgainst: 10, goalDifference: 35, points: 46, form: 'WWWWW' },
    { teamId: 'benfica', position: 2, played: 17, won: 12, drawn: 3, lost: 2, goalsFor: 38, goalsAgainst: 15, goalDifference: 23, points: 39, form: 'WDWWL' },
    { teamId: 'porto', position: 3, played: 17, won: 11, drawn: 4, lost: 2, goalsFor: 35, goalsAgainst: 14, goalDifference: 21, points: 37, form: 'DWWWD' },
  ];

  for (const standing of primeiraLigaStandings) {
    await prisma.standing.upsert({
      where: {
        leagueId_teamId_season: {
          leagueId: 'primeira-liga',
          teamId: standing.teamId,
          season: season,
        },
      },
      update: {
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
      create: {
        leagueId: 'primeira-liga',
        teamId: standing.teamId,
        season: season,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
        form: standing.form,
      },
    });
  }
  console.log(`Created ${primeiraLigaStandings.length} Primeira Liga standings entries`);

  // Create Bookmakers
  const bookmakerData = [
    {
      key: 'bet365',
      brand: 'Bet365',
      regions: JSON.stringify(['UK', 'EU', 'APAC']),
      licenseJurisdictions: JSON.stringify(['UK', 'Gibraltar']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://www.bet365.com/#/AC/B{sport}/C{event}/',
        default: 'https://www.bet365.com/',
      }),
    },
    {
      key: 'william_hill',
      brand: 'William Hill',
      regions: JSON.stringify(['UK', 'EU']),
      licenseJurisdictions: JSON.stringify(['UK', 'Gibraltar']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://sports.williamhill.com/betting/{sport}/{event}',
        default: 'https://www.williamhill.com/',
      }),
    },
    {
      key: 'betfair',
      brand: 'Betfair',
      regions: JSON.stringify(['UK', 'EU', 'APAC']),
      licenseJurisdictions: JSON.stringify(['UK', 'Malta']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://www.betfair.com/sport/{sport}/{event}',
        default: 'https://www.betfair.com/',
      }),
    },
    {
      key: 'unibet',
      brand: 'Unibet',
      regions: JSON.stringify(['EU', 'APAC']),
      licenseJurisdictions: JSON.stringify(['Malta', 'Sweden']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://www.unibet.com/betting/sports/event/{event}',
        default: 'https://www.unibet.com/',
      }),
    },
    {
      key: 'superbet',
      brand: 'Superbet',
      regions: JSON.stringify(['EU', 'Romania', 'Poland']),
      licenseJurisdictions: JSON.stringify(['Romania', 'Poland', 'Malta']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://superbet.com/sports/{sport}/event/{event}',
        default: 'https://www.superbet.com/',
      }),
    },
    {
      key: 'betano',
      brand: 'Betano',
      regions: JSON.stringify(['EU', 'LATAM', 'Romania', 'Portugal', 'Germany']),
      licenseJurisdictions: JSON.stringify(['Malta', 'Romania', 'Portugal', 'Germany']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://www.betano.com/sport/{sport}/event/{event}',
        default: 'https://www.betano.com/',
      }),
    },
    {
      key: 'stake',
      brand: 'Stake',
      regions: JSON.stringify(['Global', 'APAC', 'LATAM']),
      licenseJurisdictions: JSON.stringify(['Curacao']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://stake.com/sports/{sport}/{event}',
        default: 'https://www.stake.com/',
      }),
    },
    {
      key: 'paddy_power',
      brand: 'Paddy Power',
      regions: JSON.stringify(['UK', 'IE']),
      licenseJurisdictions: JSON.stringify(['UK', 'Ireland']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://www.paddypower.com/sport/{sport}/{event}',
        default: 'https://www.paddypower.com/',
      }),
    },
    {
      key: 'ladbrokes',
      brand: 'Ladbrokes',
      regions: JSON.stringify(['UK', 'EU']),
      licenseJurisdictions: JSON.stringify(['UK', 'Gibraltar']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://sports.ladbrokes.com/sport/{sport}/event/{event}',
        default: 'https://www.ladbrokes.com/',
      }),
    },
    {
      key: '888sport',
      brand: '888sport',
      regions: JSON.stringify(['UK', 'EU']),
      licenseJurisdictions: JSON.stringify(['UK', 'Gibraltar', 'Malta']),
      deepLinkTemplates: JSON.stringify({
        event: 'https://www.888sport.com/sport/{sport}/event/{event}',
        default: 'https://www.888sport.com/',
      }),
    },
  ];

  for (const bm of bookmakerData) {
    await prisma.bookmaker.upsert({
      where: { key: bm.key },
      update: {
        brand: bm.brand,
        regions: bm.regions,
        licenseJurisdictions: bm.licenseJurisdictions,
        deepLinkTemplates: bm.deepLinkTemplates,
      },
      create: bm,
    });
  }
  console.log(`Created ${bookmakerData.length} bookmakers`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
