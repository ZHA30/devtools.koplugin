(function () {
  "use strict";

  const AUTH_STORAGE_KEY = "devtools_auth_code";
  const THEME_STORAGE_KEY = "devtools_theme_mode";
  const MAX_LINES = 5000;
  const POLL_INTERVAL_MS = 1000;

  const messages = {
    en: {
      tab_logs: "Logs",
      tab_files: "Files",
      theme_light: "Theme: Light",
      theme_dark: "Theme: Dark",
      btn_clear: "Clear",
      btn_prev: "Prev",
      btn_next: "Next",
      btn_restart: "Restart",
      auth_title: "Authentication required",
      auth_hint: "Enter authentication code to continue.",
      auth_placeholder: "Authentication code",
      auth_cancel: "Cancel",
      auth_unlock: "Unlock",
      auth_empty: "Authentication code cannot be empty.",
      auth_failed: "Authentication failed. Please retry.",
      prompt_auth: "Authentication required by Devtools service.",
      confirm_clear: "Clear log file?",
      error_clear: "Clear log failed: %1",
      error_sessions: "Load sessions failed: %1",
      error_poll: "Load logs failed: %1",
      error_restart: "Restart failed: %1",
      empty_logs: "",
    },
    zh: {
      tab_logs: "日志",
      tab_files: "文件",
      theme_light: "主题：浅色",
      theme_dark: "主题：深色",
      btn_clear: "清除",
      btn_prev: "上一页",
      btn_next: "下一页",
      btn_restart: "重启",
      auth_title: "需要认证",
      auth_hint: "请输入认证码以继续。",
      auth_placeholder: "认证码",
      auth_cancel: "取消",
      auth_unlock: "确认",
      auth_empty: "认证码不能为空。",
      auth_failed: "认证失败，请重试。",
      prompt_auth: "Devtools 服务需要认证。",
      confirm_clear: "确认清空日志文件吗？",
      error_clear: "清空日志失败：%1",
      error_sessions: "加载日志分段失败：%1",
      error_poll: "读取日志失败：%1",
      error_restart: "重启失败：%1",
      empty_logs: "",
    },
  };

  const state = {
    lang: /^zh\b/i.test(navigator.language || "") ? "zh" : "en",
    authCode: window.localStorage.getItem(AUTH_STORAGE_KEY) || "",
    theme: window.localStorage.getItem(THEME_STORAGE_KEY)
      || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    sessions: [],
    segmentIndex: -1,
    cursor: 0,
    tail: "",
    lines: [],
    polling: false,
    pollTimer: null,
  };

  const els = {
    tabLogs: document.querySelector("#tab-logs"),
    tabFiles: document.querySelector("#tab-files"),
    themeToggle: document.querySelector("#theme-toggle"),
    clearBtn: document.querySelector("#btn-clear-log"),
    prevBtn: document.querySelector("#btn-prev-segment"),
    nextBtn: document.querySelector("#btn-next-segment"),
    restartBtn: document.querySelector("#btn-restart"),
    logOutput: document.querySelector("#log-output"),
    authModal: document.querySelector("#auth-modal"),
    authTitle: document.querySelector("#auth-title"),
    authMessage: document.querySelector("#auth-message"),
    authInput: document.querySelector("#auth-code"),
    authError: document.querySelector("#auth-error"),
    authSubmit: document.querySelector("#btn-auth-submit"),
    authCancel: document.querySelector("#btn-auth-cancel"),
  };

  let authResolver = null;
  let authPromise = null;

  function t(key, p1) {
    const table = messages[state.lang] || messages.en;
    const raw = table[key] || messages.en[key] || key;
    return p1 == null ? raw : raw.replace("%1", String(p1));
  }

  function notifyError(message) {
    window.alert(message);
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    els.themeToggle.textContent = state.theme === "dark" ? t("theme_dark") : t("theme_light");
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    els.tabLogs.textContent = t("tab_logs");
    els.tabFiles.textContent = t("tab_files");
    els.clearBtn.textContent = t("btn_clear");
    els.prevBtn.textContent = t("btn_prev");
    els.nextBtn.textContent = t("btn_next");
    els.restartBtn.textContent = t("btn_restart");
    els.authTitle.textContent = t("auth_title");
    els.authMessage.textContent = t("auth_hint");
    els.authInput.placeholder = t("auth_placeholder");
    els.authCancel.textContent = t("auth_cancel");
    els.authSubmit.textContent = t("auth_unlock");
  }

  function hideAuthModal() {
    els.authModal.classList.add("hidden");
    els.authError.textContent = "";
  }

  function resolveAuth(value) {
    if (!authResolver) return;
    const done = authResolver;
    authResolver = null;
    hideAuthModal();
    done(value);
  }

  function promptAuth(message, withError) {
    if (!els.authModal) {
      const entered = window.prompt(message || t("prompt_auth")) || "";
      return Promise.resolve(entered || null);
    }

    if (authPromise) {
      return authPromise;
    }

    els.authMessage.textContent = message || t("prompt_auth");
    els.authError.textContent = withError ? t("auth_failed") : "";
    els.authInput.value = state.authCode || "";
    els.authModal.classList.remove("hidden");

    authPromise = new Promise((resolve) => {
      authResolver = resolve;
      window.setTimeout(() => {
        els.authInput.focus();
        els.authInput.select();
      }, 0);
    }).finally(() => {
      authPromise = null;
    });

    return authPromise;
  }

  async function apiFetch(path, options) {
    let retried = 0;

    while (true) {
      const init = Object.assign({ method: "GET" }, options || {});
      init.headers = Object.assign({}, (options && options.headers) || {});
      if (state.authCode) {
        init.headers["X-Auth-Code"] = state.authCode;
      }

      const response = await fetch(path, init);
      if (response.status !== 401) {
        return response;
      }

      if (retried >= 2) {
        return response;
      }

      const entered = await promptAuth(t("prompt_auth"), retried > 0);
      if (entered === null) {
        return response;
      }

      state.authCode = String(entered || "").trim();
      if (state.authCode) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, state.authCode);
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      retried += 1;
    }
  }

  function isNearBottom() {
    return els.logOutput.scrollHeight - els.logOutput.scrollTop - els.logOutput.clientHeight < 24;
  }

  function trimOverflow() {
    while (state.lines.length > MAX_LINES) {
      state.lines.shift();
    }
  }

  function renderLog(stickToBottom) {
    const output = state.tail ? state.lines.concat(state.tail) : state.lines;
    els.logOutput.textContent = output.length ? output.join("\n") : t("empty_logs");
    if (stickToBottom) {
      els.logOutput.scrollTop = els.logOutput.scrollHeight;
    }
  }

  function appendChunk(chunk) {
    const payload = state.tail + String(chunk || "");
    const rows = payload.split(/\r?\n/);
    state.tail = rows.pop() || "";

    for (const line of rows) {
      state.lines.push(line);
    }

    trimOverflow();
  }

  function updatePagerButtons() {
    const hasSessions = state.sessions.length > 0;
    const last = state.sessions.length - 1;
    els.prevBtn.disabled = !hasSessions || state.segmentIndex <= 0;
    els.nextBtn.disabled = !hasSessions || state.segmentIndex >= last;
  }

  async function fetchSessions() {
    const response = await apiFetch("/api/logs/sessions?limit=512");
    if (!response.ok) {
      notifyError(t("error_sessions", response.status));
      return false;
    }

    const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
    if (!data.ok) {
      notifyError(t("error_sessions", data.error || "unknown"));
      return false;
    }

    const previousOffset = state.sessions[state.segmentIndex]
      ? Number(state.sessions[state.segmentIndex].offset || 0)
      : null;

    const sessions = Array.isArray(data.sessions) ? data.sessions.slice() : [];
    sessions.sort((a, b) => Number(a.offset || 0) - Number(b.offset || 0));
    state.sessions = sessions.length > 0 ? sessions : [{ index: 1, offset: 0, label: "#1" }];

    if (previousOffset != null) {
      const idx = state.sessions.findIndex((session) => Number(session.offset || 0) === Number(previousOffset));
      if (idx >= 0) {
        state.segmentIndex = idx;
      } else {
        state.segmentIndex = state.sessions.length - 1;
      }
    } else {
      state.segmentIndex = state.sessions.length - 1;
    }

    updatePagerButtons();
    return true;
  }

  function currentSegmentStart() {
    if (state.segmentIndex < 0 || state.segmentIndex >= state.sessions.length) {
      return 0;
    }
    return Number(state.sessions[state.segmentIndex].offset || 0);
  }

  function currentSegmentEnd() {
    if (state.segmentIndex < 0 || state.segmentIndex >= state.sessions.length - 1) {
      return null;
    }
    return Number(state.sessions[state.segmentIndex + 1].offset || 0);
  }

  function isLatestSegment() {
    return state.segmentIndex >= 0 && state.segmentIndex === state.sessions.length - 1;
  }

  async function loadSegmentData(start, stop) {
    state.lines = [];
    state.tail = "";

    let cursor = Number(start || 0);

    while (true) {
      const response = await apiFetch(`/api/logs/poll?cursor=${cursor}&limit=65536`);
      if (!response.ok) {
        notifyError(t("error_poll", response.status));
        return false;
      }

      const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
      if (!data.ok) {
        notifyError(t("error_poll", data.error || "unknown"));
        return false;
      }

      const prevCursor = cursor;
      let chunk = String(data.data || "");
      let nextCursor = Number(data.next_cursor || cursor);

      if (stop !== null && nextCursor > stop) {
        const allowed = Math.max(0, stop - cursor);
        chunk = chunk.slice(0, allowed);
        nextCursor = stop;
      }

      if (chunk.length > 0) {
        appendChunk(chunk);
      }

      cursor = nextCursor;

      if (stop !== null) {
        if (cursor >= stop) break;
      } else if (data.eof) {
        break;
      }

      if (cursor <= prevCursor) {
        break;
      }
    }

    if (stop !== null) {
      state.tail = "";
    }

    state.cursor = cursor;
    renderLog(true);
    return true;
  }

  async function loadSegment(index) {
    if (!state.sessions.length) {
      state.segmentIndex = -1;
      state.cursor = 0;
      state.tail = "";
      state.lines = [];
      renderLog(true);
      updatePagerButtons();
      return;
    }

    let target = Number(index);
    if (!Number.isFinite(target)) {
      target = state.sessions.length - 1;
    }

    if (target < 0) target = 0;
    if (target >= state.sessions.length) target = state.sessions.length - 1;

    state.segmentIndex = target;
    updatePagerButtons();

    const start = currentSegmentStart();
    const stop = currentSegmentEnd();
    await loadSegmentData(start, stop);
  }

  async function pollLatestSegment() {
    if (state.polling || !isLatestSegment()) {
      return;
    }

    state.polling = true;

    try {
      const response = await apiFetch(`/api/logs/poll?cursor=${state.cursor}&limit=65536`);
      if (!response.ok) {
        return;
      }

      const data = await response.json().catch(() => ({ ok: false }));
      if (!data.ok) {
        return;
      }

      state.cursor = Number(data.next_cursor || state.cursor);
      if (data.data) {
        const stick = isNearBottom();
        appendChunk(data.data);
        renderLog(stick);
      }
    } finally {
      state.polling = false;
    }
  }

  function schedulePoll() {
    if (state.pollTimer) {
      window.clearTimeout(state.pollTimer);
    }

    state.pollTimer = window.setTimeout(async () => {
      await pollLatestSegment();
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }

  async function clearLogFile() {
    if (!window.confirm(t("confirm_clear"))) {
      return;
    }

    const response = await apiFetch("/api/logs/clear?action=truncate", {
      method: "POST",
    });

    const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
    if (!response.ok || !data.ok) {
      notifyError(t("error_clear", data.error || response.status));
      return;
    }

    const sessionsOk = await fetchSessions();
    if (!sessionsOk) {
      return;
    }

    await loadSegment(state.sessions.length - 1);
  }

  async function restartKOReader() {
    try {
      const response = await apiFetch("/api/system/restart", {
        method: "POST",
      });
      if (response.ok) {
        return;
      }

      const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
      notifyError(t("error_restart", data.error || response.status));
    } catch (err) {
      const message = (err && err.message) ? err.message : err;
      notifyError(t("error_restart", message || "network"));
    }
  }

  function bindAuthEvents() {
    els.authSubmit.addEventListener("click", () => {
      const value = String(els.authInput.value || "").trim();
      if (!value) {
        els.authError.textContent = t("auth_empty");
        return;
      }
      resolveAuth(value);
    });

    els.authCancel.addEventListener("click", () => {
      resolveAuth(null);
    });

    els.authModal.addEventListener("click", (ev) => {
      if (ev.target === els.authModal) {
        resolveAuth(null);
      }
    });

    els.authInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        els.authSubmit.click();
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !els.authModal.classList.contains("hidden")) {
        resolveAuth(null);
      }
    });
  }

  function bindEvents() {
    els.themeToggle.addEventListener("click", () => {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });

    els.clearBtn.addEventListener("click", clearLogFile);

    els.prevBtn.addEventListener("click", async () => {
      await loadSegment(state.segmentIndex - 1);
    });

    els.nextBtn.addEventListener("click", async () => {
      await loadSegment(state.segmentIndex + 1);
    });

    els.restartBtn.addEventListener("click", restartKOReader);
  }

  async function init() {
    applyI18n();
    applyTheme(state.theme);
    bindAuthEvents();
    bindEvents();

    const sessionsOk = await fetchSessions();
    if (sessionsOk) {
      await loadSegment(state.segmentIndex);
    }

    schedulePoll();
  }

  init();
})();
