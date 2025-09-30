(function () {
            const baseSel = document.getElementById('base');
            const needleEl = document.getElementById('needle');
            const statusMini = document.getElementById('statusMini');
            const suitcaseDiv = document.getElementById('suitcase');
            const rightZone = document.getElementById('rightZone');
            const leftZone = document.getElementById('leftZone');
            const measuredInline = document.getElementById('measuredInline');
            const baseSymbol = document.getElementById('baseSymbol');
            const answerBaseInput = document.getElementById('answerBase');
            const checkAnswerBtn = document.getElementById('checkAnswer');
            const answerStatus = document.getElementById('answerStatus');
            const scoreBox = document.getElementById('scoreBox');
            const resetRightBtn = document.getElementById('resetRight');
            const resetAllBtn = document.getElementById('resetAll');
            const themeToggle = document.getElementById('themeToggle');

            const OBJECTS_BY_BASE = {
                10: [
                    { name: 'Pastèque', min: 4000, max: 9999 },
                    { name: 'Ordinateur portable', min: 1200, max: 2500 },
                    { name: 'Chaussure adulte', min: 300, max: 800 },
                    { name: 'Brique de lait', min: 950, max: 1100 },
                    { name: 'Livre broché', min: 200, max: 900 },
                    { name: 'Boîte de conserve', min: 350, max: 800 }
                ],
                2: [
                    { name: 'Câble HDMI', min: 30, max: 80 },
                    { name: 'Souris USB', min: 80, max: 120 },
                    { name: 'Pomme', min: 120, max: 250 },
                    { name: 'Smartphone', min: 150, max: 250 },
                    { name: 'Trousse scolaire', min: 150, max: 250 },
                    { name: 'Paquet de cartes', min: 90, max: 120 },
                    { name: 'Banane', min: 100, max: 200 }
                ],
                16: [
                    { name: 'Valise chargée', min: 15000, max: 30000 },
                    { name: 'Sac de ciment 25 kg', min: 24000, max: 26000 },
                    { name: 'Micro-ondes', min: 10000, max: 15000 },
                    { name: 'Imprimante', min: 5000, max: 12000 },
                    { name: 'Vélo enfant', min: 7000, max: 14000 },
                    { name: 'Petit chien', min: 4000, max: 12000 },
                    { name: 'Carton de livres', min: 15000, max: 25000 }
                ]
            };

            function hexDigit(n) { return (n >= 0 && n <= 15) ? (n < 10 ? String(n) : 'ABCDEF'[n - 10]) : String(n); }
            function isValidDigits(s, b) {
                if (typeof s !== 'string') return false; let t = s.trim(); if (!t) return false; // accepter préfixes % et $
                if (b === 2 && t.startsWith('%')) t = t.slice(1);
                if (b === 16 && t.startsWith('$')) t = t.slice(1);
                if (b === 2) return /^[01]+$/.test(t); if (b === 16) return /^[0-9a-fA-F]+$/.test(t); return /^[0-9]+$/.test(t);
            }
            function parseBase(str, b) { let t = (str || '').trim(); if (b === 2 && t.startsWith('%')) t = t.slice(1); if (b === 16 && t.startsWith('$')) t = t.slice(1); return parseInt(t || '0', b); }

            let state = {
                base: 10,
                denominations: [1, 10, 100, 1000],
                caps: [9, 9, 9, 9],
                used: [],
                selectedIndex: 0,
                assignedByBase: { 2: [], 10: [], 16: [] },
                resultsByBase: { 2: Array(OBJECTS_BY_BASE[2].length).fill(null), 10: Array(OBJECTS_BY_BASE[10].length).fill(null), 16: Array(OBJECTS_BY_BASE[16].length).fill(null) }
            };

            function setupBase(b) {
                if (b === 10) { state.denominations = [1, 10, 100, 1000]; state.caps = [9, 9, 9, 9]; }
                else if (b === 2) { state.denominations = Array.from({ length: 8 }, (_, i) => 2 ** i); state.caps = Array(8).fill(1); }
                else if (b === 16) { state.denominations = [1, 16, 256, 4096]; state.caps = [15, 15, 15, 15]; }
                state.used = Array(state.denominations.length).fill(0);
            }

            function capacity() { return state.denominations.reduce((acc, d, i) => acc + d * state.caps[i], 0); }
            function baseMax() { if (state.base === 2) return 255; if (state.base === 16) return 65535; return 9999; }

            function ensureAssignmentsForBase(b) {
                const objs = OBJECTS_BY_BASE[b];
                if (state.assignedByBase[b].length === objs.length) return;
                const cap = capacity();
                state.assignedByBase[b] = objs.map(o => {
                    const maxAllowed = Math.min(baseMax(), cap, o.max);
                    const minAllowed = Math.max(0, Math.min(o.min, maxAllowed));
                    const v = Math.floor(Math.random() * (maxAllowed - minAllowed + 1)) + minAllowed;
                    return v;
                });
            }

            function currentObjects() { return OBJECTS_BY_BASE[state.base]; }
            function currentAssigned() { return state.assignedByBase[state.base]; }
            function currentResults() { return state.resultsByBase[state.base]; }

            function renderObjects() {
                leftZone.innerHTML = '';
                const objs = currentObjects();
                const res = currentResults();
                objs.forEach((o, i) => {
                    const chip = document.createElement('div');
                    chip.className = 'chip';
                    chip.textContent = o.name;
                    if (state.selectedIndex === i) chip.classList.add('active');
                    if (res[i] === 'ok') chip.classList.add('ok');
                    else if (res[i] === 'warn') chip.classList.add('warn');
                    else if (res[i] === 'bad') chip.classList.add('bad');
                    chip.onclick = () => selectObject(i);
                    leftZone.append(chip);
                });
            }

            function selectObject(i) {
                state.selectedIndex = i;
                setTarget(currentAssigned()[i]);
                answerBaseInput.value = '';
                answerStatus.textContent = '';
                clearRight();
                renderObjects();
            }

            function renderSuitcase() {
                suitcaseDiv.innerHTML = '';
                const order = state.denominations.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d);
                // Une colonne par dénomination, largeur adaptative pour occuper toute la ligne
                suitcaseDiv.style.gridTemplateColumns = `repeat(${order.length}, minmax(90px, 1fr))`;
                order.forEach(({ d, i }) => {
                    const slot = document.createElement('div'); slot.className = 'slot';
                    const usedTop = document.createElement('div'); usedTop.className = 'usedCount'; usedTop.id = `used-${i}`; usedTop.textContent = (state.base === 16) ? `${state.used[i]} (${hexDigit(state.used[i])})` : `${state.used[i]}`;
                    const token = document.createElement('div'); token.className = 'token'; token.dataset.v = String(d); token.textContent = `${d} g`; token.draggable = true;
                    token.addEventListener('dragstart', ev => onDragStart(ev, { type: 'fromSuitcase', denomIndex: i }));
                    token.addEventListener('click', () => { if (state.used[i] < state.caps[i]) { state.used[i]++; rightZone.appendChild(createPlacedToken(i)); update(); } });
                    const remain = document.createElement('div'); remain.className = 'remain'; remain.id = `remain-${i}`; remain.textContent = `Restant : ${state.caps[i] - state.used[i]} / ${state.caps[i]}`;
                    slot.append(usedTop, token, remain); suitcaseDiv.append(slot);
                    slot.addEventListener('dragover', onDragOver); slot.addEventListener('dragleave', clearDragOver); slot.addEventListener('drop', ev => onDropToSuitcase(ev, i));
                });
            }

            function onDragStart(ev, payload) { ev.dataTransfer.setData('application/json', JSON.stringify(payload)); ev.dataTransfer.effectAllowed = 'move'; }
            function onDragOver(ev) { ev.preventDefault(); ev.currentTarget.classList.add('dragover'); }
            function clearDragOver(ev) { ev.currentTarget.classList.remove('dragover'); }
            rightZone.addEventListener('dragover', onDragOver);
            rightZone.addEventListener('dragleave', clearDragOver);
            rightZone.addEventListener('drop', ev => { clearDragOver(ev); onDropToRight(ev); });

            function createPlacedToken(denomIndex) {
                const d = state.denominations[denomIndex];
                const t = document.createElement('div'); t.className = 'token small'; t.dataset.v = String(d); t.textContent = `${d} g`; t.draggable = true;
                t.addEventListener('dragstart', ev => onDragStart(ev, { type: 'fromRight', denomIndex }));
                // clic pour retirer
                t.addEventListener('click', () => {
                    if (state.used[denomIndex] > 0) { state.used[denomIndex]--; rightZone.removeChild(t); update(); }
                });
                return t;
            }

            function onDropToRight(ev) {
                ev.preventDefault();
                const data = JSON.parse(ev.dataTransfer.getData('application/json') || 'null'); if (!data) return;
                if (data.type === 'fromSuitcase') {
                    const i = data.denomIndex;
                    if (state.used[i] < state.caps[i]) { state.used[i]++; rightZone.appendChild(createPlacedToken(i)); update(); }
                }
            }

            function onDropToSuitcase(ev, denomIndex) {
                ev.preventDefault(); clearDragOver(ev);
                const data = JSON.parse(ev.dataTransfer.getData('application/json') || 'null'); if (!data) return;
                if (data.type === 'fromRight') {
                    const i = data.denomIndex;
                    if (i === denomIndex && state.used[i] > 0) {
                        const tokens = Array.from(rightZone.querySelectorAll('.token.small'));
                        const idx = tokens.findIndex(tok => Number(tok.dataset.v) === state.denominations[i]);
                        if (idx !== -1) { rightZone.removeChild(tokens[idx]); }
                        state.used[i]--; update();
                    }
                }
            }

            function sumRight() { return state.denominations.reduce((acc, d, i) => acc + d * state.used[i], 0); }

            function updateStatus() {
                const s = sumRight();
                const cap = capacity();
                const tgt = currentAssigned()[state.selectedIndex] ?? 0;
                const diff = s - tgt;
                const denom = Math.max(tgt, cap * 0.25, 1);
                const ratio = Math.max(-1, Math.min(1, diff / denom));
                const angle = ratio * 20; // ±20°

                // Aiguille
                if (needleEl) {
                    needleEl.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                    needleEl.classList.remove('ok', 'over', 'under');
                }
                // Badge statut (bouton en avant-plan)
                statusMini.className = 'status-mini';

                if (tgt > cap) {
                    statusMini.textContent = `Inatteignable (cap ${cap} g)`;
                    statusMini.classList.add('over');
                    if (needleEl) needleEl.classList.add('over');
                    return;
                }
                if (diff === 0) {
                    statusMini.textContent = 'OK';
                    statusMini.classList.add('ok');
                    if (needleEl) needleEl.classList.add('ok');
                } else if (diff > 0) {
                    statusMini.textContent = 'Trop lourd';
                    statusMini.classList.add('over');
                    if (needleEl) needleEl.classList.add('over');
                } else {
                    statusMini.textContent = 'Trop léger';
                    statusMini.classList.add('under');
                    if (needleEl) needleEl.classList.add('under');
                }
            }

            function updateRemains() {
                state.denominations.forEach((_, i) => {
                    const el = document.getElementById(`remain-${i}`); if (el) el.textContent = `Restant : ${state.caps[i] - state.used[i]} / ${state.caps[i]}`;
                    const u = document.getElementById(`used-${i}`); if (u) u.textContent = (state.base === 16) ? `${state.used[i]} (${hexDigit(state.used[i])})` : `${state.used[i]}`;
                });
            }

            function updateMeasured() { measuredInline.textContent = sumRight() + ' g'; }
            function clearRight() { state.used = Array(state.denominations.length).fill(0); rightZone.innerHTML = ''; update(); }
            function update() { updateStatus(); updateRemains(); updateMeasured(); }

            function setBase(b) {
                state.base = b; setupBase(b); clearRight(); renderSuitcase(); ensureAssignmentsForBase(b); state.selectedIndex = 0; renderObjects(); selectObject(0); updateAnswerUI(); recomputeScore();
            }

            function setTarget(v) { state.target = Math.max(0, Math.min(capacity(), Math.floor(Number(v) || 0))); update(); }

            function recomputeScore() {
                const all = Object.values(state.resultsByBase);
                let ok = 0, total = 0; all.forEach(arr => { ok += arr.filter(x => x === 'ok').length; total += arr.length; });
                scoreBox.textContent = `${ok} / ${total}`;
            }

            // --- Persistance locale ---
            const STORAGE_KEY = 'balanceBases_v1';
            function saveState() {
                try {
                    const payload = { assignedByBase: state.assignedByBase, resultsByBase: state.resultsByBase };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
                } catch (e) {/* stockage indisponible */ }
            }
            function loadState() {
                try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (!raw) return false;
                    const data = JSON.parse(raw);
                    if (!data || !data.assignedByBase || !data.resultsByBase) return false;
                    [2, 10, 16].forEach(b => {
                        if (Array.isArray(data.assignedByBase[b])) state.assignedByBase[b] = data.assignedByBase[b];
                        if (Array.isArray(data.resultsByBase[b])) state.resultsByBase[b] = data.resultsByBase[b];
                    });
                    return true;
                } catch (e) { return false; }
            }

            function checkAnswer() {
                const gramsVal = sumRight();
                const baseStr = (answerBaseInput.value || '').trim();
                let formatOk = isValidDigits(baseStr, state.base);
                if (formatOk) { if (state.base === 2 && baseStr.replace(/^%/, '').length > 8) formatOk = false; if (state.base === 16 && baseStr.replace(/^\$/, '').length > 4) formatOk = false; }
                const target = currentAssigned()[state.selectedIndex];
                const gramsOk = (gramsVal === target);
                const baseOk = formatOk ? (parseBase(baseStr, state.base) === target) : false;

                const res = currentResults();
                if (!formatOk) { answerStatus.textContent = (state.base === 2) ? 'Format invalide : binaire (0/1), 8 bits max.' : (state.base === 16 ? 'Format invalide : hexadécimal (0-9, A-F), 4 chiffres max.' : 'Format invalide : décimal attendu.'); res[state.selectedIndex] = 'bad'; }
                else if (gramsOk && baseOk) { answerStatus.textContent = '✅ Bonne réponse (masse et conversion).'; res[state.selectedIndex] = 'ok'; }
                else if (gramsOk && !baseOk) { answerStatus.textContent = '🟠 Masse correcte, conversion incorrecte.'; res[state.selectedIndex] = 'warn'; }
                else { answerStatus.textContent = '❌ Masse incorrecte.'; res[state.selectedIndex] = 'bad'; }
                renderObjects(); recomputeScore(); saveState();
            }

            baseSel.addEventListener('change', e => setBase(Number(e.target.value)));
            resetRightBtn.addEventListener('click', clearRight);
            checkAnswerBtn.addEventListener('click', checkAnswer);
            resetAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const code = prompt('Code de réinitialisation ?');
                if (code === '05111955') {
                    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
                    state.assignedByBase = { 2: [], 10: [], 16: [] };
                    state.resultsByBase = { 2: Array(OBJECTS_BY_BASE[2].length).fill(null), 10: Array(OBJECTS_BY_BASE[10].length).fill(null), 16: Array(OBJECTS_BY_BASE[16].length).fill(null) };
                    setBase(state.base);
                    recomputeScore(); saveState();
                    alert('Réinitialisation effectuée.');
                } else if (code !== null) {
                    alert('Code incorrect.');
                }
            });
            answerBaseInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkAnswer(); });



            function updateAnswerUI() {
                if (state.base === 2) { answerBaseInput.placeholder = 'Binaire (0/1, 8 bits max.)'; baseSymbol.textContent = '%'; }
                else if (state.base === 16) { answerBaseInput.placeholder = 'Hexadécimal (0-9, A-F, 4 chiffres max.)'; baseSymbol.textContent = '$'; }
                else { answerBaseInput.placeholder = 'Décimal standard (0-9)'; baseSymbol.textContent = ''; }
            }

            // --- Thème ---
            const THEME_KEY = 'balanceBases_theme';
            function applyTheme(t) { document.body.dataset.theme = t; themeToggle.textContent = (t === 'light') ? '🌙' : '☀️'; try { localStorage.setItem(THEME_KEY, t); } catch (e) { } }
            const savedTheme = (function () { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } })();
            applyTheme(savedTheme);
            themeToggle.addEventListener('click', () => applyTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light'));

            // --- Init ---
            const had = loadState();
            setBase(10);
            if (had) {
                [2, 10, 16].forEach(b => { if (state.assignedByBase[b].length) {/* ok */ } else ensureAssignmentsForBase(b); });
                renderSuitcase(); renderObjects(); selectObject(0); recomputeScore();
            }
            saveState();
        })();
