(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { tournaments: [], competitions: [], selected: null, snapshot: null };

  const els = {
    loginScreen: $('loginScreen'), dashboard: $('dashboard'), loginForm: $('loginForm'), adminSecret: $('adminSecret'), loginMessage: $('loginMessage'),
    logoutBtn: $('logoutBtn'), refreshBtn: $('refreshBtn'), connectionBadge: $('connectionBadge'), tournamentSelect: $('tournamentSelect'), competitionSelect: $('competitionSelect'),
    tournamentSummary: $('tournamentSummary'), publicTournamentLink: $('publicTournamentLink'), actionMessage: $('actionMessage'), createMessage: $('createMessage'), finalizeMessage: $('finalizeMessage'),
    activateBtn: $('activateBtn'), openRegsBtn: $('openRegsBtn'), closeRegsBtn: $('closeRegsBtn'), prepareFixtureBtn: $('prepareFixtureBtn'), generateCodesBtn: $('generateCodesBtn'), exportCodesBtn: $('exportCodesBtn'),
    codesBody: $('codesBody'), registrationsBody: $('registrationsBody'), matchesGrid: $('matchesGrid'), registrationCount: $('registrationCount'), matchCount: $('matchCount'),
    kpiTournaments: $('kpiTournaments'), kpiCurrent: $('kpiCurrent'), kpiCurrentName: $('kpiCurrentName'), kpiRegistrations: $('kpiRegistrations'), kpiSlots: $('kpiSlots'), kpiMatches: $('kpiMatches'),
    createTournamentForm: $('createTournamentForm'), createSlots: $('createSlots'), createDate: $('createDate'), createTime: $('createTime'), createEntry: $('createEntry'), createPrizeFirst: $('createPrizeFirst'), createPrizeSecond: $('createPrizeSecond'),
    finalizeForm: $('finalizeForm'), finalWinner: $('finalWinner'), finalRunner: $('finalRunner')
  };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const upper = (v) => String(v || '').trim().toUpperCase();
  const setMessage = (el, message = '', ok = false) => { el.textContent = message; el.className = `inline-status ${message ? (ok ? 'ok' : 'error') : ''}`; };
  const setLoginMessage = (message = '', ok = false) => { els.loginMessage.textContent = message; els.loginMessage.className = `form-message ${message ? (ok ? 'ok' : 'error') : ''}`; };

  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (response.status === 401) {
      showLogin();
      throw new Error(data.message || 'Sesión expirada.');
    }
    if (!response.ok || data.ok === false) throw new Error(data.message || `Error ${response.status}`);
    return data;
  }

  async function adminAction(action, payload = {}) {
    return request(`/api/admin/${encodeURIComponent(action)}`, { method: 'POST', body: JSON.stringify(payload) });
  }

  function showLogin() {
    els.dashboard.classList.add('hidden');
    els.loginScreen.classList.remove('hidden');
    els.adminSecret.value = '';
  }

  function showDashboard() {
    els.loginScreen.classList.add('hidden');
    els.dashboard.classList.remove('hidden');
  }

  async function checkSession() {
    try {
      const data = await request('/api/admin-auth', { method: 'GET' });
      if (data.authenticated) { showDashboard(); await loadAll(); }
      else showLogin();
    } catch (_) { showLogin(); }
  }

  async function login(event) {
    event.preventDefault(); setLoginMessage('Comprobando…');
    try {
      const data = await request('/api/admin-auth', { method: 'POST', body: JSON.stringify({ secret: els.adminSecret.value }) });
      setLoginMessage(data.message || 'Acceso correcto.', true); showDashboard(); await loadAll();
    } catch (error) { setLoginMessage(error.message); }
  }

  async function logout() {
    try { await request('/api/admin-auth', { method: 'DELETE' }); } catch (_) {}
    state.selected = null; state.snapshot = null; showLogin();
  }

  async function loadAll() {
    els.connectionBadge.className = 'connection-badge'; els.connectionBadge.innerHTML = '<span></span> Conectando';
    try {
      const [fcm, ef, cfcm, cef] = await Promise.all([
        request('/api/tournaments?game=fc-mobile'), request('/api/tournaments?game=efootball'), request('/api/competitions?game=fc-mobile'), request('/api/competitions?game=efootball')
      ]);
      state.tournaments = [...(fcm.tournaments || []), ...(ef.tournaments || [])];
      state.competitions = [...(cfcm.competitions || []), ...(cef.competitions || [])];
      renderSelectors(); renderGlobalKpis();
      els.connectionBadge.className = 'connection-badge online'; els.connectionBadge.innerHTML = '<span></span> Sheets conectado';
      const current = state.tournaments.find((t) => upper(t.status) === 'VIGENTE');
      const preferred = state.selected?.id || current?.id || state.tournaments[0]?.id || '';
      if (preferred) { els.tournamentSelect.value = preferred; await selectTournament(preferred); }
    } catch (error) {
      els.connectionBadge.className = 'connection-badge offline'; els.connectionBadge.innerHTML = '<span></span> Error de conexión';
      setMessage(els.actionMessage, error.message);
    }
  }

  function renderSelectors() {
    const sorted = [...state.tournaments].sort((a,b) => (upper(a.status)==='VIGENTE'?-1:upper(b.status)==='VIGENTE'?1:0) || a.game.localeCompare(b.game) || a.title.localeCompare(b.title));
    els.tournamentSelect.innerHTML = '<option value="">Selecciona una edición</option>' + sorted.map(t => `<option value="${esc(t.id)}">${esc(t.game === 'fc-mobile' ? 'FC Mobile' : 'eFootball')} · ${esc(t.title)} · E${esc(t.edition)} · ${esc(t.status)}</option>`).join('');
    const comps = [...state.competitions].sort((a,b) => String(a.juego).localeCompare(String(b.juego)) || (Number(a.orden)||0)-(Number(b.orden)||0));
    els.competitionSelect.innerHTML = '<option value="">Selecciona una competición</option>' + comps.map(c => `<option value="${esc(c.competition_id)}" data-slots="${esc(c.participantes_defecto)}">${esc(c.juego === 'fc-mobile' ? 'FC Mobile' : 'eFootball')} · ${esc(c.nombre)}</option>`).join('');
  }

  function renderGlobalKpis() {
    els.kpiTournaments.textContent = state.tournaments.length;
    const current = state.tournaments.find(t => upper(t.status) === 'VIGENTE');
    els.kpiCurrent.textContent = current ? `E${current.edition}` : '—';
    els.kpiCurrentName.textContent = current ? current.title : 'sin edición activa';
  }

  async function selectTournament(id) {
    state.selected = state.tournaments.find(t => t.id === id) || null;
    state.snapshot = null;
    if (!state.selected) { renderSelected(); return; }
    renderSelected();
    try {
      const snap = await adminAction('snapshot', { tournamentId: id });
      state.snapshot = snap;
      renderSelected();
    } catch (error) {
      if (/Acción no válida|Acción administrativa/.test(error.message)) setMessage(els.actionMessage, 'El panel ya está desplegado, pero Apps Script todavía necesita Code.gs V30 para mostrar códigos y controles avanzados.');
      else setMessage(els.actionMessage, error.message);
      try {
        const publicState = await request(`/api/tournament-state?tournamentId=${encodeURIComponent(id)}&game=${encodeURIComponent(state.selected.game)}`);
        state.snapshot = { registrations: publicState.registrations || [], matches: publicState.matches || [], codes: [] };
        renderSelected();
      } catch (_) {}
    }
  }

  function renderSelected() {
    const t = state.selected;
    if (!t) {
      els.tournamentSummary.className = 'tournament-summary empty'; els.tournamentSummary.textContent = 'Selecciona un torneo para ver su estado.';
      els.publicTournamentLink.classList.add('disabled'); renderCodes([]); renderRegistrations([]); renderMatches([]); updateButtons(); return;
    }
    const status = upper(t.status), regsStatus = upper(t.registrationStatus);
    els.tournamentSummary.className = 'tournament-summary';
    els.tournamentSummary.innerHTML = `<div class="summary-title"><div><h3>${esc(t.title)}</h3><small>${esc(t.game === 'fc-mobile' ? 'FC Mobile' : 'eFootball')} · Edición ${esc(t.edition)}</small></div><span class="pill ${status==='VIGENTE'?'live':status==='FINALIZADO'?'final':''}">${esc(t.status)}</span></div><div class="summary-meta"><span class="pill">${esc(t.slots)} cupos</span><span class="pill">${esc(t.format)}</span><span class="pill">Inscripciones: ${esc(t.registrationStatus)}</span><span class="pill">${esc(t.date)} · ${esc(t.time)}</span></div>`;
    els.publicTournamentLink.classList.remove('disabled'); els.publicTournamentLink.href = `torneo.html?id=${encodeURIComponent(t.id)}&game=${encodeURIComponent(t.game)}`;
    const snap = state.snapshot || {}, regs = snap.registrations || [], matches = snap.matches || [], codes = snap.codes || [];
    renderCodes(codes); renderRegistrations(regs); renderMatches(matches);
    els.kpiRegistrations.textContent = regs.length; els.kpiSlots.textContent = `${regs.length} de ${t.slots} cupos`; els.kpiMatches.textContent = matches.length;
    els.registrationCount.textContent = regs.length; els.matchCount.textContent = matches.length;
    updateButtons(regs.length, codes.length, status, regsStatus);
  }

  function updateButtons(regCount = 0, codeCount = 0, status = '', regsStatus = '') {
    const t = state.selected, has = !!t, final = status === 'FINALIZADO', current = status === 'VIGENTE';
    els.activateBtn.disabled = !has || final || current;
    els.openRegsBtn.disabled = !has || final || !current || regsStatus === 'ABIERTAS';
    els.closeRegsBtn.disabled = !has || final || !current || regsStatus === 'CERRADAS';
    els.prepareFixtureBtn.disabled = !has || final || !current || regCount !== Number(t?.slots || 0);
    els.generateCodesBtn.disabled = !has || final || regCount > 0;
    els.exportCodesBtn.disabled = !has || !codeCount;
  }

  function renderCodes(codes) {
    if (!codes?.length) { els.codesBody.innerHTML = '<tr><td colspan="5" class="empty-cell">No hay códigos disponibles o falta actualizar Code.gs V30.</td></tr>'; return; }
    els.codesBody.innerHTML = codes.map(c => `<tr><td class="code-value">${esc(c.code)}</td><td>${esc(c.status)}</td><td>${esc(c.uses)}/${esc(c.maxUses)}</td><td>${esc(c.participant || '—')}</td><td><button class="mini-btn copy-code" data-code="${esc(c.code)}" type="button">Copiar</button></td></tr>`).join('');
    document.querySelectorAll('.copy-code').forEach(btn => btn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(btn.dataset.code); btn.textContent = 'Copiado'; setTimeout(() => btn.textContent = 'Copiar', 1200); } catch (_) {} }));
  }

  function renderRegistrations(rows) {
    if (!rows?.length) { els.registrationsBody.innerHTML = '<tr><td colspan="5" class="empty-cell">Todavía no hay inscritos.</td></tr>'; return; }
    els.registrationsBody.innerHTML = rows.map(r => `<tr><td><b>${esc(r.nick)}</b></td><td>${esc(r.name)}</td><td>${esc(r.location || '—')}</td><td>${esc(r.contact || '—')}</td><td>${esc(r.tiktok || '—')}</td></tr>`).join('');
  }

  function renderMatches(matches) {
    if (!matches?.length) { els.matchesGrid.innerHTML = '<div class="empty-card">Todavía no hay fixture.</div>'; return; }
    els.matchesGrid.innerHTML = matches.map(m => {
      const ready = m.player1 && m.player2 && upper(m.status) !== 'FINALIZADO';
      return `<article class="match-card" data-match="${esc(m.matchId)}"><div class="match-top"><div><b>${esc(m.stage || 'Partido')}</b><small>${esc([m.group,m.round].filter(Boolean).join(' · '))}</small></div><span class="match-id">${esc(m.matchId)}</span></div><div class="player-line"><b title="${esc(m.player1)}">${esc(m.player1 || 'Por definir')}</b><input class="score-input s1" type="number" min="0" value="${m.score1 ?? ''}" ${ready?'':'disabled'}></div><div class="player-line"><b title="${esc(m.player2)}">${esc(m.player2 || 'Por definir')}</b><input class="score-input s2" type="number" min="0" value="${m.score2 ?? ''}" ${ready?'':'disabled'}></div><div class="penalties"><label>Pen. 1<input class="score-input p1" type="number" min="0" value="${m.penalty1 ?? ''}" ${ready?'':'disabled'}></label><label>Pen. 2<input class="score-input p2" type="number" min="0" value="${m.penalty2 ?? ''}" ${ready?'':'disabled'}></label></div><button class="btn ${upper(m.status)==='FINALIZADO'?'ghost':'primary'} save-match" type="button" ${ready?'':'disabled'}>${upper(m.status)==='FINALIZADO'?'Finalizado':'Guardar resultado'}</button></article>`;
    }).join('');
    document.querySelectorAll('.save-match').forEach(btn => btn.addEventListener('click', saveMatch));
  }

  async function saveMatch(event) {
    const card = event.currentTarget.closest('.match-card'), matchId = card.dataset.match;
    const m = (state.snapshot?.matches || []).find(x => x.matchId === matchId); if (!m) return;
    const score1 = card.querySelector('.s1').value, score2 = card.querySelector('.s2').value, p1 = card.querySelector('.p1').value, p2 = card.querySelector('.p2').value;
    if (score1 === '' || score2 === '') { setMessage(els.actionMessage, 'Ingresa ambos marcadores.'); return; }
    event.currentTarget.disabled = true;
    try {
      const payload = { tournamentId: state.selected.id, matchId, stage: m.stage, group: m.group, round: m.round, player1: m.player1, player2: m.player2, score1: Number(score1), score2: Number(score2) };
      if (p1 !== '') payload.penalty1 = Number(p1); if (p2 !== '') payload.penalty2 = Number(p2);
      const data = await adminAction('save-result', payload); setMessage(els.actionMessage, data.message || 'Resultado guardado.', true); await refreshSelectedAndList();
    } catch (error) { setMessage(els.actionMessage, error.message); event.currentTarget.disabled = false; }
  }

  async function runTournamentAction(action, payload = {}, successFallback = 'Operación completada.') {
    if (!state.selected) return;
    setMessage(els.actionMessage, 'Procesando…');
    try { const data = await adminAction(action, { tournamentId: state.selected.id, ...payload }); setMessage(els.actionMessage, data.message || successFallback, true); await refreshSelectedAndList(); }
    catch (error) { setMessage(els.actionMessage, error.message); }
  }

  async function refreshSelectedAndList() {
    const id = state.selected?.id; await loadAll(); if (id && state.tournaments.some(t => t.id === id)) { els.tournamentSelect.value = id; await selectTournament(id); }
  }

  async function createTournament(event) {
    event.preventDefault(); setMessage(els.createMessage, 'Creando edición…');
    const compId = els.competitionSelect.value; if (!compId) return;
    const payload = { competitionId: compId, slots: Number(els.createSlots.value), date: els.createDate.value || 'Por definir', time: els.createTime.value || 'Por definir', entry: els.createEntry.value || 'Por anunciar', prizeFirst: els.createPrizeFirst.value || 'Por anunciar', prizeSecond: els.createPrizeSecond.value || 'Por anunciar' };
    try {
      const data = await adminAction('create-tournament', payload); setMessage(els.createMessage, `${data.message || 'Torneo creado.'} · ${data.tournamentId}`, true); await loadAll(); els.tournamentSelect.value = data.tournamentId; await selectTournament(data.tournamentId);
    } catch (error) { setMessage(els.createMessage, error.message); }
  }

  function exportCodes() {
    const codes = state.snapshot?.codes || []; if (!codes.length || !state.selected) return;
    const csv = ['codigo,estado,usos,usos_max,participante', ...codes.map(c => [c.code,c.status,c.uses,c.maxUses,c.participant||''].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${state.selected.id}-codigos.csv`; a.click(); URL.revokeObjectURL(url);
  }

  async function finalizeTournament(event) {
    event.preventDefault(); if (!state.selected) return;
    const winner = els.finalWinner.value.trim(), runnerUp = els.finalRunner.value.trim(); if (!winner || !runnerUp) { setMessage(els.finalizeMessage, 'Completa campeón y segundo lugar.'); return; }
    if (!window.confirm(`¿Finalizar ${state.selected.title} con ${winner} como campeón? Esta acción cierra la edición.`)) return;
    setMessage(els.finalizeMessage, 'Finalizando…');
    try { const data = await adminAction('finalize-tournament', { tournamentId: state.selected.id, winner, runnerUp, confirm: 'FINALIZAR' }); setMessage(els.finalizeMessage, data.message || 'Edición finalizada.', true); await refreshSelectedAndList(); }
    catch (error) { setMessage(els.finalizeMessage, error.message); }
  }

  els.loginForm.addEventListener('submit', login); els.logoutBtn.addEventListener('click', logout); els.refreshBtn.addEventListener('click', loadAll);
  els.tournamentSelect.addEventListener('change', () => selectTournament(els.tournamentSelect.value));
  els.competitionSelect.addEventListener('change', () => { const opt = els.competitionSelect.selectedOptions[0]; els.createSlots.value = opt?.dataset?.slots || ''; });
  els.createTournamentForm.addEventListener('submit', createTournament); els.finalizeForm.addEventListener('submit', finalizeTournament);
  els.activateBtn.addEventListener('click', () => runTournamentAction('activate-tournament'));
  els.openRegsBtn.addEventListener('click', () => runTournamentAction('set-registrations', { status: 'ABIERTAS' }));
  els.closeRegsBtn.addEventListener('click', () => runTournamentAction('set-registrations', { status: 'CERRADAS' }));
  els.prepareFixtureBtn.addEventListener('click', () => runTournamentAction('prepare-fixture'));
  els.generateCodesBtn.addEventListener('click', () => { if (window.confirm('Esto reemplazará los códigos ACTIVOS no usados. ¿Continuar?')) runTournamentAction('generate-codes'); });
  els.exportCodesBtn.addEventListener('click', exportCodes);

  checkSession();
})();
