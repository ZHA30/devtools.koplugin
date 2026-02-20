local DataStorage = require("datastorage")
local Device = require("device")
local Dispatcher = require("dispatcher")
local Event = require("ui/event")
local ffiutil = require("ffi/util")
local FilesModule = require("modules/files")
local GetText = require("gettext")
local HttpServer = require("httpserver")
local InfoMessage = require("ui/widget/infomessage")
local InputDialog = require("ui/widget/inputdialog")
local LogsModule = require("modules/logs")
local LuaSettings = require("luasettings")
local UIManager = require("ui/uimanager")
local WidgetContainer = require("ui/widget/container/widgetcontainer")
local JSON = require("json")
local logger = require("logger")
local util = require("util")
local _ = require("gettext")
local T = ffiutil.template

math.randomseed(os.time())

local STATUS_TEXT = {
    [200] = "OK",
    [400] = "Bad Request",
    [401] = "Unauthorized",
    [403] = "Forbidden",
    [404] = "Not Found",
    [405] = "Method Not Allowed",
    [409] = "Conflict",
    [411] = "Length Required",
    [413] = "Payload Too Large",
    [500] = "Internal Server Error",
}

local CTYPE = {
    HTML = "text/html; charset=utf-8",
    JS = "application/javascript; charset=utf-8",
    CSS = "text/css; charset=utf-8",
    JSON = "application/json; charset=utf-8",
    TEXT = "text/plain; charset=utf-8",
    BINARY = "application/octet-stream",
}

local should_run = nil

local Devtools = WidgetContainer:extend{
    name = "devtools",
    is_doc_only = false,
}

local function _ko_i18n_file_exists(path)
    local f = io.open(path, "rb")
    if not f then
        return false
    end
    f:close()
    return true
end

local function _ko_i18n_plugin_root()
    return (debug.getinfo(1, "S").source or ""):match("@?(.*/)")
end

