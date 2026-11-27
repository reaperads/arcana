/* ============================================================
   Arcana — pengundian, pembacaan, perpustakaan, dan jurnal.
   Tanpa proses pembangunan, tanpa dependensi. Gambar kartu
   ada di assets/img dan dimuat dari situ.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- dek ---------------- */

  var MAJOR = window.TAROT_MAJOR || [];
  var MINOR = window.TAROT_MINOR || [];

  var RANK_NUMBER = {
    'Ace': 1, 'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5, 'Six': 6, 'Seven': 7,
    'Eight': 8, 'Nine': 9, 'Ten': 10, 'Page': 11, 'Knight': 12, 'Queen': 13, 'King': 14
  };

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function imageFor(card) {
    if (card.arcana === 'major') return 'assets/img/m' + pad2(card.number) + '.png';
    return 'assets/img/' + card.suit + '-' + pad2(RANK_NUMBER[card.rank] || 0) + '.png';
  }

  var DECK = MAJOR.concat(MINOR).map(function (card, index) {
    return Object.assign({ id: index, image: imageFor(card) }, card);
  });

  var BY_ID = {};
  DECK.forEach(function (card) { BY_ID[card.id] = card; });

  var ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
    'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

  var SUITS = {
    wands: { label: 'Wands', glyph: '♣', element: 'Api', theme: 'kehendak, dorongan, invensi' },
    cups: { label: 'Cups', glyph: '♥', element: 'Air', theme: 'perasaan, hubungan, mimpi' },
    swords: { label: 'Swords', glyph: '♠', element: 'Udara', theme: 'pikiran, kebenaran, konflik' },
    pentacles: { label: 'Pentacles', glyph: '♦', element: 'Tanah', theme: 'tubuh, pekerjaan, uang' }
  };

  var SPREADS = {
    single: {
      label: 'Satu kartu',
      positions: ['Kartu ini']
    },
    three: {
      label: 'Tiga kartu',
      positions: ['Masa lalu', 'Sekarang', 'Masa depan']
    },
    horseshoe: {
      label: 'Tapal kuda',
      positions: ['Situasi', 'Tantangan', 'Fondasi', 'Saran', 'Kemungkinan hasil']
    },
    celtic: {
      label: 'Salib Celtic',
      positions: ['Sekarang', 'Tantangan', 'Fondasi', 'Masa lalu terdekat', 'Mahkota',
        'Masa depan terdekat', 'Diri sendiri', 'Lingkungan', 'Harapan dan ketakutan', 'Hasil']
    }
  };

  var JOURNAL_KEY = 'arcana.journal.v1';
  var MAX_ENTRIES = 200;

  var state = {
    spread: 'three',
    reversals: true,
    question: '',
    entries: [],
    revealed: 0,
    saved: false,
    libraryFilter: 'all',
    libraryQuery: ''
  };

  /* ---------------- pembantu kecil ---------------- */

  function $(id) {
    return document.getElementById(id);
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function randomInt(max) {
    var cryptoObj = window.crypto || window.msCrypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      var buffer = new Uint32Array(1);
      var limit = Math.floor(4294967296 / max) * max;
      var value;
      do {
        cryptoObj.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = randomInt(i + 1);
      var swap = list[i];
      list[i] = list[j];
      list[j] = swap;
    }
    return list;
  }

  function keywordsFor(entry) {
    return (entry.reversed ? entry.card.reverseKeywords : entry.card.keywords) || [];
  }

  function meaningFor(entry) {
    return entry.reversed ? entry.card.reverseMeaning : entry.card.meaning;
  }

  function describeCard(card, reversed) {
    return card.name + (reversed ? ', terbalik' : ', tegak');
  }

  /* ---------------- muka kartu ---------------- */

  function fillFace(parent, card, reversed) {
    if (card.image) {
      parent.classList.add('has-art');
      var art = make('img', 'card-art');
      art.src = card.image;
      art.alt = card.name;
      art.decoding = 'async';
      art.loading = 'lazy';
      if (reversed) art.classList.add('is-reversed');
      parent.appendChild(art);
      return;
    }

    var isMajor = card.arcana === 'major';
    var suit = isMajor ? null : SUITS[card.suit];

    var rankText = isMajor ? (ROMAN[card.number] || String(card.number)) : card.rank;
    var glyphText = suit ? suit.glyph : '✷';
    var labelText = isMajor ? card.name : 'of ' + (suit ? suit.label : '');

    var foot = make('span', 'card-foot');
    foot.appendChild(make('span', 'card-label', labelText));
    if (reversed) foot.appendChild(make('span', 'card-orient', 'Terbalik'));

    parent.appendChild(make('span', 'card-rank', rankText));
    parent.appendChild(make('span', 'card-glyph', glyphText));
    parent.appendChild(foot);
  }

  function buildSlot(entry, index) {
    var slot = make('div', 'slot');

    var button = make('button', 'card');
    button.type = 'button';
    button.setAttribute('data-index', String(index));
    if (entry.card.arcana === 'minor') button.setAttribute('data-suit', entry.card.suit);
    if (entry.reversed) button.classList.add('is-reversed');
    button.setAttribute('aria-label', 'Kartu ' + (index + 1) + ', ' + entry.position + '. Ketuk untuk membalik.');

    var inner = make('span', 'card-inner');

    var back = make('span', 'card-side card-back');
    back.appendChild(make('span', 'card-back-mark', '✷'));

    var front = make('span', 'card-side card-front');
    fillFace(front, entry.card, entry.reversed);

    inner.appendChild(back);
    inner.appendChild(front);
    button.appendChild(inner);

    slot.appendChild(button);
    slot.appendChild(make('span', 'slot-label', entry.position));

    return slot;
  }

  /* ---------------- bacaan ---------------- */

  function drawReading() {
    var spread = SPREADS[state.spread] || SPREADS.three;
    var deck = shuffle(DECK.slice());

    state.entries = spread.positions.map(function (position, index) {
      return {
        card: deck[index],
        reversed: state.reversals && randomInt(2) === 1,
        position: position
      };
    });
    state.saved = false;

    renderReading(false);
  }

  function renderReading(instant) {
    var spread = SPREADS[state.spread] || SPREADS.three;
    var spreadEl = $('spread');

    $('reading-spread-label').textContent = spread.label;
    $('reading-title').textContent = state.question || 'Bacaanmu';
    spreadEl.setAttribute('data-count', String(state.entries.length));

    clear(spreadEl);
    state.entries.forEach(function (entry, index) {
      spreadEl.appendChild(buildSlot(entry, index));
    });

    var interpretation = $('interpretation');
    interpretation.hidden = true;
    clear(interpretation);

    $('reading').hidden = false;

    if (instant) {
      state.revealed = state.entries.length;
      each(spreadEl.querySelectorAll('.card'), function (cardEl) {
        cardEl.classList.add('is-revealed');
        var index = Number(cardEl.getAttribute('data-index'));
        if (state.entries[index]) {
          cardEl.setAttribute('aria-label', describeCard(state.entries[index].card, state.entries[index].reversed) + '. Buka makna.');
        }
      });
      updateMeta();
      finishReading();
    } else {
      state.revealed = 0;
      updateMeta();
      $('reveal-all').disabled = false;
      $('save-reading').disabled = true;
    }
  }

  function updateMeta() {
    var total = state.entries.length;
    var meta = $('reading-meta');
    if (!total) {
      meta.textContent = '';
      return;
    }
    meta.textContent = state.revealed >= total
      ? 'Semua ' + total + ' kartu terbuka · ketuk kartu untuk maknanya'
      : state.revealed + ' dari ' + total + ' terbuka';
  }

  function revealCard(index) {
    var entry = state.entries[index];
    if (!entry) return;

    var cardEl = $('spread').querySelector('.card[data-index="' + index + '"]');
    if (!cardEl || cardEl.classList.contains('is-revealed')) return;

    cardEl.classList.add('is-revealed');
    cardEl.setAttribute('aria-label', describeCard(entry.card, entry.reversed) + '. Buka makna.');
    state.revealed += 1;
    updateMeta();

    if (state.revealed >= state.entries.length) finishReading();
  }

  function revealAllCards() {
    state.entries.forEach(function (entry, index) {
      revealCard(index);
    });
    updateMeta();
  }

  function finishReading() {
    $('reveal-all').disabled = true;
    $('save-reading').disabled = state.saved;
    renderInterpretation();
  }

  function meaningBlock(entry, showPosition) {
    var block = make('div', 'meaning');
    var head = make('div', 'meaning-head');

    if (showPosition) head.appendChild(make('span', 'meaning-pos', entry.position));
    head.appendChild(make('span', 'meaning-name', entry.card.name));
    if (entry.reversed) head.appendChild(make('span', 'badge', 'Terbalik'));
    block.appendChild(head);

    var chips = make('div', 'keywords');
    keywordsFor(entry).forEach(function (word) {
      chips.appendChild(make('span', 'kw', word));
    });
    block.appendChild(chips);

    block.appendChild(make('p', null, meaningFor(entry)));
    return block;
  }

  /* ---------------- ringkasan gabungan ---------------- */

  var SUIT_THEMES = {
    wands: {
      tema: 'kehendak dan tindakan',
      saran: 'tanyakan apakah kamu benar-benar ingin melangkah, atau hanya ingin terlihat bergerak'
    },
    cups: {
      tema: 'perasaan dan hubungan',
      saran: 'dengarkan apa yang sebenarnya kamu rasakan, bukan apa yang seharusnya kamu rasakan'
    },
    swords: {
      tema: 'pikiran, kebenaran, dan konflik',
      saran: 'waspadai kata-kata yang tajam dan pikiran yang berputar tanpa henti'
    },
    pentacles: {
      tema: 'pekerjaan, tubuh, dan uang',
      saran: 'periksa kembali fondasi materi dan kebiasaan harianmu'
    }
  };

  var RANK_NOTE = {
    Ace: 'awal dan kesempatan',
    Two: 'pilihan dan keseimbangan',
    Three: 'pertumbuhan dan kerja sama',
    Four: 'stabilitas dan jeda',
    Five: 'konflik dan kehilangan',
    Six: 'kembali dan pertukaran',
    Seven: 'ujian dan refleksi',
    Eight: 'gerak dan ikatan',
    Nine: 'hampir selesai dan kelelahan',
    Ten: 'puncak dan beban',
    Page: 'pembelajaran dan pesan baru',
    Knight: 'dorongan dan aksi',
    Queen: 'kedewasaan dan kepedulian',
    King: 'kendali dan otoritas'
  };

  function capitalise(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function firstWord(entry) {
    return keywordsFor(entry)[0] || '';
  }

  /* Menggabungkan kartu-kartu yang terbuka menjadi beberapa kalimat.
     Tidak ada yang disimpan: ringkasan dihitung ulang setiap kali bacaan tampil. */
  function buildSummary() {
    var entries = state.entries;
    var n = entries.length;
    var lines = [];
    if (n < 2) return lines;

    var majors = entries.filter(function (e) { return e.card.arcana === 'major'; }).length;
    var reversed = entries.filter(function (e) { return e.reversed; }).length;

    // 1. Arkana Mayor atau Minor
    if (majors === 0) {
      lines.push('Tidak ada Arkana Mayor. Persoalan ini berkisar pada hal-hal sehari-hari yang masih bisa kamu atur sendiri.');
    } else if (majors * 2 > n) {
      lines.push('Lebih dari separuh kartu adalah Arkana Mayor (' + majors + ' dari ' + n + '). Ini persoalan besar yang tidak selesai dalam semalam.');
    } else {
      lines.push(majors + ' dari ' + n + ' kartu adalah Arkana Mayor, jadi ada beberapa tema besar di balik hal-hal sehari-hari.');
    }

    // 2. Jenis yang paling sering muncul
    var suitCount = {};
    entries.forEach(function (e) {
      if (e.card.arcana === 'minor') {
        suitCount[e.card.suit] = (suitCount[e.card.suit] || 0) + 1;
      }
    });
    var topSuit = null;
    var topCount = 1;
    Object.keys(suitCount).forEach(function (suit) {
      if (suitCount[suit] > topCount) {
        topSuit = suit;
        topCount = suitCount[suit];
      }
    });
    if (topSuit) {
      var theme = SUIT_THEMES[topSuit];
      lines.push(topCount + ' kartu dari jenis ' + SUITS[topSuit].label + ' menandakan ' + theme.tema +
        ' menjadi pusat bacaan ini. ' + capitalise(theme.saran) + '.');
    } else if (majors < n) {
      lines.push('Tidak ada jenis yang berulang, jadi tema bacaan ini beragam.');
    }

    // 3. Kartu terbalik
    if (reversed === 0) {
      lines.push('Semua kartu tegak: energinya bergerak ke depan dan tidak banyak tertahan.');
    } else if (reversed * 2 > n) {
      lines.push(reversed + ' dari ' + n + ' kartu terbalik. Banyak hal tertahan atau berjalan tidak sesuai harapan; lihat ke dalam dulu sebelum bertindak.');
    } else {
      lines.push(reversed + ' dari ' + n + ' kartu terbalik. Sebagian energinya masih tertahan di dalam dirimu, belum sepenuhnya keluar.');
    }

    // 4. Pangkat yang berulang (Ace, Queen, dan seterusnya)
    var rankCount = {};
    entries.forEach(function (e) {
      if (e.card.arcana === 'minor') {
        rankCount[e.card.rank] = (rankCount[e.card.rank] || 0) + 1;
      }
    });
    Object.keys(rankCount).forEach(function (rank) {
      if (rankCount[rank] >= 2 && RANK_NOTE[rank]) {
        lines.push('Ada ' + rankCount[rank] + ' kartu berpangkat ' + rank + '. Tema ' +
          RANK_NOTE[rank] + ' ditekankan dalam bacaan ini.');
      }
    });

    // 5. Alur dari posisi pertama ke posisi terakhir
    var first = entries[0];
    var last = entries[n - 1];
    lines.push('Alur dari ' + first.position.toLowerCase() + ' ke ' + last.position.toLowerCase() + ': ' +
      first.card.name + (firstWord(first) ? ' (' + firstWord(first) + ')' : '') + ' mengarah ke ' +
      last.card.name + (firstWord(last) ? ' (' + firstWord(last) + ')' : '') + '.');

    return lines;
  }

  function renderInterpretation() {
    var wrap = $('interpretation');
    clear(wrap);

    var summary = buildSummary();
    if (summary.length) {
      var box = make('div', 'summary');
      box.appendChild(make('p', 'eyebrow', 'Ringkasan bacaan'));
      var items = make('ul', 'summary-list');
      summary.forEach(function (line) {
        items.appendChild(make('li', null, line));
      });
      box.appendChild(items);
      wrap.appendChild(box);
    }

    var list = make('div', 'meaning-list');
    state.entries.forEach(function (entry) {
      list.appendChild(meaningBlock(entry, true));
    });

    wrap.appendChild(list);
    wrap.hidden = false;
  }

  function readingText() {
    var spread = SPREADS[state.spread] || SPREADS.three;
    var lines = [];

    lines.push('ARCANA — ' + spread.label);
    lines.push('Pertanyaan: ' + (state.question || 'tidak ada'));
    lines.push('');

    state.entries.forEach(function (entry) {
      lines.push(entry.position.toUpperCase() + ' — ' + entry.card.name + (entry.reversed ? ' (terbalik)' : ''));
      lines.push('  ' + keywordsFor(entry).join(' · '));
      lines.push('  ' + meaningFor(entry));
      lines.push('');
    });

    return lines.join('\n').trim();
  }

  /* ---------------- jurnal ---------------- */

  function loadJournal() {
    try {
      var raw = window.localStorage.getItem(JOURNAL_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function storeJournal(records) {
    try {
      window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      toast('Tidak bisa menyimpan di perangkat ini');
      return false;
    }
  }

  function saveCurrentReading() {
    if (!state.entries.length || state.saved) return;

    var records = loadJournal();
    records.unshift({
      id: 'r' + Date.now(),
      date: new Date().toISOString(),
      spread: state.spread,
      question: state.question,
      entries: state.entries.map(function (entry) {
        return { id: entry.card.id, reversed: entry.reversed, position: entry.position };
      })
    });

    if (storeJournal(records.slice(0, MAX_ENTRIES))) {
      state.saved = true;
      $('save-reading').disabled = true;
      renderJournal();
      toast('Tersimpan di jurnal');
    }
  }

  function formatDate(iso) {
    var when = new Date(iso);
    if (isNaN(when.getTime())) return 'Tanpa tanggal';
    try {
      return when.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' · ' + when.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return when.toDateString();
    }
  }

  function journalEntry(record) {
    var item = make('article', 'entry');

    var head = make('div', 'entry-head');
    var spread = SPREADS[record.spread];
    head.appendChild(make('span', 'entry-date', formatDate(record.date)));
    head.appendChild(make('span', 'entry-date', spread ? spread.label : 'Bacaan'));
    item.appendChild(head);

    item.appendChild(make('p', 'entry-q', record.question || 'Tanpa pertanyaan'));

    var chips = make('div', 'entry-cards');
    (record.entries || []).forEach(function (saved) {
      var card = BY_ID[saved.id];
      var text = card ? card.name : 'Kartu tidak dikenal';
      if (saved.reversed) text += ' (terb)';
      chips.appendChild(make('span', 'entry-card', text));
    });
    item.appendChild(chips);

    var actions = make('div', 'entry-actions');

    var open = make('button', 'btn btn-ghost btn-small', 'Buka');
    open.type = 'button';
    open.addEventListener('click', function () { openRecord(record); });
    actions.appendChild(open);

    var remove = make('button', 'btn btn-danger btn-small', 'Hapus');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      if (!window.confirm('Hapus bacaan ini dari jurnal?')) return;
      var remaining = loadJournal().filter(function (other) { return other.id !== record.id; });
      storeJournal(remaining);
      renderJournal();
      toast('Bacaan dihapus');
    });
    actions.appendChild(remove);

    item.appendChild(actions);
    return item;
  }

  function renderJournal() {
    var list = $('journal-list');
    clear(list);

    var records = loadJournal();
    if (!records.length) {
      list.appendChild(make('p', 'empty', 'Belum ada bacaan tersimpan. Undi satu penyebaran, lalu simpan agar tercatat di sini.'));
      return;
    }

    records.forEach(function (record) {
      list.appendChild(journalEntry(record));
    });
  }

  function openRecord(record) {
    var entries = (record.entries || []).map(function (saved) {
      var card = BY_ID[saved.id];
      if (!card) return null;
      return {
        card: card,
        reversed: !!saved.reversed,
        position: saved.position || 'Kartu'
      };
    }).filter(function (entry) { return !!entry; });

    if (!entries.length) {
      toast('Bacaan itu tidak bisa dipulihkan');
      return;
    }

    state.spread = SPREADS[record.spread] ? record.spread : 'three';
    state.question = record.question || '';
    state.entries = entries;
    state.saved = true;

    showView('reading');
    renderReading(true);
    $('reading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exportJournal() {
    var records = loadJournal();
    if (!records.length) {
      toast('Belum ada yang bisa diekspor');
      return;
    }

    var blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'arcana-jurnal.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Jurnal diekspor');
  }

  /* ---------------- perpustakaan ---------------- */

  function libraryItem(card) {
    var button = make('button', 'lib-item');
    button.type = 'button';
    if (card.arcana === 'minor') button.setAttribute('data-suit', card.suit);
    button.setAttribute('aria-label', card.name + ' — buka makna');

    var face = make('span', 'lib-face');
    fillFace(face, card, false);
    button.appendChild(face);

    button.addEventListener('click', function () {
      openCardModal(card, {});
    });

    return button;
  }

  function renderLibrary() {
    var grid = $('library-grid');
    clear(grid);

    var query = state.libraryQuery.toLowerCase();
    var items = DECK.filter(function (card) {
      var filter = state.libraryFilter;
      if (filter === 'major' && card.arcana !== 'major') return false;
      if (filter !== 'all' && filter !== 'major' && card.suit !== filter) return false;
      if (query && card.name.toLowerCase().indexOf(query) === -1) return false;
      return true;
    });

    items.forEach(function (card) {
      grid.appendChild(libraryItem(card));
    });

    if (!items.length) {
      grid.appendChild(make('p', 'empty', 'Tidak ada kartu yang cocok dengan pencarian itu.'));
    }

    $('library-count').textContent = items.length + ' dari ' + DECK.length + ' kartu ditampilkan';
  }

  /* ---------------- lembar kartu ---------------- */

  function modalSection(title, keywords, text) {
    var section = make('div', 'modal-section');
    section.appendChild(make('h3', null, title));

    var chips = make('div', 'keywords');
    (keywords || []).forEach(function (word) {
      chips.appendChild(make('span', 'kw', word));
    });
    section.appendChild(chips);
    section.appendChild(make('p', null, text));
    return section;
  }

  function openCardModal(card, options) {
    var opts = options || {};
    var reversed = !!opts.reversed;
    var body = $('modal-body');
    clear(body);

    if (card.image) {
      var picture = make('img', 'modal-art');
      picture.src = card.image;
      picture.alt = card.name;
      picture.decoding = 'async';
      if (reversed) picture.classList.add('is-reversed');
      body.appendChild(picture);
    }

    var title = make('h2', 'modal-name', card.name);
    title.id = 'modal-title';
    body.appendChild(title);

    var subtitle;
    if (card.arcana === 'major') {
      subtitle = 'Arkana Mayor · ' + (ROMAN[card.number] || String(card.number));
    } else {
      var suit = SUITS[card.suit];
      subtitle = suit.label + ' · ' + suit.element + ' · ' + suit.theme;
    }
    if (opts.position) {
      subtitle += ' · ' + opts.position;
    }
    body.appendChild(make('p', 'modal-sub', subtitle));

    body.appendChild(modalSection(
      reversed ? 'Terbalik' : 'Tegak',
      reversed ? card.reverseKeywords : card.keywords,
      reversed ? card.reverseMeaning : card.meaning
    ));
    body.appendChild(modalSection(
      reversed ? 'Tegak' : 'Terbalik',
      reversed ? card.keywords : card.reverseKeywords,
      reversed ? card.meaning : card.reverseMeaning
    ));

    $('card-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('card-modal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ---------------- tampilan, notifikasi, salin ---------------- */

  function showView(name) {
    ['reading', 'library', 'journal'].forEach(function (viewName) {
      var section = $('view-' + viewName);
      if (section) section.hidden = viewName !== name;
    });

    each(document.querySelectorAll('.tab'), function (tab) {
      var active = tab.getAttribute('data-view') === name;
      tab.classList.toggle('is-active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });

    if (name === 'library') renderLibrary();
    if (name === 'journal') renderJournal();
    window.scrollTo(0, 0);
  }

  var toastTimer = null;

  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.classList.add('is-visible');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2400);
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    document.body.removeChild(area);
    toast(copied ? 'Bacaan disalin' : 'Salin tidak tersedia di sini');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('Bacaan disalin');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  /* ---------------- sambungan ---------------- */

  function onDraw(event) {
    event.preventDefault();
    state.question = $('question').value.trim();
    state.reversals = $('reversals').checked;

    var checked = document.querySelector('input[name="spread"]:checked');
    state.spread = checked && SPREADS[checked.value] ? checked.value : 'three';

    drawReading();
    $('reading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    if (!DECK.length) {
      $('draw-form').hidden = true;
      toast('Dek gagal dimuat');
      return;
    }

    $('draw-form').addEventListener('submit', onDraw);

    $('spread').addEventListener('click', function (event) {
      var cardEl = event.target.closest ? event.target.closest('.card') : null;
      if (!cardEl) return;

      var index = Number(cardEl.getAttribute('data-index'));
      var entry = state.entries[index];
      if (!entry) return;

      if (!cardEl.classList.contains('is-revealed')) {
        revealCard(index);
      } else {
        openCardModal(entry.card, { position: entry.position, reversed: entry.reversed });
      }
    });

    $('reveal-all').addEventListener('click', revealAllCards);
    $('save-reading').addEventListener('click', saveCurrentReading);

    $('copy-reading').addEventListener('click', function () {
      if (!state.entries.length) return;
      copyText(readingText());
    });

    $('new-reading').addEventListener('click', function () {
      $('reading').hidden = true;
      state.entries = [];
      state.revealed = 0;
      state.saved = false;
      $('question').focus();
      $('draw-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    each(document.querySelectorAll('.tab'), function (tab) {
      tab.addEventListener('click', function () {
        showView(tab.getAttribute('data-view'));
      });
    });

    each(document.querySelectorAll('#library-filters .chip'), function (chip) {
      chip.addEventListener('click', function () {
        state.libraryFilter = chip.getAttribute('data-filter');
        each(document.querySelectorAll('#library-filters .chip'), function (other) {
          other.classList.toggle('is-active', other === chip);
        });
        renderLibrary();
      });
    });

    $('library-search').addEventListener('input', function (event) {
      state.libraryQuery = event.target.value.trim();
      renderLibrary();
    });

    $('export-journal').addEventListener('click', exportJournal);

    $('card-modal').addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('[data-close]')) closeModal();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !$('card-modal').hidden) closeModal();
    });

    renderLibrary();
    renderJournal();
  }

  init();
})();
