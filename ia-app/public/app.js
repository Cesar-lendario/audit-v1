(function () {
  "use strict";

  var companyName = '';
  var hourlyCost = 60;
  var siteContext = '';
  var messages = []; // Anthropic-format {role, content}
  var displayLog = []; // {who: 'bot'|'user', text}
  var interviewDone = false;

  var introEl = document.getElementById('intro');
  var chatCard = document.getElementById('chatCard');
  var messagesEl = document.getElementById('messages');
  var answerInput = document.getElementById('answerInput');
  var sendBtn = document.getElementById('sendBtn');
  var micBtn = document.getElementById('micBtn');
  var finishBtn = document.getElementById('finishBtn');
  var reportSetup = document.getElementById('reportSetup');
  var outputCard = document.getElementById('outputCard');
  var noKeyBanner = document.getElementById('noKeyBanner');

  var STAGE_NAMES = { 1: 'Perfil da empresa', 2: 'Dor principal', 3: 'Consequências', 4: 'Comercial, margem e pós-venda', 5: 'Priorização e fechamento' };
  var ESTIMATED_QUESTIONS = 26; // faixa típica citada no prompt (20–30); usada só para dar sensação de avanço, não é um total fixo
  var currentStage = 0;
  var questionCount = 0;
  var stageTextEl = document.getElementById('stageText');
  var progressCountEl = document.getElementById('progressCount');
  var progressFillEl = document.getElementById('progressFill');

  function updateStage(stage) {
    if (stage && stage !== currentStage) currentStage = stage;
    if (stageTextEl) stageTextEl.textContent = STAGE_NAMES[currentStage] || 'Contexto';
  }
  function updateProgress(done) {
    if (progressCountEl) progressCountEl.textContent = 'pergunta ' + questionCount;
    var pct = done ? 100 : Math.min(96, Math.round((questionCount / ESTIMATED_QUESTIONS) * 100));
    if (progressFillEl) progressFillEl.style.width = pct + '%';
  }
  function finalizeStepper() {
    currentStage = 5;
    updateStage(5);
    updateProgress(true);
  }

  // --- Resposta por áudio (Web Speech API — reconhecimento no próprio navegador, sem custo de API) ---
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = null;
  var isRecording = false;
  var micBaseText = '';
  var ICON_MIC = '<svg class="ico-mic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';

  function stopRecording() {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.innerHTML = ICON_MIC;
    micBtn.title = 'Responder por áudio';
    if (recognition) { try { recognition.stop(); } catch (e) {} }
  }
  function startRecording() {
    if (!recognition) return;
    micBaseText = answerInput.value.trim();
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.innerHTML = ICON_STOP;
    micBtn.title = 'Parar gravação';
    try { recognition.start(); } catch (e) { stopRecording(); }
  }

  if (!SpeechRecognitionCtor) {
    micBtn.hidden = true;
    document.getElementById('micHint').hidden = false;
    answerInput.placeholder = 'Digite a resposta e pressione Enter...';
  } else {
    recognition = new SpeechRecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = function (event) {
      var interim = '', final = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) micBaseText = (micBaseText ? micBaseText + ' ' : '') + final.trim();
      answerInput.value = (micBaseText + ' ' + interim).trim();
      answerInput.style.height = 'auto';
      answerInput.style.height = Math.min(answerInput.scrollHeight, 140) + 'px';
    };
    recognition.onerror = function (e) {
      stopRecording();
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setStatus('Permissão de microfone negada — habilite o acesso ao microfone para o navegador.');
      }
    };
    recognition.onend = function () {
      if (isRecording) stopRecording();
    };
    micBtn.addEventListener('click', function () {
      if (isRecording) { stopRecording(); return; }
      startRecording();
    });
  }

  // --- Privacidade / LGPD (rodapé abre um diálogo) ---
  (function () {
    var dlg = document.getElementById('privacyDialog');
    var open = document.getElementById('privacyBtn');
    if (!dlg || !open) return;
    var close = function () { if (dlg.open) dlg.close(); };
    open.addEventListener('click', function () {
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    });
    document.getElementById('privacyClose').addEventListener('click', close);
    document.getElementById('privacyOk').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  })();

  // Rolar a página com um campo numérico focado muda o valor dele no Chrome/Firefox — tira o foco antes.
  document.addEventListener('wheel', function () {
    var a = document.activeElement;
    if (a && a.tagName === 'INPUT' && a.type === 'number') a.blur();
  }, { passive: true });

  // --- Calculadora do custo médio da hora (custo total da equipe ÷ horas produtivas) ---
  (function () {
    var toggle = document.getElementById('calcToggle');
    var box = document.getElementById('calcBox');
    var custoEl = document.getElementById('calcCusto');
    var pessoasEl = document.getElementById('calcPessoas');
    var horasDiaEl = document.getElementById('calcHorasDia');
    var diasEl = document.getElementById('calcDias');
    var valueEl = document.getElementById('calcValue');
    var formulaEl = document.getElementById('calcFormula');
    var useBtn = document.getElementById('calcUse');
    var hourlyEl = document.getElementById('hourlyCost');
    if (!toggle || !box) return;

    var fmt = function (n) { return 'R$ ' + Math.round(n).toLocaleString('pt-BR'); };
    var result = null;

    function recalc() {
      var custo = parseFloat(custoEl.value);
      var pessoas = parseFloat(pessoasEl.value);
      var horasDia = parseFloat(horasDiaEl.value);
      var dias = parseFloat(diasEl.value);
      if (!(custo > 0) || !(pessoas > 0) || !(horasDia > 0) || !(dias > 0)) {
        result = null;
        valueEl.textContent = '—';
        formulaEl.textContent = '';
        useBtn.disabled = true;
        return;
      }
      // 20% da jornada vai pra reunião interna, treinamento e pausa — só o restante é hora produtiva.
      var FATOR_PRODUTIVO = 0.8;
      var horasJornada = pessoas * horasDia * dias;
      var horasProdutivas = horasJornada * FATOR_PRODUTIVO;
      result = custo / horasProdutivas;
      valueEl.textContent = fmt(result) + '/h';
      formulaEl.textContent = fmt(custo) + ' ÷ (' + pessoas + ' pessoas × ' + horasDia.toLocaleString('pt-BR') + ' h × ' + dias + ' dias = ' + horasJornada.toLocaleString('pt-BR') + ' h de jornada − 20% = ' + Math.round(horasProdutivas).toLocaleString('pt-BR') + ' h produtivas)';
      useBtn.disabled = false;
    }

    toggle.addEventListener('click', function () {
      var open = box.hidden;
      box.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Fechar calculadora' : 'Não sabe? Calcule aqui';
      if (open) custoEl.focus();
    });
    [custoEl, pessoasEl, horasDiaEl, diasEl].forEach(function (el) { el.addEventListener('input', recalc); });
    useBtn.addEventListener('click', function () {
      if (result === null) return;
      hourlyEl.value = Math.round(result);
      box.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Não sabe? Calcule aqui';
      hourlyEl.focus();
    });
  })();

  fetch('/api/health').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.hasKey) noKeyBanner.hidden = false;
  }).catch(function () {});

  function addMsg(text, who, meta) {
    displayLog.push({ who: who, text: text });
    var wrap = document.createElement('div');
    wrap.className = 'msg-wrap ' + who;
    if (meta) {
      var metaEl = document.createElement('div');
      metaEl.className = 'msg-meta';
      metaEl.textContent = meta;
      wrap.appendChild(metaEl);
    }
    var row = document.createElement('div');
    row.className = 'msg ' + who;
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    wrap.appendChild(row);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function addTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'msg-wrap bot';
    wrap.id = 'typingRow';
    var row = document.createElement('div');
    row.className = 'msg bot typing';
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = 'digitando...';
    row.appendChild(bubble);
    wrap.appendChild(row);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    var row = document.getElementById('typingRow');
    if (row) row.remove();
  }

  function setInputEnabled(enabled) {
    answerInput.disabled = !enabled;
    sendBtn.disabled = !enabled;
    micBtn.disabled = !enabled;
    if (!enabled && isRecording) stopRecording();
  }

  async function callChat() {
    addTyping();
    setInputEnabled(false);
    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: messages, siteContext: siteContext })
      });
      var data = await res.json();
      removeTyping();
      if (!res.ok) {
        addMsg('Erro: ' + (data.error || 'falha desconhecida'), 'bot');
        messages.pop(); // rollback the unanswered user turn so a retry doesn't send two user messages in a row
        setInputEnabled(true);
        answerInput.focus();
        return;
      }
      messages.push({ role: 'assistant', content: data.reply });
      questionCount++;
      updateStage(data.stage);
      updateProgress(false);
      addMsg(data.reply, 'bot', (STAGE_NAMES[currentStage] || 'Contexto') + ' · pergunta ' + questionCount);
      if (data.done) {
        interviewDone = true;
        finishBtn.disabled = false;
        finishBtn.title = '';
        finalizeStepper();
        answerInput.placeholder = 'Entrevista concluída.';
        setInputEnabled(false);
        chatCard.style.display = 'none';
        reportSetup.style.display = 'block';
        reportSetup.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    } catch (err) {
      removeTyping();
      addMsg('Erro de conexão: ' + err.message, 'bot');
      messages.pop();
    }
    setInputEnabled(true);
    answerInput.focus();
  }

  var introStatusEl = document.getElementById('introStatus');
  document.getElementById('startBtn').addEventListener('click', async function () {
    var startBtnEl = document.getElementById('startBtn');
    companyName = document.getElementById('companyName').value.trim() || 'a empresa';
    hourlyCost = parseFloat(document.getElementById('hourlyCost').value) || 60;
    var websiteUrl = document.getElementById('websiteUrl').value.trim();

    if (websiteUrl) {
      startBtnEl.disabled = true;
      introStatusEl.textContent = 'Lendo o site da empresa...';
      try {
        var scrapeRes = await fetch('/api/scrape-site', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: websiteUrl })
        });
        var scrapeData = await scrapeRes.json();
        if (scrapeRes.ok && scrapeData.text) {
          siteContext = scrapeData.text;
          introStatusEl.textContent = (scrapeData.pagesFetched.length) + ' página(s) lida(s): ' + scrapeData.pagesFetched.join(', ');
        } else {
          introStatusEl.textContent = scrapeData.warning || scrapeData.error || 'Não foi possível ler o site — seguindo sem esse contexto.';
        }
      } catch (err) {
        introStatusEl.textContent = 'Não foi possível ler o site (' + err.message + ') — seguindo sem esse contexto.';
      }
      startBtnEl.disabled = false;
    }

    introEl.style.display = 'none';
    chatCard.style.display = 'block';
    finishBtn.style.display = 'inline-block';
    finishBtn.disabled = true;
    finishBtn.title = 'Libera quando a Ana terminar todas as perguntas';
    updateStage(1);
    messages.push({ role: 'user', content: 'Pode começar a entrevista. Empresa: ' + companyName + '.' });
    callChat();
  });

  function submitAnswer() {
    if (isRecording) stopRecording();
    var text = answerInput.value.trim();
    if (!text || interviewDone) return;
    messages.push({ role: 'user', content: text });
    addMsg(text, 'user');
    answerInput.value = '';
    answerInput.style.height = 'auto';
    callChat();
  }

  sendBtn.addEventListener('click', submitAnswer);
  answerInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  });
  answerInput.addEventListener('input', function () {
    answerInput.style.height = 'auto';
    answerInput.style.height = Math.min(answerInput.scrollHeight, 140) + 'px';
  });

  finishBtn.addEventListener('click', function () {
    interviewDone = true;
    finalizeStepper();
    chatCard.style.display = 'none';
    reportSetup.style.display = 'block';
    reportSetup.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function buildTranscriptText() {
    var lines = [];
    lines.push('# Transcrição — Entrevista de Assessment de IA');
    lines.push('## Empresa: ' + companyName);
    lines.push('## Data: ' + new Date().toLocaleDateString('pt-BR'));
    lines.push('');
    displayLog.forEach(function (item) {
      var label = item.who === 'bot' ? 'Ana' : companyName;
      lines.push('**' + label + ':** ' + item.text);
      lines.push('');
    });
    return lines.join('\n');
  }

  function setStatus(msg) { document.getElementById('statusMsg').textContent = msg || ''; }
  function setReportStatus(msg) { document.getElementById('reportStatus').textContent = msg || ''; }

  var GEN_PHASES = [
    { atSeconds: 0, text: 'Enviando a transcrição...' },
    { atSeconds: 6, text: 'Analisando a dor principal e as consequências...' },
    { atSeconds: 20, text: 'Pesquisando ferramentas e benchmarks reais na web...' },
    { atSeconds: 60, text: 'Montando o diagnóstico...' },
    { atSeconds: 90, text: 'Montando a oferta — promessa, garantia, entregáveis...' },
    { atSeconds: 140, text: 'Quase lá — a busca na web às vezes demora um pouco mais...' }
  ];

  var genProgressEl = document.getElementById('genProgress');
  var genPhaseEl = document.getElementById('genPhase');
  var genTimerEl = document.getElementById('genTimer');
  var cancelReportBtn = document.getElementById('cancelReportBtn');
  var genTimerHandle = null;
  var genStartTime = 0;
  var genAbortController = null;

  function formatElapsed(totalSeconds) {
    if (totalSeconds < 60) return totalSeconds + 's';
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + 'm ' + s + 's';
  }

  function startGenProgress() {
    genStartTime = Date.now();
    genProgressEl.hidden = false;
    genPhaseEl.textContent = GEN_PHASES[0].text;
    genTimerEl.textContent = '0s';
    genTimerHandle = setInterval(function () {
      var elapsed = Math.floor((Date.now() - genStartTime) / 1000);
      genTimerEl.textContent = formatElapsed(elapsed);
      var current = GEN_PHASES[0];
      for (var i = 0; i < GEN_PHASES.length; i++) {
        if (elapsed >= GEN_PHASES[i].atSeconds) current = GEN_PHASES[i];
      }
      genPhaseEl.textContent = current.text;
    }, 1000);
  }

  function stopGenProgress() {
    if (genTimerHandle) { clearInterval(genTimerHandle); genTimerHandle = null; }
    genProgressEl.hidden = true;
  }

  cancelReportBtn.addEventListener('click', function () {
    if (genAbortController) genAbortController.abort();
  });

  var lastReportUrl = null;
  var lastReportFilename = 'diagnostico-crescimento.html';

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById('generateReportBtn').addEventListener('click', async function () {
    var btn = document.getElementById('generateReportBtn');
    btn.disabled = true;
    setReportStatus('');
    startGenProgress();
    genAbortController = new AbortController();
    try {
      var res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ transcript: buildTranscriptText(), companyName: companyName, hourlyCost: hourlyCost, siteContext: siteContext }),
        signal: genAbortController.signal
      });
      stopGenProgress();
      var data = await res.json();
      if (!res.ok || data.error) {
        setReportStatus('Erro: ' + (data.error || 'falha desconhecida'));
        btn.disabled = false;
        return;
      }
      lastReportUrl = data.url;
      lastReportFilename = data.filename || ('diagnostico-crescimento-' + slug(companyName) + '.html');
      window.open(lastReportUrl, '_blank');

      var fullUrl = window.location.origin + lastReportUrl;
      var linkEl = document.getElementById('reportLink');
      linkEl.href = lastReportUrl;
      linkEl.textContent = fullUrl;
      document.getElementById('outputMeta').textContent = companyName + ' · gerado em ' + new Date().toLocaleString('pt-BR');
      reportSetup.style.display = 'none';
      outputCard.style.display = 'block';
      outputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      stopGenProgress();
      if (err.name === 'AbortError') {
        setReportStatus('Geração cancelada.');
      } else {
        setReportStatus('Erro de conexão: ' + err.message);
      }
      btn.disabled = false;
    }
  });

  function downloadFile(filename, text) {
    downloadBlob(new Blob([text], { type: 'text/markdown' }), filename);
  }

  function slug(s) { return (s || 'empresa').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  document.getElementById('openReportBtn').addEventListener('click', function () {
    if (!lastReportUrl) { setStatus('Gere o diagnóstico primeiro.'); return; }
    window.open(lastReportUrl, '_blank');
  });
  document.getElementById('downloadHtmlBtn').addEventListener('click', async function () {
    if (!lastReportUrl) { setStatus('Gere o diagnóstico primeiro.'); return; }
    var res = await fetch(lastReportUrl);
    downloadBlob(await res.blob(), lastReportFilename);
    setStatus('Página baixada.');
  });
  document.getElementById('copyLinkBtn').addEventListener('click', async function () {
    if (!lastReportUrl) { setStatus('Gere o diagnóstico primeiro.'); return; }
    try {
      await navigator.clipboard.writeText(window.location.origin + lastReportUrl);
      setStatus('Link copiado.');
    } catch (e) {
      setStatus('Não foi possível copiar — selecione o link acima.');
    }
  });
  document.getElementById('downloadTranscriptBtn').addEventListener('click', function () {
    downloadFile('transcricao-' + slug(companyName) + '.md', buildTranscriptText());
    setStatus('Transcrição baixada.');
  });
})();