local function starts_with(str, prefix)
    return str:sub(1, #prefix) == prefix
end

function Devtools:setupPluginLocalization()
    local lang = G_reader_settings and G_reader_settings:readSetting("language") or "C"
    if not lang or lang == "" or lang == "C" then
        return false
    end
    lang = lang:gsub("%..*$", "")

    local plugin_root = _ko_i18n_plugin_root()
    if not plugin_root then
        return false
    end

    local locales = { lang, lang:match("^([a-z][a-z])[_-]") }
    for _, locale in ipairs(locales) do
        if locale and locale ~= "" then
            local mo_path = string.format(plugin_root .. "l10n/%s/LC_MESSAGES/devtools.mo", locale)
            if _ko_i18n_file_exists(mo_path) then
                if GetText.loadMO(mo_path) then
                    return true
                end
            end
        end
    end

    return false
end

function Devtools:init()
    self:setupPluginLocalization()

    self.CTYPE = CTYPE
    self.T = T
    self.plugin_root = _ko_i18n_plugin_root() or ""
    self.data_dir = ffiutil.realpath(DataStorage:getDataDir()) or DataStorage:getDataDir()
    self.settings = LuaSettings:open(DataStorage:getSettingsDir() .. "/devtools.lua")
    self.updated = false

    self.port = tonumber(self.settings:readSetting("port")) or 18080
    self.autostart = self.settings:isTrue("autostart")
    self.auth_enabled = self.settings:isTrue("auth_enabled")
    self.auth_code = self.settings:readSetting("auth_code") or ""
    self.upload_max_bytes = tonumber(self.settings:readSetting("upload_max_bytes")) or (64 * 1024 * 1024)

    local legacy_auth_credential = self.settings:readSetting("auth_credential") or ""
    local legacy_access_key = self.settings:readSetting("access_key") or ""
    if self.auth_code == "" then
        if legacy_auth_credential ~= "" then
            self.auth_code = legacy_auth_credential
            self:saveSetting("auth_code", self.auth_code)
        elseif legacy_access_key ~= "" then
            self.auth_code = legacy_access_key
            self:saveSetting("auth_code", self.auth_code)
        end
    end

    self.files_module = FilesModule:new(self)
    self.logs_module = LogsModule:new(self)

    if should_run == nil then
        should_run = self.autostart
    end

    if should_run then
        UIManager:nextTick(function()
            self:start(true)
        end)
    end

    self.ui.menu:registerToMainMenu(self)
    self:onDispatcherRegisterActions()
end

function Devtools:onDispatcherRegisterActions()
    Dispatcher:registerAction("toggle_devtools_server", {
        category = "none",
        event = "ToggleDevtoolsServer",
        title = _("Toggle Devtools server"),
        general = true,
    })
    Dispatcher:registerAction("start_devtools_server", {
        category = "none",
        event = "StartDevtoolsServer",
        title = _("Start Devtools server"),
        general = true,
    })
end

function Devtools:isRunning()
    return self.http_server ~= nil
end

function Devtools:isUnderRoot(path)
    if not path then
        return false
    end
    if path == self.data_dir then
        return true
    end
    local prefix = self.data_dir .. "/"
    return starts_with(path, prefix)
end

function Devtools:setShouldRun(value)
    should_run = value and true or false
end

function Devtools:markUpdated()
    self.updated = true
end

function Devtools:onFlushSettings()
    if self.updated and self.settings then
        self.settings:flush()
        self.updated = false
    end
end

function Devtools:saveSetting(key, value)
    self.settings:saveSetting(key, value)
    self:markUpdated()
end

function Devtools:generateAuthCode()
    return string.format("auth-%06d", math.random(0, 999999))
end

function Devtools:openKindleFirewall()
    if not Device:isKindle() then
        return
    end

    os.execute(string.format("%s %s %s", "iptables -A INPUT -p tcp --dport", self.port,
        "-m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"))
    os.execute(string.format("%s %s %s", "iptables -A OUTPUT -p tcp --sport", self.port,
        "-m conntrack --ctstate ESTABLISHED -j ACCEPT"))
    self.firewall_opened = true
end

function Devtools:closeKindleFirewall()
    if not Device:isKindle() or not self.firewall_opened then
        return
    end

    os.execute(string.format("%s %s %s", "iptables -D INPUT -p tcp --dport", self.port,
        "-m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT"))
    os.execute(string.format("%s %s %s", "iptables -D OUTPUT -p tcp --sport", self.port,
        "-m conntrack --ctstate ESTABLISHED -j ACCEPT"))
    self.firewall_opened = false
end

function Devtools:start(silent)
    if self:isRunning() then
        return true
    end

    local server = HttpServer:new{
        host = "*",
        port = self.port,
        max_body_size = self.upload_max_bytes,
        receiveCallback = function(req, client)
            return self:onRequest(req, client)
        end,
    }

    local ok, err = server:start()
    if not ok then
        logger.err("Devtools: failed to start server:", err)
        if not silent then
            UIManager:show(InfoMessage:new{
                icon = "notice-warning",
                text = T(_("Failed to start Devtools server on port %1."), self.port) .. "\n\n" .. tostring(err),
            })
        end
        return false
    end

    self.http_server = server
    self.http_messagequeue = UIManager:insertZMQ(server)
    self:openKindleFirewall()
    self:setShouldRun(true)

    logger.info("Devtools: server started on port", self.port)
    if not silent then
        UIManager:show(InfoMessage:new{
            timeout = 8,
            text = T(_("Devtools server started.\n\nPort: %1\n%2"),
                self.port,
                Device.retrieveNetworkInfo and Device:retrieveNetworkInfo() or _("Could not retrieve network info.")),
        })
    end
    return true
end

function Devtools:stop(silent, keep_should_run)
    if not keep_should_run then
        self:setShouldRun(false)
    end

    if self.http_messagequeue then
        UIManager:removeZMQ(self.http_messagequeue)
        self.http_messagequeue = nil
    end

    if self.http_server then
        self.http_server:stop()
        self.http_server = nil
    end

    self:closeKindleFirewall()

    if not silent then
        UIManager:show(InfoMessage:new{
            timeout = 2,
            text = _("Devtools server stopped."),
        })
    end
    return true
end

function Devtools:stopPlugin(_)
    self:stop(true, false)
    return true
end

function Devtools:onEnterStandby()
    if self:isRunning() then
        self:stop(true, true)
    end
end

function Devtools:onSuspend()
    if self:isRunning() then
        self:stop(true, true)
    end
end

function Devtools:onExit()
    if self:isRunning() then
        self:stop(true, true)
    end
end

function Devtools:onLeaveStandby()
    if should_run and not self:isRunning() then
        self:start(true)
    end
end

function Devtools:onResume()
    if should_run and not self:isRunning() then
        self:start(true)
    end
end

function Devtools:onCloseWidget()
    if self:isRunning() then
        self:stop(true, true)
    end
end

function Devtools:sendAll(client, data)
    local start_idx = 1
    while start_idx <= #data do
        local sent, err, partial = client:send(data, start_idx)
        if sent then
            start_idx = sent + 1
        elseif partial and partial >= start_idx then
            start_idx = partial + 1
        else
            return nil, err or "socket send failed"
        end
    end
    return true
end

function Devtools:closeClient(client)
    pcall(function()
        client:close()
    end)
end

function Devtools:sendResponse(client, http_code, content_type, body, extra_headers)
    http_code = http_code or 400
    body = body or ""
    if type(body) ~= "string" then
        body = tostring(body)
    end

    local lines = {
        string.format("HTTP/1.0 %d %s", http_code, STATUS_TEXT[http_code] or "Unknown"),
        string.format("Content-Type: %s", content_type or CTYPE.TEXT),
        string.format("Content-Length: %d", #body),
        "Connection: close",
    }

    if extra_headers then
        for k, v in pairs(extra_headers) do
            table.insert(lines, string.format("%s: %s", k, v))
        end
    end

    table.insert(lines, "")
    local payload = table.concat(lines, "\r\n") .. "\r\n" .. body
    self:sendAll(client, payload)
    self:closeClient(client)
    return Event:new("InputEvent")
end

function Devtools:sendJSON(client, http_code, obj)
    local ok, body = pcall(JSON.encode, obj)
    if not ok then
        body = JSON.encode({ ok = false, error = "json_encode_failed" })
        http_code = 500
    end
    return self:sendResponse(client, http_code, CTYPE.JSON, body)
end

function Devtools:sendFile(client, file_path, mime_type, filename)
    local attr = require("libs/libkoreader-lfs").attributes(file_path)
    if not attr or attr.mode ~= "file" then
        return self:sendResponse(client, 404, CTYPE.TEXT, _("File not found."))
    end

    local file, err = io.open(file_path, "rb")
    if not file then
        return self:sendResponse(client, 500, CTYPE.TEXT, tostring(err))
    end

    local headers = {
        string.format("HTTP/1.0 200 %s", STATUS_TEXT[200]),
        string.format("Content-Type: %s", mime_type or CTYPE.BINARY),
        string.format("Content-Length: %d", attr.size or 0),
        "Connection: close",
    }

    if filename then
        headers[#headers + 1] = string.format("Content-Disposition: attachment; filename=\"%s\"", filename)
    end

    headers[#headers + 1] = ""
    headers[#headers + 1] = ""

    local header_payload = table.concat(headers, "\r\n")
    local sent_ok, send_err = self:sendAll(client, header_payload)
    if not sent_ok then
        logger.warn("Devtools: failed to send headers:", send_err)
        file:close()
        self:closeClient(client)
        return Event:new("InputEvent")
    end

    while true do
        local chunk = file:read(32 * 1024)
        if not chunk then
            break
        end
        local ok_chunk, chunk_err = self:sendAll(client, chunk)
        if not ok_chunk then
            logger.warn("Devtools: file send interrupted:", chunk_err)
            break
        end
    end

    file:close()
    self:closeClient(client)
    return Event:new("InputEvent")
end

function Devtools:parseQuery(query)
    local params = {}
    if not query or query == "" then
        return params
    end

    for pair in query:gmatch("[^&]+") do
        local key, value = pair:match("^([^=]+)=?(.*)$")
        if key then
            key = util.urlDecode(key)
            value = util.urlDecode(value)
            params[key] = value
        end
    end

    return params
end

function Devtools:parseRequestURI(uri)
    local decoded = util.urlDecode(uri or "/") or "/"
    local path, query = decoded:match("^([^?]*)%??(.*)$")
    if not path or path == "" then
        path = "/"
    end
    return path, self:parseQuery(query)
end

function Devtools:isAuthorized(req)
    if not self.auth_enabled then
        return true
    end
    if self.auth_code == "" then
        return false
    end
    local code = req.headers["x-auth-code"] or req.headers["x-access-key"] or ""
    return code ~= "" and code == self.auth_code
end

function Devtools:serveStatic(client, route)
    local map = {
        ["/"] = { file = "logs.html", ctype = CTYPE.HTML },
        ["/index.html"] = { file = "logs.html", ctype = CTYPE.HTML },
        ["/files"] = { file = "files.html", ctype = CTYPE.HTML },
        ["/files.html"] = { file = "files.html", ctype = CTYPE.HTML },
        ["/logs"] = { file = "logs.html", ctype = CTYPE.HTML },
        ["/logs.html"] = { file = "logs.html", ctype = CTYPE.HTML },
        ["/files.js"] = { file = "files.js", ctype = CTYPE.JS },
        ["/logs.js"] = { file = "logs.js", ctype = CTYPE.JS },
        ["/app.js"] = { file = "files.js", ctype = CTYPE.JS },
        ["/style.css"] = { file = "style.css", ctype = CTYPE.CSS },
    }

    local item = map[route]
    if not item then
        return self:sendResponse(client, 404, CTYPE.TEXT, _("Not found."))
    end

    local fullpath = self.plugin_root .. "web/" .. item.file
    local data, err = util.readFromFile(fullpath, "rb")
    if not data then
        return self:sendResponse(client, 500, CTYPE.TEXT, tostring(err))
    end

    return self:sendResponse(client, 200, item.ctype, data)
end

function Devtools:handleHealth(client)
    return self:sendJSON(client, 200, {
        ok = true,
        running = self:isRunning(),
        port = self.port,
        auth_enabled = self.auth_enabled,
    })
end

function Devtools:handleRestart(client)
    local event = self:sendJSON(client, 200, {
        ok = true,
        restarting = true,
    })
    UIManager:nextTick(function()
        UIManager:restartKOReader()
    end)
    return event
end

function Devtools:onRequest(req, client)
    local path, params = self:parseRequestURI(req.uri)

    if not starts_with(path, "/api/") then
        return self:serveStatic(client, path)
    end

    if not self:isAuthorized(req) then
        return self:sendJSON(client, 401, {
            ok = false,
            error = _("Unauthorized."),
        })
    end

    if req.method == "GET" and path == "/api/health" then
        return self:handleHealth(client)
    end

    if req.method == "POST" and path == "/api/system/restart" then
        return self:handleRestart(client)
    end

    local event, handled = self.files_module:handle(client, req, path, params)
    if handled then
        return event
    end

    event, handled = self.logs_module:handle(client, req, path, params)
    if handled then
        return event
    end

    return self:sendJSON(client, 404, {
        ok = false,
        error = _("Unknown endpoint."),
    })
end

function Devtools:showPortDialog(touchmenu_instance)
    local dialog
    dialog = InputDialog:new{
        title = _("Set Devtools port"),
        input = tostring(self.port),
        input_type = "number",
        input_hint = _("Port number (1-65535)"),
        buttons = {
            {
                {
                    text = _("Cancel"),
                    id = "close",
                    callback = function()
                        UIManager:close(dialog)
                    end,
                },
                {
                    text = _("Save"),
                    is_enter_default = true,
                    callback = function()
                        local value = tonumber(dialog:getInputText())
                        if value and value >= 1 and value <= 65535 then
                            local restart = self:isRunning()
                            self.port = value
                            self:saveSetting("port", value)
                            UIManager:close(dialog)

                            if restart then
                                self:stop(true, true)
                                self:start(true)
                            end
                            touchmenu_instance:updateItems()
                        end
                    end,
                },
            },
        },
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

function Devtools:showAuthCodeDialog(touchmenu_instance)
    local dialog
    dialog = InputDialog:new{
        title = _("Set authentication code"),
        input = self.auth_code,
        input_hint = _("Authentication code"),
        buttons = {
            {
                {
                    text = _("Cancel"),
                    id = "close",
                    callback = function()
                        UIManager:close(dialog)
                    end,
                },
                {
                    text = _("Save"),
                    is_enter_default = true,
                    callback = function()
                        self.auth_code = dialog:getInputText() or ""
                        self:saveSetting("auth_code", self.auth_code)
                        UIManager:close(dialog)
                        touchmenu_instance:updateItems()
                    end,
                },
            },
        },
    }
    UIManager:show(dialog)
    dialog:onShowKeyboard()
end

function Devtools:toggleAuth(touchmenu_instance)
    self.auth_enabled = not self.auth_enabled
    if self.auth_enabled and self.auth_code == "" then
        self.auth_code = self:generateAuthCode()
        self:saveSetting("auth_code", self.auth_code)
        UIManager:show(InfoMessage:new{
            timeout = 10,
            text = T(_("Generated auth code:\n%1"), self.auth_code),
        })
    end
    self:saveSetting("auth_enabled", self.auth_enabled)
    touchmenu_instance:updateItems()
end

function Devtools:toggleAutostart(touchmenu_instance)
    self.autostart = not self.autostart
    self:saveSetting("autostart", self.autostart)
    touchmenu_instance:updateItems()
end

function Devtools:onToggleDevtoolsServer()
    if self:isRunning() then
        self:stop(false, false)
    else
        self:start(false)
    end
end

function Devtools:onStartDevtoolsServer()
    if not self:isRunning() then
        self:start(false)
    end
end

function Devtools:addToMainMenu(menu_items)
    menu_items.devtools = {
        text = _("Devtools"),
        sorting_hint = "more_tools",
        sub_item_table = {
            {
                text_func = function()
                    if self:isRunning() then
                        return T(_("Devtools server: %1"), self.port)
                    end
                    return _("Devtools server")
                end,
                checked_func = function()
                    return self:isRunning()
                end,
                check_callback_updates_menu = true,
                callback = function(touchmenu_instance)
                    self:onToggleDevtoolsServer()
                    ffiutil.sleep(0.3)
                    touchmenu_instance:updateItems()
                end,
                hold_callback = function(touchmenu_instance)
                    self:showPortDialog(touchmenu_instance)
                end,
            },
            {
                text = _("Autostart"),
                checked_func = function()
                    return self.autostart
                end,
                callback = function(touchmenu_instance)
                    self:toggleAutostart(touchmenu_instance)
                end,
            },
            {
                text = _("Authentication"),
                checked_func = function()
                    return self.auth_enabled
                end,
                callback = function(touchmenu_instance)
                    self:toggleAuth(touchmenu_instance)
                end,
                hold_callback = function(touchmenu_instance)
                    self:showAuthCodeDialog(touchmenu_instance)
                end,
            },
        },
    }
end

return Devtools
