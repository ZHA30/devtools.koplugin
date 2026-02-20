(function () {
  "use strict";

  const AUTH_STORAGE_KEY = "devtools_auth_code";
  const THEME_STORAGE_KEY = "devtools_theme_mode";

  const messages = {
    en: {
      tab_logs: "Logs",
      tab_files: "Files",
      theme_light: "Theme: Light",
      theme_dark: "Theme: Dark",
      btn_upload_files: "Upload files",
      btn_upload_folder: "Upload folder",
      btn_refresh: "Refresh",
      btn_restart: "Restart",
      th_name: "Name",
      th_modified: "Modified",
      sort_asc: "asc",
      sort_desc: "desc",
      root: "🏠",
      empty_folder: "Current folder is empty.",
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
      menu_delete: "Delete",
      menu_close: "Close",
      error_list: "List failed (%1)",
      error_list_data: "List error: %1",
      error_mkdir: "Create folder failed: %1",
      error_upload: "Upload failed: %1",
      error_download: "Download failed (%1)",
      error_delete: "Delete failed: %1",
      error_restart: "Restart failed: %1",
      error_select_file: "Select at least one file.",
      error_select_entry: "Select at least one entry.",
      confirm_delete: "Delete %1 selected item(s)?",
    },
    zh: {
      tab_logs: "日志",
      tab_files: "文件",
      theme_light: "主题：浅色",
      theme_dark: "主题：深色",
      btn_upload_files: "上传文件",
      btn_upload_folder: "上传文件夹",
      btn_refresh: "刷新",
      btn_restart: "重启",
      th_name: "文件名",
      th_modified: "最近修改",
      sort_asc: "升序",
      sort_desc: "降序",
      root: "🏠",
      empty_folder: "当前目录为空。",
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
      menu_delete: "删除",
      menu_close: "关闭",
      error_list: "读取目录失败（%1）",
      error_list_data: "目录错误：%1",
      error_mkdir: "创建目录失败：%1",
      error_upload: "上传失败：%1",
      error_download: "下载失败（%1）",
      error_delete: "删除失败：%1",
      error_restart: "重启失败：%1",
      error_select_file: "请至少选择一个文件。",
      error_select_entry: "请至少选择一个条目。",
      confirm_delete: "确认删除已选择的 %1 个条目吗？",
    },
  };

  const state = {
    lang: /^zh\b/i.test(navigator.language || "") ? "zh" : "en",
    authCode: window.localStorage.getItem(AUTH_STORAGE_KEY) || "",
    theme: window.localStorage.getItem(THEME_STORAGE_KEY)
      || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    path: "",
    entries: [],
    selectedPaths: new Set(),
    sortKey: "name",
    sortDir: "asc",
  };

  const els = {
    tabLogs: document.querySelector("#tab-logs"),
    tabFiles: document.querySelector("#tab-files"),
    themeToggle: document.querySelector("#theme-toggle"),
    uploadFilesBtn: document.querySelector("#btn-upload-files"),
    uploadFolderBtn: document.querySelector("#btn-upload-folder"),
    refreshBtn: document.querySelector("#btn-refresh"),
    restartBtn: document.querySelector("#btn-restart"),
    crumbs: document.querySelector("#path-crumbs"),
    thName: document.querySelector("#th-name"),
    thModified: document.querySelector("#th-modified"),
    checkAll: document.querySelector("#check-all"),
    tableBody: document.querySelector("#remote-table tbody"),
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
  };

  let authResolver = null;
  let authPromise = null;

  function t(key, p1) {
    const table = messages[state.lang] || messages.en;
    const raw = table[key] || messages.en[key] || key;
    return p1 == null ? raw : raw.replace("%1", String(p1));
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    els.themeToggle.textContent = state.theme === "dark" ? t("theme_dark") : t("theme_light");
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
    els.uploadFilesBtn.textContent = t("btn_upload_files");
    els.uploadFolderBtn.textContent = t("btn_upload_folder");
    els.refreshBtn.textContent = t("btn_refresh");
    els.restartBtn.textContent = t("btn_restart");
    updateSortHeaders();
    els.authTitle.textContent = t("auth_title");
    els.authMessage.textContent = t("auth_hint");
    els.authInput.placeholder = t("auth_placeholder");
    els.authCancel.textContent = t("auth_cancel");
    els.authSubmit.textContent = t("auth_unlock");
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
    window.alert(message);
  }

  function encodePath(path) {
    return encodeURIComponent(path || "");
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

  function renderRows() {
    const entries = state.entries.slice();
    sortEntries(entries);
    els.tableBody.innerHTML = "";

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

  async function uploadOneFile(file, targetPath, reloadAfter) {
    const response = await apiFetch(`/api/files/upload?path=${encodePath(targetPath)}&overwrite=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: file,
    });

    const data = await response.json().catch(() => ({ ok: false, error: "invalid_json" }));
    if (!response.ok || !data.ok) {
      notifyError(t("error_upload", data.error || response.status));
      return false;
    }

    if (reloadAfter) {
      await loadRemote(state.path);
    }

    return true;
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    for (const file of files) {
      const targetPath = state.path ? `${state.path}/${file.name}` : file.name;
      await uploadOneFile(file, targetPath, false);
    }

    await loadRemote(state.path);
  }

  async function uploadFolder(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const created = new Set();

    for (const file of files) {
      const relPath = String(file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
      const segments = relPath.split("/").filter(Boolean);
      if (!segments.length) {
        continue;
      }

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

      const targetPath = state.path ? `${state.path}/${segments.join("/")}` : segments.join("/");
      await uploadOneFile(file, targetPath, false);
    }

    await loadRemote(state.path);
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
      anchor.download = entry.name || "download.bin";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  }

  async function downloadSelected() {
    const files = selectedEntries().filter((entry) => entry.type !== "directory");
    if (!files.length) {
      notifyError(t("error_select_file"));
      return;
    }

    await downloadEntries(files);
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

    if (selected.some((entry) => entry.type !== "directory")) {
      appendMenuItem(t("menu_download"), async () => {
        await downloadSelected();
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

    els.uploadFilesBtn.addEventListener("click", () => {
      els.uploadInput.click();
    });

    els.uploadFolderBtn.addEventListener("click", () => {
      els.uploadFolderInput.click();
    });

    els.refreshBtn.addEventListener("click", async () => {
      await loadRemote(state.path);
    });

    els.restartBtn.addEventListener("click", restartKOReader);

    els.uploadInput.addEventListener("change", async () => {
      await uploadFiles(els.uploadInput.files);
      els.uploadInput.value = "";
    });

    els.uploadFolderInput.addEventListener("change", async () => {
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
  }

  async function init() {
    applyI18n();
    applyTheme(state.theme);
    bindAuthEvents();
    bindEvents();
    bindDropzone();

    renderBreadcrumbs();
    renderRows();

    await loadRemote("");
  }

  init();
})();
