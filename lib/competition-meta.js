const EFOOTBALL_OWN_OFFICIAL = new Set([
  'ef-comp-01',
  'ef-comp-02',
  'ef-comp-03',
  'ef-comp-04',
  'ef-comp-05',
  'ef-comp-06',
  'ef-relampago-pro',
  'ef-relampago-evolution',
  'ef-relampago-elite',
  'ef-relampago-crystal',
  'ef-relampago-champions',
  'ef-relampago-impact',
  'ef-relampago-bruno-fernandes',
]);

const GENERIC_GROUPS = new Set([
  'fcm-comp-08', 'fcm-comp-09', 'fcm-comp-15', 'fcm-comp-18',
  'ef-comp-01', 'ef-comp-02', 'ef-comp-03',
]);

function competitionMeta(competitionId, tournament = {}) {
  const id = String(competitionId || tournament.competitionId || tournament.competition_id || '').trim();
  const mode = String(tournament.mode || tournament.estructura_defecto || '').trim();
  const meta = {};

  if (EFOOTBALL_OWN_OFFICIAL.has(id)) {
    meta.officialCup = true;
    meta.efootballOfficial = true;
  }
  if (id.startsWith('ef-relampago-')) meta.singleLeg = true;
  if (GENERIC_GROUPS.has(id)) meta.groupLegs = 1;

  const official = id.match(/^(?:fcm|ef)-official-(.+)$/);
  if (official) {
    const slug = official[1];
    meta.officialCup = true;
    meta.officialFormatSlug = slug;

    if (mode === 'groups' || [
      'copa-del-mundo', 'copa-libertadores', 'eurocopa', 'copa-america', 'mundial-de-clubes'
    ].includes(slug)) {
      meta.groupLegs = 1;
      meta.bestThirdCount = slug === 'copa-del-mundo' ? 8 : slug === 'eurocopa' ? 4 : 0;
    }
    if (slug === 'uefa-champions-league') meta.leagueStageMatches = 8;
    if (slug === 'liga-1-peru') {
      meta.leagueLegs = 1;
      meta.playoffCount = 4;
    }
    if (['premier-league', 'laliga', 'bundesliga', 'serie-a'].includes(slug)) meta.leagueLegs = 1;
  }

  if (mode === 'league' || mode === 'league_playoffs') {
    meta.pointsWin = 3;
    meta.pointsDraw = 1;
    meta.pointsLoss = 0;
  }

  return meta;
}

module.exports = { competitionMeta };
