(function () {
  "use strict";

  const AUTH_STORAGE_KEY = "devtools_auth_code";
  const THEME_STORAGE_KEY = "devtools_theme_mode";
  const MAX_LINES = 5000;
  const POLL_INTERVAL_MS = 1000;
  const HEALTH_CHECK_INTERVAL_MS = 1200;
  const RECONNECT_MAX_ATTEMPTS = 40;

  const messages = {
    en: {
      tab_logs: "Logs",
      tab_files: "Files",
      theme_light: "Theme: ☼",
      theme_dark: "Theme: ☾",
      repo_label: "Powered by",
      btn_upload_files: "Upload files",
      btn_upload_folder: "Upload folder",
      btn_refresh: "Refresh",
      btn_restart: "Restart",
      btn_stop_service: "Stop service",
      btn_clear: "Clear",
      btn_prev: "Prev",
      btn_next: "Next",
      th_name: "Name",
      th_modified: "Modified",
      sort_asc: "asc",
      sort_desc: "desc",
      root: "🏠",
      empty_folder: "Current folder is empty.",
      dir_parent: "⬆ .. (Parent folder)",
      dir_prefix: "📁 %1",
      auth_title: "Authentication required",
      auth_hint: "Enter authentication code to continue.",
      auth_placeholder: "Authentication code",
      auth_cancel: "Cancel",
      auth_unlock: "Unlock",
      auth_empty: "Authentication code cannot be empty.",
      auth_failed: "Authentication failed. Please retry.",
      prompt_auth: "Authentication required by Devtools service.",
      menu_open: "Open",
      menu_download: "Download",
      menu_move: "Move",
      menu_delete: "Delete",
      menu_close: "Close",
      error_list: "List failed (%1)",
      error_list_data: "List error: %1",
      error_mkdir: "Create folder failed: %1",
      error_upload: "Upload failed: %1",
      error_download: "Download failed (%1)",
      error_move: "Move failed: %1",
      error_move_empty: "Target path cannot be empty.",
      error_delete: "Delete failed: %1",
      error_restart: "Restart failed: %1",
      error_stop_service: "Stop service failed: %1",
      error_clear: "Clear log failed: %1",
      success_clear: "Log cleared.",
      success_refresh: "Refreshed.",
      success_restart: "Restart requested. KOReader is restarting...",
      success_stop_service: "Stop request sent. Devtools service is shutting down.",
      pending_restart: "Sending restart request...",
      pending_stop_service: "Sending stop request...",
      reconnecting: "Reconnecting...",
      status_online: "Online",
      status_reconnecting: "Reconnecting...",
      status_offline: "Offline",
      success_reconnected: "Reconnected successfully.",
      error_reconnect_timeout: "Reconnection timed out.",
      error_sessions: "Load sessions failed: %1",
      error_poll: "Load logs failed: %1",
      error_select_file: "Select at least one file.",
      error_select_entry: "Select at least one entry.",
      confirm_clear: "Clear log file?",
      confirm_delete: "Delete %1 selected item(s)?",
      prompt_move_path: "Move to path (relative to root):",
      prompt_move_folder: "Move selected items to folder (blank = root):",
      confirm_move_overwrite: "Target already exists:\n%1\nOverwrite?",
      empty_logs: "",
      upload_title_files: "Uploading files",
      upload_title_folder: "Uploading folder",
      upload_meta: "File %1/%2 · %3/%4",
      upload_current: "Current: %1",
      upload_pending: "Waiting...",
      upload_preparing: "Preparing folder structure...",
    },
    zh: {
      tab_logs: "日志",
      tab_files: "文件",
      theme_light: "主题：☼",
      theme_dark: "主题：☾",
      repo_label: "Powered by",
      btn_upload_files: "上传文件",
      btn_upload_folder: "上传文件夹",
      btn_refresh: "刷新",
      btn_restart: "重启",
      btn_stop_service: "关闭服务",
      btn_clear: "清除",
      btn_prev: "上一页",
      btn_next: "下一页",
      th_name: "文件名",
      th_modified: "最近修改",
      sort_asc: "升序",
      sort_desc: "降序",
      root: "🏠",
      empty_folder: "当前目录为空。",
      dir_parent: "⬆ ..（返回上一级）",
      dir_prefix: "📁 %1",
      auth_title: "需要认证",
      auth_hint: "请输入认证码以继续。",
      auth_placeholder: "认证码",
      auth_cancel: "取消",
      auth_unlock: "确认",
      auth_empty: "认证码不能为空。",
      auth_failed: "认证失败，请重试。",
      prompt_auth: "Devtools 服务需要认证。",
      menu_open: "打开",
      menu_download: "下载",
      menu_move: "移动",
      menu_delete: "删除",
      menu_close: "关闭",
      error_list: "读取目录失败（%1）",
      error_list_data: "目录错误：%1",
      error_mkdir: "创建目录失败：%1",
      error_upload: "上传失败：%1",
      error_download: "下载失败（%1）",
      error_move: "移动失败：%1",
      error_move_empty: "目标路径不能为空。",
      error_delete: "删除失败：%1",
      error_restart: "重启失败：%1",
      error_stop_service: "关闭服务失败：%1",
      error_clear: "清空日志失败：%1",
      success_clear: "日志已清空。",
      success_refresh: "已刷新。",
      success_restart: "已发送重启请求，KOReader 正在重启。",
      success_stop_service: "已发送关闭请求，Devtools 服务正在停止。",
      pending_restart: "正在发送重启请求...",
      pending_stop_service: "正在发送关闭请求...",
      reconnecting: "重连中...",
      status_online: "在线",
      status_reconnecting: "重连中...",
      status_offline: "离线",
      success_reconnected: "重连成功。",
      error_reconnect_timeout: "重连超时。",
      error_sessions: "加载日志分段失败：%1",
      error_poll: "读取日志失败：%1",
      error_select_file: "请至少选择一个文件。",
      error_select_entry: "请至少选择一个条目。",
      confirm_clear: "确认清空日志文件吗？",
      confirm_delete: "确认删除已选择的 %1 个条目吗？",
      prompt_move_path: "移动到路径（相对根目录）：",
      prompt_move_folder: "将已选项目移动到目录（留空=根目录）：",
      confirm_move_overwrite: "目标已存在：\n%1\n是否覆盖？",
      empty_logs: "",
      upload_title_files: "正在上传文件",
      upload_title_folder: "正在上传文件夹",
      upload_meta: "文件 %1/%2 · %3/%4",
      upload_current: "当前：%1",
      upload_pending: "等待中...",
      upload_preparing: "正在准备文件夹结构...",
    },
  };

  function createUploadProgressState() {
    return {
      titleKey: "upload_title_files",
      totalFiles: 0,
      uploadedFiles: 0,
      totalBytes: 0,
      uploadedBytes: 0,
      currentName: "",
      currentSize: 0,
      currentLoaded: 0,
    };
  }

  const state = {
    lang: /^zh\b/i.test(navigator.language || "") ? "zh" : "en",
    authCode: window.localStorage.getItem(AUTH_STORAGE_KEY) || "",
    theme: window.localStorage.getItem(THEME_STORAGE_KEY)
      || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    serviceState: "reconnecting",
    path: "",
    entries: [],
    selectedPaths: new Set(),
    sortKey: "name",
    sortDir: "asc",
    sessions: [],
    segmentIndex: -1,
    cursor: 0,
    tail: "",
    lines: [],
    polling: false,
    pollTimer: null,
    healthCheckTimer: null,
    isUploading: false,
    uploadProgress: createUploadProgressState(),
  };

  const els = {
    tabLogs: document.querySelector("#tab-logs"),
    tabFiles: document.querySelector("#tab-files"),
    repoLabel: document.querySelector("#repo-label"),
    serviceStatus: document.querySelector("#service-status"),
    serviceStatusIcon: document.querySelector("#service-status-icon"),
    serviceStatusText: document.querySelector("#service-status-text"),
    themeToggle: document.querySelector("#theme-toggle"),
    uploadFilesBtn: document.querySelector("#btn-upload-files"),
    uploadFolderBtn: document.querySelector("#btn-upload-folder"),
    refreshBtn: document.querySelector("#btn-refresh"),
    restartBtn: document.querySelector("#btn-restart"),
    stopServiceBtn: document.querySelector("#btn-stop-service"),
    clearBtn: document.querySelector("#btn-clear-log"),
    prevBtn: document.querySelector("#btn-prev-segment"),
    nextBtn: document.querySelector("#btn-next-segment"),
    crumbs: document.querySelector("#path-crumbs"),
    thName: document.querySelector("#th-name"),
    thModified: document.querySelector("#th-modified"),
    checkAll: document.querySelector("#check-all"),
    tableBody: document.querySelector("#remote-table tbody"),
    logOutput: document.querySelector("#log-output"),
    uploadInput: document.querySelector("#upload-input"),
    uploadFolderInput: document.querySelector("#upload-folder-input"),
    dropzone: document.querySelector("#file-dropzone"),
    contextMenu: document.querySelector("#file-context-menu"),
    authModal: document.querySelector("#auth-modal"),
    authTitle: document.querySelector("#auth-title"),
    authMessage: document.querySelector("#auth-message"),
    authInput: document.querySelector("#auth-code"),
    authError: document.querySelector("#auth-error"),
    authSubmit: document.querySelector("#btn-auth-submit"),
    authCancel: document.querySelector("#btn-auth-cancel"),
    uploadProgress: document.querySelector("#upload-progress"),
    uploadProgressTitle: document.querySelector("#upload-progress-title"),
    uploadProgressMeta: document.querySelector("#upload-progress-meta"),
    uploadProgressCurrent: document.querySelector("#upload-progress-current"),
    uploadProgressTrack: document.querySelector("#upload-progress-track"),
    uploadProgressBar: document.querySelector("#upload-progress-bar"),
    uploadProgressPercent: document.querySelector("#upload-progress-percent"),
    toast: document.querySelector("#toast"),
  };

  let authResolver = null;
  let authPromise = null;
  let toastTimer = null;
  let reconnectingRunId = 0;

  function t(key, ...args) {
    const table = messages[state.lang] || messages.en;
    const raw = table[key] || messages.en[key] || key;
    if (!args.length) {
      return raw;
    }

    let text = raw;
    args.forEach((arg, idx) => {
      const token = `%${idx + 1}`;
      text = text.split(token).join(String(arg));
    });
    return text;
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    els.themeToggle.textContent = state.theme === "dark" ? t("theme_dark") : t("theme_light");
  }

  function setServiceState(nextState) {
    const normalized = nextState === "online" || nextState === "offline" ? nextState : "reconnecting";
    state.serviceState = normalized;

    if (!els.serviceStatus) {
      return;
    }

    els.serviceStatus.classList.remove("is-online", "is-offline", "is-reconnecting");

    if (normalized === "online") {
      els.serviceStatus.classList.add("is-online");
      if (els.serviceStatusIcon) {
        els.serviceStatusIcon.textContent = "🟢";
      }
      if (els.serviceStatusText) {
        els.serviceStatusText.textContent = t("status_online");
      }
      return;
    }

    if (normalized === "offline") {
      els.serviceStatus.classList.add("is-offline");
      if (els.serviceStatusIcon) {
        els.serviceStatusIcon.textContent = "🔴";
      }
      if (els.serviceStatusText) {
        els.serviceStatusText.textContent = t("status_offline");
      }
      return;
    }

    els.serviceStatus.classList.add("is-reconnecting");
    if (els.serviceStatusIcon) {
      els.serviceStatusIcon.textContent = "🟡";
    }
    if (els.serviceStatusText) {
      els.serviceStatusText.textContent = t("status_reconnecting");
    }
  }

  function stopHealthCheckLoop() {
    if (state.healthCheckTimer) {
      window.clearTimeout(state.healthCheckTimer);
      state.healthCheckTimer = null;
    }
  }

  function scheduleHealthCheck(delayMs) {
    stopHealthCheckLoop();
    state.healthCheckTimer = window.setTimeout(() => {
      void probeServiceHealth();
    }, Math.max(0, Number(delayMs || HEALTH_CHECK_INTERVAL_MS)));
  }

  async function probeServiceHealth() {
    try {
      const response = await apiFetch("/api/health");
      if (!response.ok) {
        setServiceState("offline");
      } else {
        const data = await response.json().catch(() => ({ ok: false }));
        if (data && data.ok && data.running) {
          setServiceState("online");
        } else {
          setServiceState("offline");
        }
      }
    } catch (_err) {
      setServiceState("offline");
    }

    scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
  }

  async function waitForReconnected() {
    reconnectingRunId += 1;
    const runId = reconnectingRunId;

    setServiceState("reconnecting");

    for (let i = 0; i < RECONNECT_MAX_ATTEMPTS; i += 1) {
      if (runId !== reconnectingRunId) {
        return false;
      }

      try {
        const response = await apiFetch("/api/health");
        if (response.ok) {
          const data = await response.json().catch(() => ({ ok: false }));
          if (data && data.ok && data.running) {
            if (runId !== reconnectingRunId) {
              return false;
            }
            setServiceState("online");
            showToast(t("success_reconnected"), "success", 2200);
            scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
            return true;
          }
        }
      } catch (_err) {
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS);
      });
    }

    if (runId === reconnectingRunId) {
      setServiceState("offline");
      notifyError(t("error_reconnect_timeout"));
      scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
    }
    return false;
  }

  function updateSortHeaders() {
    const nameArrow = state.sortKey === "name" ? (state.sortDir === "asc" ? " ↑" : " ↓") : "";
    const modArrow = state.sortKey === "mtime" ? (state.sortDir === "asc" ? " ↑" : " ↓") : "";
    els.thName.textContent = `${t("th_name")}${nameArrow}`;
    els.thModified.textContent = `${t("th_modified")}${modArrow}`;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    els.tabLogs.textContent = t("tab_logs");
    els.tabFiles.textContent = t("tab_files");
    if (els.repoLabel) {
      els.repoLabel.textContent = t("repo_label");
    }
    setServiceState(state.serviceState);
    els.uploadFilesBtn.textContent = t("btn_upload_files");
    els.uploadFolderBtn.textContent = t("btn_upload_folder");
    els.refreshBtn.textContent = t("btn_refresh");
    els.restartBtn.textContent = t("btn_restart");
    els.stopServiceBtn.textContent = t("btn_stop_service");
    els.clearBtn.textContent = t("btn_clear");
    els.prevBtn.textContent = t("btn_prev");
    els.nextBtn.textContent = t("btn_next");
    updateSortHeaders();
    els.authTitle.textContent = t("auth_title");
    els.authMessage.textContent = t("auth_hint");
    els.authInput.placeholder = t("auth_placeholder");
    els.authCancel.textContent = t("auth_cancel");
    els.authSubmit.textContent = t("auth_unlock");
    renderUploadProgress();
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (!n || n < 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = n;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
  }

  function setUploadBusy(busy) {
    state.isUploading = !!busy;

    [
      els.uploadFilesBtn,
      els.uploadFolderBtn,
      els.uploadInput,
      els.uploadFolderInput,
      els.refreshBtn,
    ].forEach((el) => {
      if (el) {
        el.disabled = state.isUploading;
      }
    });

    if (state.isUploading) {
      closeContextMenu();
    }
  }

  function computeUploadPercent() {
    const progress = state.uploadProgress;
    if (progress.totalBytes > 0) {
      const loaded = Math.max(0, Math.min(
        progress.totalBytes,
        progress.uploadedBytes + progress.currentLoaded,
      ));
      return Math.round((loaded / progress.totalBytes) * 100);
    }

    if (progress.totalFiles <= 0) {
      return 0;
    }

    const partial = progress.currentSize > 0
      ? Math.max(0, Math.min(1, progress.currentLoaded / progress.currentSize))
      : 0;
    const completed = Math.max(0, Math.min(progress.totalFiles, progress.uploadedFiles + partial));
    return Math.round((completed / progress.totalFiles) * 100);
  }

  function renderUploadProgress() {
    if (!els.uploadProgress) {
      return;
    }

    const progress = state.uploadProgress;
    const currentIndex = progress.currentName
      ? Math.min(progress.totalFiles, progress.uploadedFiles + 1)
      : Math.min(progress.totalFiles, progress.uploadedFiles);
    const loadedBytes = Math.max(0, Math.min(
      progress.totalBytes,
      progress.uploadedBytes + progress.currentLoaded,
    ));
    const percent = Math.max(0, Math.min(100, computeUploadPercent()));

    if (els.uploadProgressTitle) {
      els.uploadProgressTitle.textContent = t(progress.titleKey);
    }
    if (els.uploadProgressMeta) {
      els.uploadProgressMeta.textContent = t(
        "upload_meta",
        currentIndex,
        progress.totalFiles,
        formatBytes(loadedBytes),
        formatBytes(progress.totalBytes),
      );
    }
    if (els.uploadProgressCurrent) {
      els.uploadProgressCurrent.textContent = progress.currentName
        ? t("upload_current", progress.currentName)
        : t("upload_pending");
    }
    if (els.uploadProgressBar) {
      els.uploadProgressBar.style.width = `${percent}%`;
    }
    if (els.uploadProgressTrack) {
      els.uploadProgressTrack.setAttribute("aria-valuenow", String(percent));
    }
    if (els.uploadProgressPercent) {
      els.uploadProgressPercent.textContent = `${percent}%`;
    }
  }

  function showUploadProgress(mode, files) {
    const list = Array.from(files || []);
    const totalBytes = list.reduce((sum, item) => sum + (Number(item.size) || 0), 0);

    state.uploadProgress = createUploadProgressState();
    state.uploadProgress.titleKey = mode === "folder" ? "upload_title_folder" : "upload_title_files";
    state.uploadProgress.totalFiles = list.length;
    state.uploadProgress.totalBytes = totalBytes;
    state.uploadProgress.currentName = mode === "folder" ? t("upload_preparing") : "";

    setUploadBusy(true);
    if (els.uploadProgress) {
      els.uploadProgress.classList.remove("hidden");
    }
    renderUploadProgress();
  }

  function setUploadCurrentFile(displayName, size) {
    const progress = state.uploadProgress;
    progress.currentName = displayName || "";
    progress.currentSize = Number(size) || 0;
    progress.currentLoaded = 0;
    renderUploadProgress();
  }

  function setUploadCurrentLoaded(loaded, total) {
    const progress = state.uploadProgress;
    const fileTotal = Number(total || progress.currentSize || 0);
    progress.currentSize = fileTotal;
    progress.currentLoaded = Math.max(0, Math.min(fileTotal || Number(loaded || 0), Number(loaded || 0)));
    renderUploadProgress();
  }

  function markUploadCurrentDone() {
    const progress = state.uploadProgress;
    progress.uploadedFiles += 1;
    progress.uploadedBytes += Number(progress.currentSize || 0);
    progress.currentName = "";
    progress.currentSize = 0;
    progress.currentLoaded = 0;
    renderUploadProgress();
  }

  function hideUploadProgress() {
    setUploadBusy(false);
    state.uploadProgress = createUploadProgressState();
    if (els.uploadProgress) {
      els.uploadProgress.classList.add("hidden");
    }
    renderUploadProgress();
  }

  function renderBreadcrumbs() {
    els.crumbs.innerHTML = "";

    const rootBtn = document.createElement("button");
    rootBtn.type = "button";
    rootBtn.className = "crumb-btn";
    rootBtn.textContent = t("root");
    rootBtn.addEventListener("click", async () => {
      await loadRemote("");
    });
    els.crumbs.appendChild(rootBtn);

    if (!state.path) {
      return;
    }

    const segments = state.path.split("/").filter(Boolean);
    let cursor = "";

    segments.forEach((segment) => {
      const sep = document.createElement("span");
      sep.className = "crumb-sep";
      sep.textContent = "/";
      els.crumbs.appendChild(sep);

      cursor = cursor ? `${cursor}/${segment}` : segment;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "crumb-btn";
      btn.textContent = segment;
      const target = cursor;
      btn.addEventListener("click", async () => {
        await loadRemote(target);
      });
      els.crumbs.appendChild(btn);
    });
  }

  function notifyError(message) {
    showToast(message, "error", 2600);
  }

  function showToast(message, type, durationMs) {
    if (!els.toast) {
      return;
    }

    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }

    els.toast.textContent = String(message || "");
    els.toast.classList.remove("hidden", "toast-success", "toast-error", "toast-info");

    const tone = type === "success" ? "toast-success" : (type === "error" ? "toast-error" : "toast-info");
    els.toast.classList.add(tone);

    const timeout = Number(durationMs || 1800);
    if (timeout > 0) {
      toastTimer = window.setTimeout(() => {
        els.toast.classList.add("hidden");
        els.toast.classList.remove("toast-success", "toast-error", "toast-info");
        toastTimer = null;
      }, timeout);
    }
  }

  function encodePath(path) {
    return encodeURIComponent(path || "");
  }

  function normalizeRelativePathInput(raw, allowEmpty) {
    const text = String(raw == null ? "" : raw).trim().replace(/\\/g, "/");
    const normalized = text
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .split("/")
      .filter((part) => part && part !== ".")
      .join("/");
    if (!allowEmpty && !normalized) {
      return null;
    }
    return normalized;
  }

  function parseFilenameFromDisposition(disposition) {
    if (!disposition) {
      return "";
    }

    const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (starMatch && starMatch[1]) {
      try {
        return decodeURIComponent(starMatch[1]);
      } catch (_err) {
        return starMatch[1];
      }
    }

    const quoteMatch = disposition.match(/filename=\"([^\"]+)\"/i);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1];
    }

    const plainMatch = disposition.match(/filename=([^;]+)/i);
    if (plainMatch && plainMatch[1]) {
      return plainMatch[1].trim();
    }

    return "";
  }

  function resolveDownloadName(response, fallbackName) {
    const header = response.headers.get("Content-Disposition") || "";
    const parsed = parseFilenameFromDisposition(header);
    return parsed || fallbackName || "download.bin";
  }

  function persistAuthCode() {
    if (state.authCode) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, state.authCode);
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
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
      persistAuthCode();
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
    showToast(t("success_clear"), "success", 1600);
  }

  function parseJSONSafe(raw) {
    if (!raw) {
      return { ok: false, error: "invalid_json" };
    }
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return { ok: false, error: "invalid_json" };
    }
  }

  function uploadOnce(path, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", path, true);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      if (state.authCode) {
        xhr.setRequestHeader("X-Auth-Code", state.authCode);
      }

      if (onProgress) {
        onProgress(0, file.size || 0);
        xhr.upload.onprogress = (ev) => {
          const total = ev.lengthComputable ? ev.total : (file.size || 0);
          const loaded = Number(ev.loaded || 0);
          const boundedLoaded = Math.max(0, Math.min(total || loaded, loaded));
          onProgress(boundedLoaded, total);
        };
      }

      xhr.onerror = () => {
        reject(new Error("network_error"));
      };
      xhr.onabort = () => {
        reject(new Error("aborted"));
      };
      xhr.onload = () => {
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          bodyText: xhr.responseText || "",
        });
      };

      xhr.send(file);
    });
  }

  async function apiUpload(path, file, onProgress) {
    let retried = 0;

    while (true) {
      const response = await uploadOnce(path, file, onProgress);
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
      persistAuthCode();
      retried += 1;
    }
  }

  function sortEntries(entries) {
    entries.sort((a, b) => {
      const ad = a.type === "directory";
      const bd = b.type === "directory";
      if (ad !== bd) return ad ? -1 : 1;

      let cmp = 0;
      if (state.sortKey === "mtime") {
        cmp = Number(a.mtime || 0) - Number(b.mtime || 0);
        if (cmp === 0) {
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }
      } else {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }

      return state.sortDir === "asc" ? cmp : -cmp;
    });
  }

  function formatMtime(tsSeconds) {
    const ts = Number(tsSeconds || 0);
    if (!ts) return "-";
    return new Date(ts * 1000).toLocaleString();
  }

  function selectedEntries() {
    const map = new Map();
    state.entries.forEach((entry) => {
      map.set(entry.path, entry);
    });

    const list = [];
    state.selectedPaths.forEach((path) => {
      if (map.has(path)) {
        list.push(map.get(path));
      }
    });
    return list;
  }

  function toggleSelect(path) {
    if (state.selectedPaths.has(path)) {
      state.selectedPaths.delete(path);
    } else {
      state.selectedPaths.add(path);
    }
  }

  function syncCheckAll(entries) {
    if (!entries.length) {
      els.checkAll.checked = false;
      els.checkAll.indeterminate = false;
      return;
    }

    const selectedVisible = entries.filter((entry) => state.selectedPaths.has(entry.path)).length;
    els.checkAll.checked = selectedVisible === entries.length;
    els.checkAll.indeterminate = selectedVisible > 0 && selectedVisible < entries.length;
  }

  function getParentPath(path) {
    const segments = String(path || "").split("/").filter(Boolean);
    if (!segments.length) {
      return "";
    }
    segments.pop();
    return segments.join("/");
  }

  function appendParentRow() {
    if (!state.path) {
      return;
    }

    const tr = document.createElement("tr");
    tr.className = "parent-row";

    const tdCheck = document.createElement("td");
    tdCheck.textContent = "";

    const tdName = document.createElement("td");
    const parentBtn = document.createElement("button");
    parentBtn.type = "button";
    parentBtn.className = "entry-link parent-link";
    parentBtn.textContent = t("dir_parent");
    parentBtn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await loadRemote(getParentPath(state.path));
    });
    tdName.appendChild(parentBtn);

    const tdMtime = document.createElement("td");
    tdMtime.textContent = "-";

    tr.appendChild(tdCheck);
    tr.appendChild(tdName);
    tr.appendChild(tdMtime);

    tr.addEventListener("dblclick", async () => {
      await loadRemote(getParentPath(state.path));
    });

    els.tableBody.appendChild(tr);
  }

  function renderRows() {
    const entries = state.entries.slice();
    sortEntries(entries);
    els.tableBody.innerHTML = "";

    appendParentRow();

    if (!entries.length && !state.path) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.className = "sheet-empty";
      td.textContent = t("empty_folder");
      tr.appendChild(td);
      els.tableBody.appendChild(tr);
      syncCheckAll(entries);
      return;
    }

    if (!entries.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.className = "sheet-empty";
      td.textContent = t("empty_folder");
      tr.appendChild(td);
      els.tableBody.appendChild(tr);
      syncCheckAll(entries);
      return;
    }

    entries.forEach((entry) => {
      const tr = document.createElement("tr");
      tr.dataset.path = entry.path;
      if (state.selectedPaths.has(entry.path)) {
        tr.classList.add("selected");
      }

      const tdCheck = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selectedPaths.has(entry.path);
      checkbox.setAttribute("aria-label", entry.name);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.selectedPaths.add(entry.path);
        } else {
          state.selectedPaths.delete(entry.path);
        }
        renderRows();
      });
      tdCheck.appendChild(checkbox);

      const tdName = document.createElement("td");
      if (entry.type === "directory") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "entry-link";
        btn.textContent = t("dir_prefix", entry.name);
        btn.addEventListener("click", async (ev) => {
          ev.stopPropagation();
          await loadRemote(entry.path);
        });
        tdName.appendChild(btn);
      } else {
        tdName.textContent = entry.name;
      }

      const tdMtime = document.createElement("td");
      tdMtime.textContent = formatMtime(entry.mtime);

      tr.appendChild(tdCheck);
      tr.appendChild(tdName);
      tr.appendChild(tdMtime);

      tr.addEventListener("click", (ev) => {
        if (ev.target.closest("button") || ev.target.closest("input")) {
          return;
        }
        toggleSelect(entry.path);
        renderRows();
      });

      tr.addEventListener("dblclick", async () => {
        if (entry.type === "directory") {
          await loadRemote(entry.path);
        }
      });

      els.tableBody.appendChild(tr);
    });

    syncCheckAll(entries);
  }

  async function loadRemote(path) {
    const response = await apiFetch(`/api/files/list?path=${encodePath(path || "")}`);
    if (!response.ok) {
      notifyError(t("error_list", response.status));
      return false;
    }

    const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
    if (!data.ok) {
      notifyError(t("error_list_data", data.error || "unknown"));
      return false;
    }

    state.path = data.path || "";
    state.entries = Array.isArray(data.entries) ? data.entries.slice() : [];
    state.selectedPaths.clear();

    renderBreadcrumbs();
    renderRows();
    return true;
  }

  async function ensureRemoteDirectory(remoteDir) {
    const response = await apiFetch(`/api/files/mkdir?path=${encodePath(remoteDir)}&recursive=1`, {
      method: "POST",
    });

    const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
    if (!response.ok || !data.ok) {
      notifyError(t("error_mkdir", data.error || response.status));
      return false;
    }
    return true;
  }

  async function uploadOneFile(file, targetPath, displayName) {
    const uploadPath = `/api/files/upload?path=${encodePath(targetPath)}&overwrite=1`;
    const shownName = displayName || file.name || targetPath;
    setUploadCurrentFile(shownName, file.size || 0);

    let response;
    try {
      response = await apiUpload(uploadPath, file, (loaded, total) => {
        setUploadCurrentLoaded(loaded, total);
      });
    } catch (err) {
      const message = (err && err.message) ? err.message : err;
      notifyError(t("error_upload", message || "network"));
      return false;
    }

    const data = parseJSONSafe(response.bodyText);
    if (!response.ok || !data.ok) {
      const detail = (data.error && data.error !== "invalid_json")
        ? data.error
        : (response.status || "unknown");
      notifyError(t("error_upload", detail));
      return false;
    }

    markUploadCurrentDone();
    return true;
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || state.isUploading) return;

    showUploadProgress("files", files);

    try {
      for (const file of files) {
        const targetPath = state.path ? `${state.path}/${file.name}` : file.name;
        const ok = await uploadOneFile(file, targetPath, file.name);
        if (!ok) {
          return;
        }
      }

      await loadRemote(state.path);
    } finally {
      hideUploadProgress();
    }
  }

  async function uploadFolder(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || state.isUploading) return;

    showUploadProgress("folder", files);

    try {
      const created = new Set();

      for (const file of files) {
        const relPath = String(file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
        const segments = relPath.split("/").filter(Boolean);
        if (!segments.length) {
          continue;
        }

        setUploadCurrentFile(t("upload_preparing"), 0);
        for (let i = 1; i < segments.length; i += 1) {
          const dirRel = segments.slice(0, i).join("/");
          const remoteDir = state.path ? `${state.path}/${dirRel}` : dirRel;
          if (!created.has(remoteDir)) {
            const okDir = await ensureRemoteDirectory(remoteDir);
            if (!okDir) {
              return;
            }
            created.add(remoteDir);
          }
        }

        const joinedPath = segments.join("/");
        const targetPath = state.path ? `${state.path}/${joinedPath}` : joinedPath;
        const ok = await uploadOneFile(file, targetPath, joinedPath);
        if (!ok) {
          return;
        }
      }

      await loadRemote(state.path);
    } finally {
      hideUploadProgress();
    }
  }

  async function downloadEntries(entries) {
    for (const entry of entries) {
      const response = await apiFetch(`/api/files/download?path=${encodePath(entry.path)}`);
      if (!response.ok) {
        notifyError(t("error_download", response.status));
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const fallbackName = entry.type === "directory"
        ? `${entry.name || "folder"}.tar`
        : (entry.name || "download.bin");
      anchor.download = resolveDownloadName(response, fallbackName);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  }

  async function downloadSelected() {
    const entries = selectedEntries();
    if (!entries.length) {
      notifyError(t("error_select_entry"));
      return;
    }

    await downloadEntries(entries);
  }

  async function deleteSelected() {
    const entries = selectedEntries();
    if (!entries.length) {
      notifyError(t("error_select_entry"));
      return;
    }

    if (!window.confirm(t("confirm_delete", entries.length))) {
      return;
    }

    for (const entry of entries) {
      const recursive = entry.type === "directory" ? "1" : "0";
      const response = await apiFetch(`/api/files/delete?path=${encodePath(entry.path)}&recursive=${recursive}`, {
        method: "POST",
      });

      const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
      if (!response.ok || !data.ok) {
        notifyError(t("error_delete", data.error || response.status));
        return;
      }
    }

    state.selectedPaths.clear();
    await loadRemote(state.path);
  }

  async function moveOneEntry(sourcePath, targetPath, overwrite) {
    const response = await apiFetch(
      `/api/files/move?src=${encodePath(sourcePath)}&dst=${encodePath(targetPath)}&overwrite=${overwrite ? "1" : "0"}`,
      { method: "POST" },
    );
    const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        status: response.status,
        error: data.error || response.status,
      };
    }
    return { ok: true };
  }

  async function moveWithOverwriteRetry(sourcePath, targetPath) {
    let overwrite = false;
    while (true) {
      const result = await moveOneEntry(sourcePath, targetPath, overwrite);
      if (result.ok) {
        return true;
      }

      if (result.status === 409 && !overwrite) {
        if (!window.confirm(t("confirm_move_overwrite", targetPath))) {
          return false;
        }
        overwrite = true;
        continue;
      }

      notifyError(t("error_move", result.error || result.status));
      return false;
    }
  }

  async function moveSelected() {
    if (state.isUploading) {
      return;
    }

    const entries = selectedEntries();
    if (!entries.length) {
      notifyError(t("error_select_entry"));
      return;
    }

    if (entries.length === 1) {
      const source = entries[0];
      const entered = window.prompt(t("prompt_move_path"), source.path || source.name || "");
      if (entered === null) {
        return;
      }
      const targetPath = normalizeRelativePathInput(entered, false);
      if (!targetPath) {
        notifyError(t("error_move_empty"));
        return;
      }

      const ok = await moveWithOverwriteRetry(source.path, targetPath);
      if (!ok) {
        return;
      }
    } else {
      const entered = window.prompt(t("prompt_move_folder"), state.path || "");
      if (entered === null) {
        return;
      }
      const targetDir = normalizeRelativePathInput(entered, true);
      if (targetDir == null) {
        notifyError(t("error_move_empty"));
        return;
      }

      for (const entry of entries) {
        const baseName = entry.name || String(entry.path || "").split("/").pop() || "item";
        const targetPath = targetDir ? `${targetDir}/${baseName}` : baseName;
        const ok = await moveWithOverwriteRetry(entry.path, targetPath);
        if (!ok) {
          return;
        }
      }
    }

    state.selectedPaths.clear();
    await loadRemote(state.path);
  }

  async function restartKOReader() {
    stopHealthCheckLoop();
    setServiceState("reconnecting");
    showToast(t("pending_restart"), "info", 0);
    try {
      const response = await apiFetch("/api/system/restart", {
        method: "POST",
      });
      if (response.ok) {
        showToast(t("reconnecting"), "info", 0);
        void waitForReconnected();
        return;
      }

      setServiceState("offline");
      scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
      const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
      notifyError(t("error_restart", data.error || response.status));
    } catch (err) {
      setServiceState("offline");
      scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
      const message = (err && err.message) ? err.message : err;
      notifyError(t("error_restart", message || "network"));
    }
  }

  async function stopDevtoolsService() {
    reconnectingRunId += 1;
    stopHealthCheckLoop();
    showToast(t("pending_stop_service"), "info", 0);
    try {
      const response = await apiFetch("/api/system/stop", {
        method: "POST",
      });
      if (response.ok) {
        setServiceState("offline");
        showToast(t("success_stop_service"), "success", 3800);
        return;
      }

      scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
      const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
      notifyError(t("error_stop_service", data.error || response.status));
    } catch (err) {
      scheduleHealthCheck(HEALTH_CHECK_INTERVAL_MS);
      const message = (err && err.message) ? err.message : err;
      notifyError(t("error_stop_service", message || "network"));
    }
  }

  function closeContextMenu() {
    els.contextMenu.classList.add("hidden");
    els.contextMenu.innerHTML = "";
  }

  function appendMenuItem(label, callback, danger) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `context-item${danger ? " danger" : ""}`;
    button.textContent = label;
    button.addEventListener("click", async () => {
      closeContextMenu();
      await callback();
    });
    els.contextMenu.appendChild(button);
  }

  function buildContextMenuItems() {
    const selected = selectedEntries();

    if (selected.length === 1 && selected[0].type === "directory") {
      appendMenuItem(t("menu_open"), async () => {
        await loadRemote(selected[0].path);
      });
    }

    if (selected.length) {
      appendMenuItem(t("menu_download"), async () => {
        await downloadSelected();
      });
    }

    if (selected.length) {
      appendMenuItem(t("menu_move"), async () => {
        await moveSelected();
      });
    }

    if (selected.length) {
      appendMenuItem(t("menu_delete"), async () => {
        await deleteSelected();
      }, true);
    }

    appendMenuItem(t("menu_close"), async () => {});
  }

  function openContextMenu(x, y) {
    els.contextMenu.innerHTML = "";
    buildContextMenuItems();
    els.contextMenu.classList.remove("hidden");

    const width = els.contextMenu.offsetWidth;
    const height = els.contextMenu.offsetHeight;
    const maxX = window.innerWidth - width - 6;
    const maxY = window.innerHeight - height - 6;
    const left = Math.max(6, Math.min(x, maxX));
    const top = Math.max(6, Math.min(y, maxY));

    els.contextMenu.style.left = `${left}px`;
    els.contextMenu.style.top = `${top}px`;
  }

  function bindDropzone() {
    const stop = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };

    ["dragenter", "dragover"].forEach((eventName) => {
      els.dropzone.addEventListener(eventName, (ev) => {
        stop(ev);
        els.dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop", "dragend"].forEach((eventName) => {
      els.dropzone.addEventListener(eventName, (ev) => {
        stop(ev);
        els.dropzone.classList.remove("drag-over");
      });
    });

    els.dropzone.addEventListener("drop", async (ev) => {
      if (state.isUploading) {
        return;
      }
      if (!ev.dataTransfer || !ev.dataTransfer.files || !ev.dataTransfer.files.length) {
        return;
      }
      await uploadFiles(ev.dataTransfer.files);
    });
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
      if (ev.key === "Escape") {
        if (!els.authModal.classList.contains("hidden")) {
          resolveAuth(null);
        }
        closeContextMenu();
      }
    });
  }

  function toggleSort(key) {
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = "asc";
    }
    updateSortHeaders();
    renderRows();
  }

  function bindSortHeader(el, key) {
    el.addEventListener("click", () => {
      toggleSort(key);
    });

    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        toggleSort(key);
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

    els.uploadFilesBtn.addEventListener("click", () => {
      if (state.isUploading) {
        return;
      }
      els.uploadInput.click();
    });

    els.uploadFolderBtn.addEventListener("click", () => {
      if (state.isUploading) {
        return;
      }
      els.uploadFolderInput.click();
    });

    els.refreshBtn.addEventListener("click", async () => {
      const ok = await loadRemote(state.path);
      if (ok) {
        showToast(t("success_refresh"), "success", 1200);
      }
    });

    els.restartBtn.addEventListener("click", restartKOReader);
    els.stopServiceBtn.addEventListener("click", stopDevtoolsService);

    els.uploadInput.addEventListener("change", async () => {
      if (state.isUploading) {
        els.uploadInput.value = "";
        return;
      }
      await uploadFiles(els.uploadInput.files);
      els.uploadInput.value = "";
    });

    els.uploadFolderInput.addEventListener("change", async () => {
      if (state.isUploading) {
        els.uploadFolderInput.value = "";
        return;
      }
      await uploadFolder(els.uploadFolderInput.files);
      els.uploadFolderInput.value = "";
    });

    bindSortHeader(els.thName, "name");
    bindSortHeader(els.thModified, "mtime");

    els.checkAll.addEventListener("change", () => {
      const entries = state.entries.slice();
      sortEntries(entries);
      if (els.checkAll.checked) {
        entries.forEach((entry) => {
          state.selectedPaths.add(entry.path);
        });
      } else {
        state.selectedPaths.clear();
      }
      renderRows();
    });

    els.dropzone.addEventListener("contextmenu", async (ev) => {
      ev.preventDefault();
      const row = ev.target.closest("tr[data-path]");
      if (row) {
        const rowPath = row.dataset.path;
        if (!state.selectedPaths.has(rowPath)) {
          state.selectedPaths.clear();
          state.selectedPaths.add(rowPath);
          renderRows();
        }
      }
      openContextMenu(ev.clientX, ev.clientY);
    });

    document.addEventListener("click", () => {
      closeContextMenu();
    });

    document.addEventListener("scroll", () => {
      closeContextMenu();
    }, true);

    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("beforeunload", () => {
      reconnectingRunId += 1;
      if (state.pollTimer) {
        window.clearTimeout(state.pollTimer);
        state.pollTimer = null;
      }
      stopHealthCheckLoop();
      if (toastTimer) {
        window.clearTimeout(toastTimer);
        toastTimer = null;
      }
    });
  }

  async function init() {
    applyI18n();
    applyTheme(state.theme);
    bindAuthEvents();
    bindEvents();
    bindDropzone();

    renderBreadcrumbs();
    renderRows();
    renderLog(true);
    updatePagerButtons();

    await probeServiceHealth();

    const [, sessionsOk] = await Promise.all([
      loadRemote(""),
      fetchSessions(),
    ]);

    if (sessionsOk) {
      await loadSegment(state.segmentIndex);
      schedulePoll();
    }
  }

  init();
})();
