/* Commit — journal (home), habit tracker, expense manager.
   Written in ES5 so it runs on iOS 12 Safari (iPhone 6 Plus). */
(function () {
  'use strict';

  var STORE_KEY = 'commit.v1';
  var COLORS = ['#3fb950', '#58a6ff', '#d29922', '#f778ba', '#bc8cff', '#ff7b72', '#39c5cf'];
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  var DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var SUGGESTIONS = ['Exercise', 'Read 20 minutes', 'Drink water', 'Meditate', 'Write'];
  var WEEKS = 17;
  var MOODS = ['😞', '😕', '😐', '🙂', '😄']; // mood 1..5
  var CATS = [
    { id: 'food', name: 'Food', icon: '🍔', color: '#f0883e' },
    { id: 'transport', name: 'Travel', icon: '🚌', color: '#58a6ff' },
    { id: 'shopping', name: 'Shopping', icon: '🛍', color: '#f778ba' },
    { id: 'bills', name: 'Bills', icon: '💡', color: '#d29922' },
    { id: 'health', name: 'Health', icon: '💊', color: '#3fb950' },
    { id: 'fun', name: 'Fun', icon: '🎬', color: '#bc8cff' },
    { id: 'home', name: 'Home', icon: '🏠', color: '#39c5cf' },
    { id: 'other', name: 'Other', icon: '📦', color: '#8b949e' }
  ];

  var state = blankState();
  var ui = { tab: 'home', sub: 'today', date: todayKey(), month: monthOf(todayKey()), edit: null, stripLeft: null, q: '', allRem: false, showDone: false, toast: null, remSig: '' };

  function blankState() { return { habits: [], journal: [], expenses: [], reminders: [], settings: { currency: '$', budget: 0, theme: 'dark' } }; }

  /* ---------- dates (local YYYY-MM-DD) ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return keyOf(new Date()); }
  function parse(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function dow(k) { return parse(k).getDay(); }
  function monthOf(k) { return k.slice(0, 7); }
  function shiftMonth(ym, n) {
    var p = ym.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }
  function timeText(ts) {
    var d = new Date(ts), h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) { h = 12; }
    return h + ':' + pad(d.getMinutes()) + ' ' + ap;
  }
  function dateHead(k) {
    var t = todayKey();
    if (k === t) { return 'Today'; }
    if (k === addDays(t, -1)) { return 'Yesterday'; }
    var d = parse(k);
    return DAY_SHORT[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== new Date().getFullYear() ? ', ' + d.getFullYear() : '');
  }

  /* ---------- storage ---------- */
  function migrate(data) {
    var s = blankState();
    if (data && data.habits instanceof Array) { s.habits = data.habits; }
    if (data && data.journal instanceof Array) { s.journal = data.journal; }
    if (data && data.expenses instanceof Array) { s.expenses = data.expenses; }
    if (data && data.reminders instanceof Array) { s.reminders = data.reminders; }
    if (data && data.settings) {
      if (typeof data.settings.currency === 'string') { s.settings.currency = data.settings.currency; }
      if (typeof data.settings.budget === 'number') { s.settings.budget = data.settings.budget; }
      if (data.settings.theme === 'light' || data.settings.theme === 'dark') { s.settings.theme = data.settings.theme; }
    }
    return s;
  }
  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) { state = migrate(JSON.parse(raw)); }
    } catch (e) { /* storage unavailable: run in memory */ }
  }
  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function newId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function fmt(n) {
    var neg = n < 0, s, parts;
    n = Math.abs(n);
    s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
    parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + state.settings.currency + parts.join('.');
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function cat(id) { return byId(CATS, id) || CATS[CATS.length - 1]; }
  function el(id) { return document.getElementById(id); }

  /* ======================================================
     HABITS
     ====================================================== */
  function scheduled(h, k) { return k >= h.created && h.days.indexOf(dow(k)) > -1; }
  function isDone(h, k) { return !!h.log[k]; }

  function streak(h) {
    var t = todayKey(), d = t, n = 0, i;
    if (scheduled(h, t) && !isDone(h, t)) { d = addDays(t, -1); }
    for (i = 0; i < 3700; i++) {
      if (d < h.created) { break; }
      if (scheduled(h, d)) {
        if (isDone(h, d)) { n++; } else { break; }
      }
      d = addDays(d, -1);
    }
    return n;
  }
  function bestStreak(h) {
    var t = todayKey(), d = h.created, run = 0, best = 0;
    while (d <= t) {
      if (scheduled(h, d)) {
        if (isDone(h, d)) { run++; if (run > best) { best = run; } } else { run = 0; }
      }
      d = addDays(d, 1);
    }
    return best;
  }
  function rate(habits, days) {
    var t = todayKey(), sched = 0, done = 0, i, j, k;
    for (i = 0; i < habits.length; i++) {
      for (j = 0; j < days; j++) {
        k = addDays(t, -j);
        if (scheduled(habits[i], k)) { sched++; if (isDone(habits[i], k)) { done++; } }
      }
    }
    return sched ? Math.round(done * 100 / sched) : 0;
  }
  function dayCounts(k) {
    var s = 0, d = 0, i;
    for (i = 0; i < state.habits.length; i++) {
      if (scheduled(state.habits[i], k)) { s++; if (isDone(state.habits[i], k)) { d++; } }
    }
    return { s: s, d: d };
  }
  function scheduleText(h) {
    if (h.days.length === 7) { return 'Every day'; }
    if (h.days.length === 5 && h.days.indexOf(0) < 0 && h.days.indexOf(6) < 0) { return 'Weekdays'; }
    var out = [], i;
    for (i = 0; i < DAY_ORDER.length; i++) { if (h.days.indexOf(DAY_ORDER[i]) > -1) { out.push(DAY_SHORT[DAY_ORDER[i]]); } }
    return out.join(', ');
  }

  var CHECK_SVG = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#04130a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function habitTitle(k) {
    var t = todayKey();
    if (k === t) { return { eyebrow: DAY_LONG[dow(k)], title: 'Today' }; }
    if (k === addDays(t, -1)) { return { eyebrow: DAY_LONG[dow(k)], title: 'Yesterday' }; }
    var d = parse(k);
    return { eyebrow: DAY_LONG[d.getDay()], title: MONTHS[d.getMonth()] + ' ' + d.getDate() };
  }

  function viewHabitsToday() {
    var t = todayKey(), k = ui.date, i, h, html = '';
    var head = habitTitle(k);
    html += '<div class="top"><div><div class="eyebrow">' + head.eyebrow + '</div><h1>' + head.title + '</h1></div>' +
      '<button class="add-btn" data-act="h-add" aria-label="Add commitment">+</button></div>';

    if (!state.habits.length) {
      html += '<div class="empty"><h2>Make your first commitment</h2>' +
        '<p>Pick something small you can do every day. Check it off, and watch the streak grow.</p><div class="suggest">';
      for (i = 0; i < SUGGESTIONS.length; i++) {
        html += '<button class="pill" data-act="quick" data-name="' + esc(SUGGESTIONS[i]) + '">' + esc(SUGGESTIONS[i]) + '</button>';
      }
      return html + '</div></div>';
    }

    html += '<div class="strip" id="strip">';
    for (i = 13; i >= 0; i--) {
      var dk = addDays(t, -i), c = dayCounts(dk);
      html += '<button class="day' + (dk === k ? ' sel' : '') + (c.s && c.d === c.s ? ' full' : '') +
        '" data-act="pick" data-date="' + dk + '"><span class="dw">' + DAY_SHORT[dow(dk)] + '</span><span class="dn">' +
        parse(dk).getDate() + '</span></button>';
    }
    html += '</div>';

    var cnt = dayCounts(k), hidden = 0, cards = '';
    for (i = 0; i < state.habits.length; i++) {
      h = state.habits[i];
      if (k < h.created) { continue; }
      var on = isDone(h, k), sch = scheduled(h, k);
      if (!sch && !on) { hidden++; continue; }
      var st = streak(h);
      var meta = st > 0 ? '🔥 ' + st + ' day streak' : 'No streak yet';
      cards += '<div class="card' + (on ? ' is-done' : '') + (sch ? '' : ' rest') + '">' +
        '<button class="check' + (on ? ' on' : '') + '" style="border-color:' + h.color + ';background:' + (on ? h.color : 'transparent') +
        '" data-act="toggle" data-id="' + h.id + '" aria-label="Toggle ' + esc(h.name) + '">' + CHECK_SVG + '</button>' +
        '<div class="info"><div class="name">' + esc(h.name) + '</div><div class="meta">' + meta + ' · ' + scheduleText(h) + '</div></div>' +
        '<button class="more" data-act="h-edit" data-id="' + h.id + '" aria-label="Edit">•••</button></div>';
    }
    var pct = cnt.s ? Math.round(cnt.d * 100 / cnt.s) : 0;
    html += '<div class="progress"><div class="row"><span><b>' + cnt.d + ' of ' + cnt.s + '</b> committed</span><span>' + pct +
      '%</span></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    if (cnt.s && cnt.d === cnt.s) { html += '<div class="banner">All committed. Nice work!</div>'; }
    html += cards;
    if (!cards) { html += '<p class="hint">Nothing scheduled for this day.</p>'; }
    else if (hidden) { html += '<p class="hint">' + hidden + ' rest-day commitment' + (hidden > 1 ? 's' : '') + ' hidden</p>'; }
    return html;
  }

  function heatmap(cellFn, months) {
    var size = 20, step = 24, top = months ? 16 : 0, t = todayKey();
    var start = addDays(t, -dow(t) - (WEEKS - 1) * 7);
    var w = WEEKS * step - 4, hgt = top + 7 * step - 4;
    var s = '<svg class="heat" viewBox="0 0 ' + w + ' ' + hgt + '" xmlns="http://www.w3.org/2000/svg">';
    var lastM = -1, c, r, cs, m, k;
    for (c = 0; c < WEEKS; c++) {
      cs = addDays(start, c * 7);
      if (months) {
        m = parse(cs).getMonth();
        if (m !== lastM) {
          if (c > 0 || parse(addDays(start, 7)).getMonth() === m) {
            s += '<text x="' + (c * step) + '" y="11">' + MONTHS[m] + '</text>';
          }
          lastM = m;
        }
      }
      for (r = 0; r < 7; r++) {
        k = addDays(cs, r);
        if (k > t) { continue; }
        s += '<rect x="' + (c * step) + '" y="' + (top + r * step) + '" width="' + size + '" height="' + size + '" rx="4" ' + cellFn(k) + '/>';
      }
    }
    return s + '</svg>';
  }

  function viewHabitStats() {
    var i, h, html = '<div class="top"><div><div class="eyebrow">Overview</div><h1>Stats</h1></div></div>';
    if (!state.habits.length) {
      return html + '<div class="empty"><p>Add a commitment on the Today view to start tracking.</p></div>';
    }
    var total = 0, bestNow = 0;
    for (i = 0; i < state.habits.length; i++) {
      h = state.habits[i];
      total += Object.keys(h.log).length;
      var st = streak(h);
      if (st > bestNow) { bestNow = st; }
    }
    html += '<div class="tiles"><div class="tile"><b>' + total + '</b><span>Total commits</span></div>' +
      '<div class="tile"><b>' + bestNow + '</b><span>Longest streak</span></div>' +
      '<div class="tile"><b>' + rate(state.habits, 30) + '%</b><span>Last 30 days</span></div></div>';

    html += '<h2 class="sec">All commitments</h2><div class="panel">' + heatmap(function (k) {
      var c = dayCounts(k), lvl;
      if (!c.s) { return 'class="loff"'; }
      var r = c.d / c.s;
      lvl = c.d === 0 ? 0 : r <= 0.34 ? 1 : r <= 0.67 ? 2 : r < 1 ? 3 : 4;
      return 'class="l' + lvl + '"';
    }, true) +
      '<div class="legend">Less<svg width="12" height="12"><rect width="12" height="12" rx="3" class="l0"/></svg><svg width="12" height="12"><rect width="12" height="12" rx="3" class="l1"/></svg><svg width="12" height="12"><rect width="12" height="12" rx="3" class="l2"/></svg><svg width="12" height="12"><rect width="12" height="12" rx="3" class="l3"/></svg><svg width="12" height="12"><rect width="12" height="12" rx="3" class="l4"/></svg>More</div></div>';

    html += '<h2 class="sec">Each commitment</h2>';
    for (i = 0; i < state.habits.length; i++) {
      h = state.habits[i];
      html += '<div class="panel"><div class="hrow"><div class="n"><span class="dot" style="background:' + h.color + '"></span>' + esc(h.name) +
        '</div><div class="hstats"><b>' + streak(h) + '</b> now · <b>' + bestStreak(h) + '</b> best · <b>' + rate([h], 30) + '%</b></div></div>' +
        heatmap((function (hh) {
          return function (k) {
            if (!scheduled(hh, k)) { return 'class="loff"'; }
            return isDone(hh, k) ? 'fill="' + hh.color + '"' : 'class="l0"';
          };
        })(h), false) + '</div>';
    }
    return html;
  }

  function viewCommit() {
    return '<div class="seg"><button data-act="sub" data-sub="today" class="' + (ui.sub === 'today' ? 'on' : '') + '">Today</button>' +
      '<button data-act="sub" data-sub="stats" class="' + (ui.sub === 'stats' ? 'on' : '') + '">Stats</button></div>' +
      (ui.sub === 'today' ? viewHabitsToday() : viewHabitStats());
  }

  /* ======================================================
     EXPENSES
     ====================================================== */
  function monthTotal(ym) {
    var t = 0, i, e;
    for (i = 0; i < state.expenses.length; i++) {
      e = state.expenses[i];
      if (monthOf(e.date) === ym) { t += e.amount; }
    }
    return t;
  }
  function dayTotal(k) {
    var t = 0, i;
    for (i = 0; i < state.expenses.length; i++) { if (state.expenses[i].date === k) { t += state.expenses[i].amount; } }
    return t;
  }
  function byCategory(ym) {
    var sums = {}, out = [], i, e, id;
    for (i = 0; i < state.expenses.length; i++) {
      e = state.expenses[i];
      if (monthOf(e.date) === ym) { sums[e.cat] = (sums[e.cat] || 0) + e.amount; }
    }
    for (id in sums) { if (sums.hasOwnProperty(id)) { out.push({ cat: cat(id), sum: sums[id] }); } }
    out.sort(function (a, b) { return b.sum - a.sum; });
    return out;
  }
  function budgetBar(total) {
    var b = state.settings.budget, pct = Math.min(100, Math.round(total * 100 / b));
    return '<div class="bar' + (total > b ? ' over' : pct >= 85 ? ' warn' : '') + '"><i style="width:' + pct + '%"></i></div>';
  }

  function viewSpend() {
    var ym = ui.month, now = monthOf(todayKey()), p = ym.split('-'), i, html = '';
    var total = monthTotal(ym), bud = state.settings.budget;
    html += '<div class="top"><div><div class="eyebrow">Expenses</div><h1>' + MONTHS_LONG[+p[1] - 1] + ' ' + p[0] + '</h1></div>' +
      '<button class="add-btn" data-act="x-add" aria-label="Add expense">+</button></div>';
    html += '<div class="monthnav"><button class="navbtn" data-act="month" data-d="-1">‹ Previous</button>' +
      '<button class="navbtn' + (ym >= now ? ' dis' : '') + '" data-act="month" data-d="1">Next ›</button></div>';

    html += '<div class="panel" style="margin-top:8px"><div class="big">' + fmt(total) + '</div><div class="muted">spent this month</div>';
    if (bud > 0) {
      html += budgetBar(total) + '<div class="g-row"><span>Budget <b>' + fmt(bud) + '</b></span><span>' +
        (total > bud ? '<b style="color:var(--bad)">' + fmt(total - bud) + ' over</b>' : '<b>' + fmt(bud - total) + '</b> left') + '</span></div>';
    } else {
      html += '<button class="link" style="margin-top:6px;padding:0" data-act="settings">Set a monthly budget</button>';
    }
    html += '</div>';

    var cats = byCategory(ym);
    if (cats.length) {
      html += '<h2 class="sec">By category</h2><div class="panel">';
      for (i = 0; i < cats.length; i++) {
        html += '<div class="cat"><div class="r"><span>' + cats[i].cat.icon + ' ' + cats[i].cat.name + '</span><span>' + fmt(cats[i].sum) +
          '</span></div><div class="cbar"><i style="width:' + Math.max(3, Math.round(cats[i].sum * 100 / total)) + '%;background:' + cats[i].cat.color + '"></i></div></div>';
      }
      html += '</div>';
    }

    var list = [], e;
    for (i = 0; i < state.expenses.length; i++) { if (monthOf(state.expenses[i].date) === ym) { list.push(state.expenses[i]); } }
    list.sort(function (a, b) { return a.date === b.date ? b.ts - a.ts : (a.date < b.date ? 1 : -1); });
    if (!list.length) {
      html += '<div class="empty"><h2>No expenses yet</h2><p>Tap + to log what you spend. Your month at a glance shows up on the Home tab.</p></div>';
      return html;
    }
    html += '<h2 class="sec">Transactions</h2>';
    var last = '';
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.date !== last) {
        html += '<div class="dayhead" style="margin-top:' + (last ? 16 : 0) + 'px"><span>' + dateHead(e.date) + '</span><span>' + fmt(dayTotal(e.date)) + '</span></div>';
        last = e.date;
      }
      var c = cat(e.cat);
      html += '<button class="xrow" data-act="x-edit" data-id="' + e.id + '"><span class="bubble" style="background:' + rgba(c.color, 0.18) + '">' + c.icon +
        '</span><span class="nm"><b>' + esc(e.note || c.name) + '</b>' + (e.note ? '<span>' + c.name + '</span>' : '') + '</span><span class="am">' + fmt(e.amount) + '</span></button>';
    }
    return html;
  }

  /* ======================================================
     REMINDERS (in-app only: iOS 12 web apps cannot push notifications)
     ====================================================== */
  var REPEATS = { none: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
  var REPEAT_ORDER = ['none', 'daily', 'weekly', 'monthly'];
  var CHECK_SMALL = CHECK_SVG.replace('width="26" height="26"', 'width="18" height="18"');

  function time12(hm) {
    var p = hm.split(':'), h = +p[0], ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) { h = 12; }
    return h + ':' + p[1] + ' ' + ap;
  }
  function defaultTime() { return pad((new Date().getHours() + 1) % 24) + ':00'; }
  function remDt(r) {
    var p = r.date.split('-'), t = r.time ? r.time.split(':') : [23, 59];
    return new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]).getTime();
  }
  function remStatus(r) {
    var t = todayKey();
    if (r.date < t) { return 'overdue'; }
    if (r.date === t) { return (r.time && remDt(r) < Date.now()) ? 'overdue' : 'today'; }
    return 'upcoming';
  }
  function remDateText(k) { return k === addDays(todayKey(), 1) ? 'Tomorrow' : dateHead(k); }
  function activeRems() {
    return state.reminders.filter(function (r) { return !r.done; }).sort(function (a, b) { return remDt(a) - remDt(b); });
  }
  function stepDate(d, r) {
    if (r.repeat === 'daily') { return addDays(d, 1); }
    if (r.repeat === 'weekly') { return addDays(d, 7); }
    var p = d.split('-'), next = new Date(+p[0], +p[1], 1), last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(r.anchor || +p[2], last));
    return keyOf(next);
  }
  function completeReminder(r) {
    if (r.repeat && r.repeat !== 'none') {
      var t = todayKey(), d = r.date, guard = 0;
      do { d = stepDate(d, r); guard++; } while (d <= t && guard < 800);
      r.date = d; r.alerted = '';
    } else {
      r.done = true; r.doneAt = Date.now();
    }
    save();
  }

  function remRow(r, isDone) {
    var s = isDone ? 'done' : remStatus(r), meta = [];
    if (s === 'overdue') { meta.push('Overdue'); }
    meta.push(remDateText(r.date));
    if (r.time) { meta.push(time12(r.time)); }
    if (r.repeat && r.repeat !== 'none') { meta.push('↻ ' + REPEATS[r.repeat]); }
    return '<div class="rrow ' + s + '"><button class="rcheck" data-act="r-done" data-id="' + r.id + '" aria-label="' + (isDone ? 'Mark not done' : 'Complete') + '">' + (isDone ? CHECK_SMALL : '') + '</button>' +
      '<button class="rbody" data-act="r-edit" data-id="' + r.id + '"><b>' + esc(r.title) + '</b><span>' + meta.join(' · ') + '</span></button></div>';
  }

  function remindersCard() {
    var act = activeRems(), done = state.reminders.filter(function (r) { return r.done; }).sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); }), i;
    var html = '<div class="rems"><div class="g-top"><span class="eyebrow">Reminders</span><button class="g-quick" data-act="r-add">+ Add</button></div>';
    if (!act.length) { html += '<p class="rem-empty">Nothing to remember. Tap + Add to set a reminder.</p>'; }
    var shown = ui.allRem ? act : act.slice(0, 4);
    for (i = 0; i < shown.length; i++) { html += remRow(shown[i], false); }
    if (act.length > 4) { html += '<button class="link rlink" data-act="r-more">' + (ui.allRem ? 'Show less' : 'Show all ' + act.length) + '</button>'; }
    if (done.length) {
      html += '<button class="link dim rlink" data-act="r-showdone">' + (ui.showDone ? 'Hide completed' : 'Completed (' + done.length + ')') + '</button>';
      if (ui.showDone) { for (i = 0; i < Math.min(done.length, 10); i++) { html += remRow(done[i], true); } }
    }
    return html + '</div>';
  }

  function updateBadge() {
    var n = 0, list = activeRems(), i, b = el('home-badge');
    for (i = 0; i < list.length; i++) { if (remStatus(list[i]) !== 'upcoming') { n++; } }
    if (b) { b.textContent = n > 9 ? '9+' : n; b.style.display = n ? 'block' : 'none'; }
  }

  function showToast(r) {
    ui.toast = r.id;
    var repeating = r.repeat && r.repeat !== 'none';
    el('toast-root').innerHTML = '<div class="toast"><div class="t-main"><b>⏰ ' + esc(r.title) + '</b><span>Due now · ' + time12(r.time) + '</span></div>' +
      '<div class="t-btns"><button class="t-btn primary" data-act="t-done">Done</button>' + (repeating ? '' : '<button class="t-btn" data-act="t-snooze">+10 min</button>') +
      '<button class="t-btn" data-act="t-close" aria-label="Dismiss">✕</button></div></div>';
  }
  function hideToast() {
    ui.toast = null; el('toast-root').innerHTML = '';
    window.setTimeout(checkDue, 300);
  }
  // pop up a banner for timed reminders that have come due and haven't been announced yet
  function checkDue() {
    if (ui.toast) { return; }
    var now = Date.now(), list = [], changed = false, i, r, key;
    for (i = 0; i < state.reminders.length; i++) {
      r = state.reminders[i]; key = r.date + ' ' + r.time;
      if (r.done || !r.time || r.alerted === key || remDt(r) > now) { continue; }
      if (now - remDt(r) > 864e5) { r.alerted = key; changed = true; continue; } // stale: show in list only
      list.push(r);
    }
    if (changed) { save(); }
    if (!list.length) { return; }
    list.sort(function (a, b) { return remDt(a) - remDt(b); });
    list[0].alerted = list[0].date + ' ' + list[0].time;
    save();
    showToast(list[0]);
  }
  function tick() {
    checkDue();
    var sig = activeRems().map(function (r) { return r.id + remStatus(r); }).join(',');
    var a = document.activeElement, typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
    if (sig !== ui.remSig && ui.tab === 'home' && !ui.edit && !typing) { render(); } else { updateBadge(); }
  }

  /* ======================================================
     JOURNAL (home)
     ====================================================== */
  function journalStreak() {
    var days = {}, i, n = 0, d = todayKey();
    for (i = 0; i < state.journal.length; i++) { days[state.journal[i].date] = 1; }
    if (!days[d]) { d = addDays(d, -1); }
    while (days[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  function journalList() {
    var q = ui.q.toLowerCase(), list = [], i, e, html = '', last = '';
    for (i = 0; i < state.journal.length; i++) {
      e = state.journal[i];
      if (!q || e.text.toLowerCase().indexOf(q) > -1) { list.push(e); }
    }
    list.sort(function (a, b) { return b.ts - a.ts; });
    if (!list.length) {
      return state.journal.length ? '<p class="hint">No entries match.</p>' :
        '<div class="empty" style="padding-top:28px"><h2>Your journal is empty</h2><p>Write a few lines about today. Future you will thank you.</p></div>';
    }
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (e.date !== last) { html += '<div class="dayhead"><span>' + dateHead(e.date) + '</span></div>'; last = e.date; }
      html += '<button class="entry" data-act="j-edit" data-id="' + e.id + '">' +
        (e.mood ? '<span class="em">' + MOODS[e.mood - 1] + '</span>' : '<span class="em none">•</span>') +
        '<span class="body"><span class="txt">' + esc(e.text) + '</span><span class="tm" style="display:block">' + timeText(e.ts) + '</span></span></button>';
    }
    return html;
  }

  function gistCard() {
    var t = todayKey(), ym = monthOf(t), total = monthTotal(ym), bud = state.settings.budget, prev = monthTotal(shiftMonth(ym, -1));
    var name = MONTHS_LONG[+ym.split('-')[1] - 1];
    var html = '<button class="gist" data-act="tab" data-tab="spend"><div class="g-top"><span class="eyebrow">Spent in ' + name + '</span>' +
      '<span class="g-quick" data-act="x-add">+ Add</span></div>';
    if (!state.expenses.length && !bud) {
      return html + '<div class="g-amt">' + fmt(0) + '</div><div class="g-sub">Tap to start tracking your spending</div></button>';
    }
    html += '<div class="g-amt">' + fmt(total) + '</div>';
    if (prev > 0) {
      var ch = Math.round((total - prev) * 100 / prev);
      html += '<div class="g-sub">' + (ch > 0 ? '<span class="up">▲ ' + ch + '%</span>' : ch < 0 ? '<span class="down">▼ ' + Math.abs(ch) + '%</span>' : 'Same') + ' vs last month</div>';
    } else {
      html += '<div class="g-sub">' + (total ? 'First month tracked' : 'Nothing spent yet') + '</div>';
    }
    if (bud > 0) { html += budgetBar(total); } else { html += '<div style="height:12px"></div>'; }
    var top = byCategory(ym)[0], right;
    if (bud > 0) { right = total > bud ? '<b style="color:var(--bad)">' + fmt(total - bud) + ' over</b>' : '<b>' + fmt(bud - total) + '</b> left'; }
    else { right = top ? top.cat.icon + ' <b>' + top.cat.name + '</b>' : ''; }
    return html + '<div class="g-row"><span>Today <b>' + fmt(dayTotal(t)) + '</b></span><span>' + right + '</span></div></button>';
  }

  function viewHome() {
    var n = state.journal.length, st = journalStreak(), now = new Date(), i;
    var html = '<div class="top"><div><div class="eyebrow">' + DAY_LONG[now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate() + '</div><h1>Journal</h1>' +
      '<div class="sub">' + n + (n === 1 ? ' entry' : ' entries') + (st > 0 ? ' · 🔥 ' + st + ' day streak' : '') + '</div></div>' +
      '<button class="icon-btn" data-act="settings" aria-label="Settings"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></div>';
    html += gistCard() + remindersCard();
    html += '<div class="compose"><button class="ask" data-act="j-new" data-mood="0">What’s on your mind?</button><div class="moodrow">';
    for (i = 0; i < MOODS.length; i++) { html += '<button class="mood-btn" data-act="j-new" data-mood="' + (i + 1) + '" aria-label="Mood ' + (i + 1) + '">' + MOODS[i] + '</button>'; }
    html += '</div></div>';
    if (n > 3) { html += '<input class="search" id="jsearch" type="search" placeholder="Search your journal" value="' + esc(ui.q) + '" autocapitalize="off" autocorrect="off">'; }
    return html + '<div id="jlist">' + journalList() + '</div>';
  }

  /* ======================================================
     SHEETS
     ====================================================== */
  function showSheet(html) { el('sheet-root').innerHTML = html; }
  function closeSheet() { ui.edit = null; el('sheet-root').innerHTML = ''; }
  function head(title, saveAct) {
    return '<div class="shead"><button class="link dim" data-act="close">Cancel</button><b>' + title + '</b><button class="link strong" data-act="' + saveAct + '">Save</button></div>';
  }

  function openHabit(id) {
    var h = id ? byId(state.habits, id) : null;
    ui.edit = h ? { type: 'habit', id: h.id, days: h.days.slice(), color: h.color }
                : { type: 'habit', id: null, days: [0, 1, 2, 3, 4, 5, 6], color: COLORS[state.habits.length % COLORS.length] };
    var e = ui.edit, i, html = '<div class="scrim" data-act="close"></div><div class="sheet">' + head(h ? 'Edit commitment' : 'New commitment', 'h-save') +
      '<label>Name</label><input type="text" id="f-name" maxlength="40" value="' + esc(h ? h.name : '') + '" placeholder="e.g. Read 20 minutes" autocapitalize="sentences" autocorrect="off">' +
      '<label>Repeat on</label><div class="chips">';
    for (i = 0; i < DAY_ORDER.length; i++) {
      var d = DAY_ORDER[i];
      html += '<button class="chip' + (e.days.indexOf(d) > -1 ? ' on' : '') + '" data-act="day" data-day="' + d + '">' + DAY_LETTER[d] + '</button>';
    }
    html += '</div><div class="presets"><button data-act="preset" data-p="all">Every day</button><button data-act="preset" data-p="weekdays">Weekdays</button></div>' +
      '<label>Colour</label><div class="swatches">';
    for (i = 0; i < COLORS.length; i++) {
      html += '<button class="sw' + (COLORS[i] === e.color ? ' on' : '') + '" style="background:' + COLORS[i] + '" data-act="color" data-color="' + COLORS[i] + '"></button>';
    }
    html += '</div>' + (h ? '<div class="btnrow"><button class="btn danger" data-act="h-delete">Delete commitment</button></div>' : '') + '</div>';
    showSheet(html);
  }

  function openJournal(id, mood) {
    var j = id ? byId(state.journal, id) : null, i, html;
    ui.edit = { type: 'journal', id: id || null, mood: j ? j.mood || 0 : mood || 0 };
    html = '<div class="scrim" data-act="close"></div><div class="sheet full">' + head(j ? dateHead(j.date) : 'New entry', 'j-save') + '<div class="moods">';
    for (i = 0; i < MOODS.length; i++) { html += '<button data-act="j-mood" data-mood="' + (i + 1) + '" class="' + (ui.edit.mood === i + 1 ? 'on' : '') + '">' + MOODS[i] + '</button>'; }
    html += '</div><textarea id="j-text" placeholder="Write freely…">' + esc(j ? j.text : '') + '</textarea>' +
      (j ? '<div class="btnrow" style="margin-top:16px"><button class="btn danger" data-act="j-delete">Delete entry</button></div>' : '') + '</div>';
    showSheet(html);
    if (!j) { el('j-text').focus(); }
  }

  function openExpense(id) {
    var x = id ? byId(state.expenses, id) : null, i, html;
    ui.edit = { type: 'expense', id: id || null, cat: x ? x.cat : 'food' };
    html = '<div class="scrim" data-act="close"></div><div class="sheet full">' + head(x ? 'Edit expense' : 'New expense', 'x-save') +
      '<label>Amount (' + esc(state.settings.currency) + ')</label><input class="amt" type="number" step="any" min="0" inputmode="decimal" id="x-amt" placeholder="0" value="' + (x ? x.amount : '') + '">' +
      '<label>Category</label><div class="catgrid">';
    for (i = 0; i < CATS.length; i++) {
      html += '<button class="catbtn' + (CATS[i].id === ui.edit.cat ? ' on' : '') + '" data-act="x-cat" data-cat="' + CATS[i].id + '">' + CATS[i].icon + '<span>' + CATS[i].name + '</span></button>';
    }
    html += '</div><label>Note</label><input type="text" id="x-note" maxlength="60" placeholder="Optional" value="' + esc(x ? x.note : '') + '" autocapitalize="sentences" autocorrect="off">' +
      '<label>Date</label><input type="date" id="x-date" value="' + (x ? x.date : todayKey()) + '">' +
      (x ? '<div class="btnrow" style="margin-top:20px"><button class="btn danger" data-act="x-delete">Delete expense</button></div>' : '') + '</div>';
    showSheet(html);
    if (!x) { el('x-amt').focus(); }
  }

  function openReminder(id) {
    var r = id ? byId(state.reminders, id) : null, i, html;
    var hasTime = !!(r && r.time);
    ui.edit = { type: 'reminder', id: id || null, repeat: (r && r.repeat) || 'none', hasTime: hasTime };
    html = '<div class="scrim" data-act="close"></div><div class="sheet full">' + head(r ? 'Edit reminder' : 'New reminder', 'r-save') +
      '<label>Remind me to</label><input type="text" id="r-title" maxlength="80" value="' + esc(r ? r.title : '') + '" placeholder="e.g. Call the bank" autocapitalize="sentences" autocorrect="off">' +
      '<label>Date</label><div class="presets" style="margin:0 0 8px"><button data-act="r-quick" data-d="0">Today</button><button data-act="r-quick" data-d="1">Tomorrow</button><button data-act="r-quick" data-d="7">Next week</button></div>' +
      '<input type="date" id="r-date" value="' + (r ? r.date : todayKey()) + '">' +
      '<label>Time</label><div id="r-timewrap" style="display:' + (hasTime ? 'block' : 'none') + '"><input type="time" id="r-time" value="' + (hasTime ? r.time : defaultTime()) + '">' +
      '<button class="link dim" style="margin-top:4px" data-act="r-time" data-on="0">Remove time</button></div>' +
      '<button class="btn" id="r-addtime" style="display:' + (hasTime ? 'none' : 'block') + ';width:100%;margin-right:0" data-act="r-time" data-on="1">Add a time</button>' +
      '<label>Repeat</label><div class="seg" style="margin-bottom:0">';
    for (i = 0; i < REPEAT_ORDER.length; i++) {
      html += '<button data-act="r-rep" data-rep="' + REPEAT_ORDER[i] + '" class="' + (ui.edit.repeat === REPEAT_ORDER[i] ? 'on' : '') + '">' + REPEATS[REPEAT_ORDER[i]] + '</button>';
    }
    html += '</div>' + (r ? '<div class="btnrow" style="margin-top:20px"><button class="btn danger" data-act="r-delete">Delete reminder</button></div>' : '') +
      '<p class="note">Reminders alert you while the app is open. iPhone web apps can’t send notifications when closed.</p></div>';
    showSheet(html);
    if (!r) { el('r-title').focus(); }
  }

  function saveReminder(e) {
    var title = el('r-title').value.replace(/^\s+|\s+$/g, '');
    if (!title) { el('r-title').focus(); return false; }
    var date = el('r-date').value || todayKey(), time = e.hasTime ? (el('r-time').value || defaultTime()) : '';
    var r = e.id ? byId(state.reminders, e.id) : null, anchor = +date.split('-')[2];
    if (r) {
      if (r.date !== date || r.time !== time) { r.alerted = ''; }
      r.title = title; r.date = date; r.time = time; r.repeat = e.repeat; r.anchor = anchor;
    } else {
      state.reminders.push({ id: newId('r'), title: title, date: date, time: time, repeat: e.repeat, anchor: anchor, done: false, alerted: '' });
    }
    save();
    return true;
  }

  function offlineStatus() {
    if (!('serviceWorker' in navigator)) {
      return '⚠️ Not available here. Offline mode needs the app to be served over HTTPS (a plain http:// address on your network won’t work).';
    }
    if (navigator.serviceWorker.controller) { return '✅ Ready. The app opens even with no internet connection.'; }
    return '⏳ Setting up. Keep the app open while online, then reopen it once.';
  }

  function openSettings() {
    ui.edit = { type: 'settings' };
    showSheet('<div class="scrim" data-act="close"></div><div class="sheet full">' + head('Settings', 's-save') +
      '<label>Currency symbol</label><input type="text" id="s-cur" maxlength="3" value="' + esc(state.settings.currency) + '" autocapitalize="off" autocorrect="off">' +
      '<label>Theme</label><div class="seg" style="margin-bottom:0"><button data-act="theme" data-theme="dark" class="' + (state.settings.theme === 'dark' ? 'on' : '') + '">Dark</button>' +
      '<button data-act="theme" data-theme="light" class="' + (state.settings.theme === 'light' ? 'on' : '') + '">Light</button></div>' +
      '<label>Monthly budget (0 = none)</label><input type="number" step="any" min="0" inputmode="decimal" id="s-bud" value="' + (state.settings.budget || '') + '" placeholder="0">' +
      '<label>Backup (all data)</label><div class="btnrow"><button class="btn" data-act="export">Export</button><button class="btn" data-act="import">Import</button></div>' +
      '<textarea class="backup-box" id="backup" placeholder="Export copies your data here. Paste a backup here and tap Import to restore it." autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>' +
      '<p class="note">Everything is stored only on this device. Export a backup now and then.</p>' +
      '<label>Offline mode</label><p class="note" style="margin-top:0">' + offlineStatus() + '</p></div>');
  }

  /* ======================================================
     RENDER
     ====================================================== */
  function render() {
    var app = el('app'), strip = el('strip');
    if (strip) { ui.stripLeft = strip.scrollLeft; }
    var top = app.scrollTop, html;
    if (ui.tab === 'home') { html = viewHome(); }
    else if (ui.tab === 'commit') { html = viewCommit(); }
    else { html = viewSpend(); }
    app.innerHTML = html;
    var tabs = document.querySelectorAll('.tab'), i;
    for (i = 0; i < tabs.length; i++) { tabs[i].className = 'tab' + (tabs[i].getAttribute('data-tab') === ui.tab ? ' on' : ''); }
    strip = el('strip');
    if (strip) { strip.scrollLeft = ui.stripLeft === null ? strip.scrollWidth : ui.stripLeft; }
    app.scrollTop = top;
    ui.remSig = activeRems().map(function (r) { return r.id + remStatus(r); }).join(',');
    updateBadge();
  }

  /* ======================================================
     EVENTS
     ====================================================== */
  function num(id) { var v = parseFloat(el(id).value); return isNaN(v) ? 0 : v; }

  document.addEventListener('click', function (ev) {
    var node = ev.target, act = null;
    while (node && node !== document) {
      if (node.getAttribute && node.getAttribute('data-act')) { act = node; break; }
      node = node.parentNode;
    }
    if (!act) { return; }
    var a = act.getAttribute('data-act'), id = act.getAttribute('data-id'), e = ui.edit, h, i, x;

    switch (a) {
    case 'tab': ui.tab = act.getAttribute('data-tab'); render(); el('app').scrollTop = 0; break;
    case 'sub': ui.sub = act.getAttribute('data-sub'); render(); break;
    case 'close': closeSheet(); break;
    case 'settings': openSettings(); break;
    case 'theme':
      state.settings.theme = act.getAttribute('data-theme');
      applyTheme(); save();
      var tb = document.querySelectorAll('.seg [data-act=theme]');
      for (i = 0; i < tb.length; i++) { tb[i].className = tb[i].getAttribute('data-theme') === state.settings.theme ? 'on' : ''; }
      break;

    /* habits */
    case 'pick': ui.date = act.getAttribute('data-date'); render(); break;
    case 'toggle':
      h = byId(state.habits, id);
      if (h) { if (isDone(h, ui.date)) { delete h.log[ui.date]; } else { h.log[ui.date] = 1; } save(); render(); }
      break;
    case 'h-add': openHabit(null); break;
    case 'h-edit': openHabit(id); break;
    case 'quick': addHabit(act.getAttribute('data-name'), [0, 1, 2, 3, 4, 5, 6], COLORS[state.habits.length % COLORS.length]); save(); render(); break;
    case 'day':
      if (!e) { break; }
      var d = +act.getAttribute('data-day'), at = e.days.indexOf(d);
      if (at > -1) { e.days.splice(at, 1); } else { e.days.push(d); }
      act.className = 'chip' + (at > -1 ? '' : ' on');
      break;
    case 'preset':
      if (!e) { break; }
      e.days = act.getAttribute('data-p') === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
      var chips = document.querySelectorAll('.chip');
      for (i = 0; i < chips.length; i++) { chips[i].className = 'chip' + (e.days.indexOf(+chips[i].getAttribute('data-day')) > -1 ? ' on' : ''); }
      break;
    case 'color':
      if (!e) { break; }
      e.color = act.getAttribute('data-color');
      var sw = document.querySelectorAll('.sw');
      for (i = 0; i < sw.length; i++) { sw[i].className = 'sw' + (sw[i].getAttribute('data-color') === e.color ? ' on' : ''); }
      break;
    case 'h-save':
      var name = el('f-name').value.replace(/^\s+|\s+$/g, '');
      if (!name) { el('f-name').focus(); break; }
      if (!e.days.length) { window.alert('Pick at least one day.'); break; }
      if (e.id) { h = byId(state.habits, e.id); h.name = name; h.days = e.days.slice(); h.color = e.color; }
      else { addHabit(name, e.days.slice(), e.color); }
      save(); closeSheet(); render();
      break;
    case 'h-delete':
      if (window.confirm('Delete this commitment and its history?')) {
        state.habits = state.habits.filter(function (z) { return z.id !== e.id; });
        save(); closeSheet(); render();
      }
      break;

    /* journal */
    case 'j-new': openJournal(null, +act.getAttribute('data-mood')); break;
    case 'j-edit': openJournal(id, 0); break;
    case 'j-mood':
      var m = +act.getAttribute('data-mood'), mb = document.querySelectorAll('.moods button');
      e.mood = e.mood === m ? 0 : m;
      for (i = 0; i < mb.length; i++) { mb[i].className = (e.mood === i + 1) ? 'on' : ''; }
      break;
    case 'j-save':
      var text = el('j-text').value.replace(/^\s+|\s+$/g, '');
      if (!text) { el('j-text').focus(); break; }
      if (e.id) { x = byId(state.journal, e.id); x.text = text; x.mood = e.mood; }
      else { state.journal.push({ id: newId('j'), ts: Date.now(), date: todayKey(), mood: e.mood, text: text }); }
      save(); closeSheet(); render();
      break;
    case 'j-delete':
      if (window.confirm('Delete this entry?')) {
        state.journal = state.journal.filter(function (z) { return z.id !== e.id; });
        save(); closeSheet(); render();
      }
      break;

    /* expenses */
    case 'x-add': openExpense(null); break;
    case 'x-edit': openExpense(id); break;
    case 'x-cat':
      e.cat = act.getAttribute('data-cat');
      var cb = document.querySelectorAll('.catbtn');
      for (i = 0; i < cb.length; i++) { cb[i].className = 'catbtn' + (cb[i].getAttribute('data-cat') === e.cat ? ' on' : ''); }
      break;
    case 'x-save':
      var amt = Math.round(num('x-amt') * 100) / 100;
      if (amt <= 0) { el('x-amt').focus(); break; }
      var note = el('x-note').value.replace(/^\s+|\s+$/g, ''), date = el('x-date').value || todayKey();
      if (e.id) { x = byId(state.expenses, e.id); x.amount = amt; x.cat = e.cat; x.note = note; x.date = date; }
      else { state.expenses.push({ id: newId('x'), ts: Date.now(), date: date, amount: amt, cat: e.cat, note: note }); }
      if (monthOf(date) !== ui.month && ui.tab === 'spend') { ui.month = monthOf(date); }
      save(); closeSheet(); render();
      break;
    case 'x-delete':
      if (window.confirm('Delete this expense?')) {
        state.expenses = state.expenses.filter(function (z) { return z.id !== e.id; });
        save(); closeSheet(); render();
      }
      break;
    case 'month':
      var nm = shiftMonth(ui.month, +act.getAttribute('data-d'));
      if (nm <= monthOf(todayKey())) { ui.month = nm; render(); }
      break;

    /* reminders */
    case 'r-add': openReminder(null); break;
    case 'r-edit': openReminder(id); break;
    case 'r-done':
      x = byId(state.reminders, id);
      if (x) { if (x.done) { x.done = false; x.doneAt = 0; save(); } else { completeReminder(x); } render(); }
      break;
    case 'r-more': ui.allRem = !ui.allRem; render(); break;
    case 'r-showdone': ui.showDone = !ui.showDone; render(); break;
    case 'r-quick': el('r-date').value = addDays(todayKey(), +act.getAttribute('data-d')); break;
    case 'r-time':
      e.hasTime = act.getAttribute('data-on') === '1';
      el('r-timewrap').style.display = e.hasTime ? 'block' : 'none';
      el('r-addtime').style.display = e.hasTime ? 'none' : 'block';
      break;
    case 'r-rep':
      e.repeat = act.getAttribute('data-rep');
      var rb = document.querySelectorAll('.seg [data-act=r-rep]');
      for (i = 0; i < rb.length; i++) { rb[i].className = rb[i].getAttribute('data-rep') === e.repeat ? 'on' : ''; }
      break;
    case 'r-save': if (saveReminder(e)) { closeSheet(); render(); } break;
    case 'r-delete':
      if (window.confirm('Delete this reminder?')) {
        state.reminders = state.reminders.filter(function (z) { return z.id !== e.id; });
        save(); closeSheet(); render();
      }
      break;
    case 't-done':
      x = byId(state.reminders, ui.toast);
      if (x) { completeReminder(x); }
      hideToast(); render();
      break;
    case 't-snooze':
      x = byId(state.reminders, ui.toast);
      if (x) {
        var sn = new Date(Date.now() + 600000);
        x.date = keyOf(sn); x.time = pad(sn.getHours()) + ':' + pad(sn.getMinutes()); x.alerted = ''; save();
      }
      hideToast(); render();
      break;
    case 't-close': hideToast(); break;

    /* settings */
    case 's-save':
      var cur = el('s-cur').value.replace(/^\s+|\s+$/g, '');
      state.settings.currency = cur;
      state.settings.budget = Math.max(0, num('s-bud'));
      save(); closeSheet(); render();
      break;
    case 'export':
      var box = el('backup');
      box.value = JSON.stringify(state);
      box.focus(); box.setSelectionRange(0, box.value.length);
      break;
    case 'import':
      try {
        var data = JSON.parse(el('backup').value);
        if (!data || !(data.habits instanceof Array)) { throw new Error('bad'); }
        if (window.confirm('Replace all current data with the pasted backup?')) { state = migrate(data); save(); closeSheet(); render(); }
      } catch (err) { window.alert('That does not look like a valid backup.'); }
      break;
    }
  }, false);

  function applyTheme() {
    var light = state.settings.theme === 'light', metas = document.getElementsByTagName('meta'), i, n;
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    for (i = 0; i < metas.length; i++) {
      n = metas[i].getAttribute('name');
      if (n === 'theme-color') { metas[i].setAttribute('content', light ? '#f2f4f7' : '#0d1117'); }
      if (n === 'apple-mobile-web-app-status-bar-style') { metas[i].setAttribute('content', light ? 'default' : 'black'); }
    }
  }

  function addHabit(name, days, color) {
    state.habits.push({ id: newId('h'), name: name, days: days, color: color, created: todayKey(), log: {} });
  }

  // live journal search: only the list re-renders so the field keeps focus
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'jsearch') { ui.q = ev.target.value; el('jlist').innerHTML = journalList(); }
  }, false);

  // pick up a new day if the app stays open overnight
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !ui.edit) {
      var t = todayKey();
      if (ui.date > t) { ui.date = t; }
      if (ui.month > monthOf(t)) { ui.month = monthOf(t); }
      render();
    }
    if (!document.hidden) { checkDue(); }
  }, false);

  load();
  applyTheme();
  render();
  checkDue();
  window.setInterval(tick, 30000);

  // offline support (needs HTTPS or localhost; see sw.js)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* unsupported context: app still works online */ });
    });
  }
})();
