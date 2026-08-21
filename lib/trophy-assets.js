const DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

const TROPHY_ASSETS = Object.freeze({
  // Compartidas / competiciones oficiales
  '1TemYZovXiYTVlmIrjfUuRkfJUM17h1bF': '/assets/cups/official/bundesliga.avif',
  '1VOujsEv-xNBARpo6YT9WZ3OdWtJJ-npP': '/assets/cups/official/copa-america.avif',
  '1qrc0eEl-iWOJwmMV-GaSOf8p4-wl48BH': '/assets/cups/official/copa-del-mundo.avif',
  '1uvt3zow0FdsMlcv1Pj5Ft1YBuMcO8kcr': '/assets/cups/official/copa-del-rey.avif',
  '1qxtF8cqOWi5QB7VHFHQq6mo_iJ2xLOVn': '/assets/cups/official/copa-libertadores.avif',
  '1XWaNruofc8d2vhh0BFy7r2i6ss8JJmD-': '/assets/cups/official/dfb-pokal.avif',
  '1PpZRkiwMarGJ6lFQBWE-5Q5ME5H7WNUn': '/assets/cups/official/eurocopa.avif',
  '1au-l9IYTDpOskiywi4UfzAFgaI1_iYmS': '/assets/cups/official/laliga.avif',
  '1Q0DqAVDUIQ-kAZAnBMdI4FpTs5rdAlfO': '/assets/cups/official/liga-1-peru.avif',
  '1xJ2ww6yBl71MriwQXbQZF9hyaABXTz1A': '/assets/cups/official/mundial-de-clubes.avif',
  '1njxgoEErEEI0-1XUYPbt3w74Hwuhyl-M': '/assets/cups/official/premier-league.avif',
  '1MxHTDiaxvv4Wl4FG6T7GLqw4WjL8-XwW': '/assets/cups/official/serie-a.avif',
  '19LFKqVu5yx6qON9j4EMB5hxYU-FjvEvt': '/assets/cups/official/uefa-champions-league.avif',

  // FC Mobile · portadas
  '1gSVwwP5AgQ7ItHc2wsOTe4QCCPed6R1C': '/assets/cups/fc-mobile/exclusivas/fc-mobile-cup-pro.avif',
  '1KcwnypNjqalni-BvUSFWbf7JlsXyMuTp': '/assets/cups/fc-mobile/exclusivas/fc-mobile-cup-elite.avif',
  '19ptdnAX43cwWdJtxQ5-xXEkuXQYxS6i6': '/assets/cups/fc-mobile/portadas/gmac-7.avif',
  '15JZ0P9d6_Pr-tEQV7aa8sQAfR-5yyRhv': '/assets/cups/fc-mobile/portadas/gmac-8.avif',
  '1MW7HtnQb7pMhGRWuC7o0EqOqyDmgx1NB': '/assets/cups/fc-mobile/portadas/gmac-9.avif',
  '1P1msRot_5b1Ss1x6x15f7I1ntpAQMGFo': '/assets/cups/fc-mobile/portadas/gmac-10.avif',
  '1t0DvkxnK4u38itZMIKVqvz4EKL9v_XOn': '/assets/cups/fc-mobile/portadas/gmac-11.avif',
  '1zZkmfVP04-6v4MVmoljzOETjcuVeUEcg': '/assets/cups/fc-mobile/portadas/gmac-12.avif',
  '1Gy-AParcuq4PAQAi7HGU1C7Z9hOrtggd': '/assets/cups/fc-mobile/portadas/gmac-13.avif',
  '1si41WuQgB68_SRpNW-qCrCTFQCt3BeuV': '/assets/cups/fc-mobile/portadas/gmac-14.avif',
  '15u2j4oyDu4onS9blkx95dtyiB03mymMW': '/assets/cups/fc-mobile/portadas/gmac-15.avif',
  '1-bggqNPsfDyfrYMaWAkK3vbaZzd1_uGo': '/assets/cups/fc-mobile/portadas/gmac-16.avif',
  '1ErKL91dEkdZSBjKfcGh5a3nMTH4F2DQf': '/assets/cups/fc-mobile/portadas/gmac-17.avif',
  '1InvDQWBkbTeAz2h5HvqtlJ5M5gb9tbuu': '/assets/cups/fc-mobile/portadas/gmac-18.avif',

  // FC Mobile · fixture
  '1QXbWQiyXH5ERX-gLIbM1xMSF1EMJa1pE': '/assets/cups/fc-mobile/fixture/gmac-7-minimalista.avif',
  '1wlMxleUbJCg6Rszj_DmDx0GkVoKJmyfB': '/assets/cups/fc-mobile/fixture/gmac-8-minimalista.avif',
  '1UfuDFttXcDXiI2N6ktDP8nb_ZKPiKZCG': '/assets/cups/fc-mobile/fixture/gmac-9-minimalista.avif',
  '1S828Qtciqz9X40_iC0t9KOqJIeEfys_T': '/assets/cups/fc-mobile/fixture/gmac-10-minimalista.avif',
  '1ZLrfVEGBziB2Fx0LWKW00D6Ur97Kii3Y': '/assets/cups/fc-mobile/fixture/gmac-11-minimalista.avif',
  '1qw-ipgZ5NpctMcztQylW6aLBdTtIDR5p': '/assets/cups/fc-mobile/fixture/gmac-12-minimalista.avif',
  '1AexpyMgLSSthJM-F1S1v9zTSDecU6Foi': '/assets/cups/fc-mobile/fixture/gmac-13-minimalista.avif',
  '19jBKt-8kr3pEUZqRPkjSNWhgjBiFlIzd': '/assets/cups/fc-mobile/fixture/gmac-14-minimalista.avif',
  '1DSBQ2fEyuO5O_qhP0fVq2Du87CH0yByT': '/assets/cups/fc-mobile/fixture/gmac-15-minimalista.avif',
  '1oQcgzJy13DU3EQV1IEABjMEBtMNB-psB': '/assets/cups/fc-mobile/fixture/gmac-16-minimalista.avif',
  '1uqHx3ZDBA5O9qdmsolXYPjUZ7A0efBTb': '/assets/cups/fc-mobile/fixture/gmac-17-minimalista.avif',
  '1SKHX8sBJjYjhDxoFCEmcErlXg5rYj1Vn': '/assets/cups/fc-mobile/fixture/gmac-18-minimalista.avif',

  // eFootball · portadas
  '1aG0HJAFbnEtCbGSeQzIObIDrF8dtUcTQ': '/assets/cups/efootball/portadas/oficial-1.avif',
  '1krhEK7bYe7gud5tzFFS52qqHfJrhM034': '/assets/cups/efootball/portadas/oficial-2.avif',
  '154Kjtl71DwYOd7frr2KQcczqaoxziDDT': '/assets/cups/efootball/portadas/oficial-3.avif',
  '1GVJdJGhuRWdrRNnAgSObPCWIRnQq3QEn': '/assets/cups/efootball/portadas/oficial-4.avif',
  '1hSGgF7PsivwsHc5aI88592P5GgBKvzEM': '/assets/cups/efootball/portadas/oficial-5.avif',
  '1Ba3CuLw_wpYy8Nwj_ID1OT2GQQCT4D7J': '/assets/cups/efootball/portadas/oficial-6.avif',
  '18L50z8TNf2QA0glTCED2eaFS5_skOeKI': '/assets/cups/efootball/relampagos-oficiales/pro-cup.avif',
  '1hdSnG5bV5KFsOiltQlaS_RcK7demah4C': '/assets/cups/efootball/relampagos-oficiales/evolution-cup.avif',
  '1OqFinQBUkceFHBuFuJDL5i-Dy2Z1Ft5o': '/assets/cups/efootball/relampagos-oficiales/elite-cup.avif',
  '10WTKTJFolktTxoj8zFPyqaATF_RIaCrl': '/assets/cups/efootball/relampagos-oficiales/crystal-cup.avif',
  '1unvMWIUbcAf3AGE6H6gdJqAxgd4FE9Ib': '/assets/cups/efootball/relampagos-oficiales/champions-cup.avif',
  '1y7jbyussbnGr9N7Y0Kdjh6CHehGcJufr': '/assets/cups/efootball/relampagos-oficiales/impact-cup.avif',
  '1P5yqdZvVwHHU-D0spoKvp9zH3i4kYBJ-': '/assets/cups/efootball/relampagos-oficiales/cup-bruno-fernandes.avif',

  // eFootball · fixture
  '1YZKE3pgx9mauEu221UrJHmoQBshRgp5-': '/assets/cups/efootball/fixture/oficial-1-minimalista.avif',
  '1h0BEYh4FWf4DHVcUXXJkQb-SNlkyjS7L': '/assets/cups/efootball/fixture/oficial-2-minimalista.avif',
  '17JkBqJrakB4K0Oknwt0eoegQKHAcN2Rk': '/assets/cups/efootball/fixture/oficial-3-minimalista.avif',
  '1ok-RfEN8QC6n1WhKZPFCOtEUh5UPHbAT': '/assets/cups/efootball/fixture/oficial-4-minimalista.avif',
  '1JvVRuSgSokWTR0kWvDqaofDmUVUirlP6': '/assets/cups/efootball/fixture/oficial-5-minimalista.avif',
  '1Nm7puMNgv0Cek3CJpqi0dthP5cW3AOYl': '/assets/cups/efootball/fixture/oficial-6-minimalista.avif'
});

function driveId(value) {
  const text = String(value || '').trim();
  if (DRIVE_ID_RE.test(text) && !text.includes('http')) return text;
  const query = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (query) return query[1];
  const path = text.match(/\/d\/([A-Za-z0-9_-]+)/);
  return path ? path[1] : '';
}

function localCupPath(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('/assets/cups/')) return text;
  if (text.startsWith('assets/cups/')) return `/${text}`;
  const id = driveId(text);
  return id ? (TROPHY_ASSETS[id] || '') : '';
}

function trophyUrl(value) {
  const text = String(value || '').trim();
  const local = localCupPath(text);
  if (local) return local;
  const id = driveId(text);
  return id ? `/media/trophy/${encodeURIComponent(id)}` : text;
}

module.exports = { DRIVE_ID_RE, TROPHY_ASSETS, driveId, localCupPath, trophyUrl };
