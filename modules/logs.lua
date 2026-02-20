local ffiutil = require("ffi/util")

local LogsModule = {}
local START_MARKER = "launching..."
local TAGLINE_MARKERS = {
    "It's a scroll... It's a codex... It's KOReader!",
    "It's a scroll... It's a codex... It's KOReader!!",
}
local MAX_SESSIONS = 512

function LogsModule:new(plugin)
    local o = {
        plugin = plugin,
    }
    setmetatable(o, self)
    self.__index = self
    return o
end

function LogsModule:matchesTagline(line)
    for _, marker in ipairs(TAGLINE_MARKERS) do
        if line:find(marker, 1, true) then
            return true
        end
    end
    return false
end

function LogsModule:getLogPath()
    return ffiutil.joinPath(self.plugin.data_dir, "crash.log")
end

function LogsModule:handle(client, req, path, params)
    if req.method == "GET" and path == "/api/logs/poll" then
        return self:handlePoll(client, params), true
    elseif req.method == "GET" and path == "/api/logs/sessions" then
        return self:handleSessions(client, params), true
    elseif req.method == "POST" and path == "/api/logs/clear" then
        return self:handleClear(client, params), true
    end
    return nil, false
end

function LogsModule:handlePoll(client, params)
    local cursor = tonumber(params.cursor) or 0
    local limit = tonumber(params.limit) or 65536
    if limit < 1 then
        limit = 1
    end
    if limit > 65536 then
        limit = 65536
    end

    local log_path = self:getLogPath()
    local file = io.open(log_path, "rb")
    if not file then
        return self.plugin:sendJSON(client, 200, {
            ok = true,
            cursor = 0,
            next_cursor = 0,
            data = "",
            eof = true,
        })
    end

    local size = file:seek("end") or 0
    if cursor < 0 then
        cursor = 0
    end
    if cursor > size then
        cursor = size
    end

    file:seek("set", cursor)
    local data = file:read(limit) or ""
    local next_cursor = cursor + #data
    file:close()

    return self.plugin:sendJSON(client, 200, {
        ok = true,
        cursor = cursor,
        next_cursor = next_cursor,
        data = data,
        eof = next_cursor >= size,
    })
end

function LogsModule:scanSessions(limit)
    local file = io.open(self:getLogPath(), "rb")
    if not file then
        return {}, false
    end

    local all = {}
    local line_num = 0
    local signature_found = false

    while true do
        local offset = file:seek() or 0
        local line = file:read("*line")
        if not line then
            break
        end
        line_num = line_num + 1

        if self:matchesTagline(line) then
            signature_found = true
        end

        if line:find(START_MARKER, 1, true) then
            table.insert(all, {
                index = #all + 1,
                line = line_num,
                offset = offset,
                label = string.format("#%d · line %d", #all + 1, line_num),
            })
        end
    end

    file:close()

    if #all > limit then
        local trimmed = {}
        for i = #all - limit + 1, #all do
            table.insert(trimmed, all[i])
        end
        all = trimmed
    end

    return all, signature_found
end

function LogsModule:handleSessions(client, params)
    local limit = tonumber(params.limit) or 120
    if limit < 1 then
        limit = 1
    end
    if limit > MAX_SESSIONS then
        limit = MAX_SESSIONS
    end

    local sessions, signature_found = self:scanSessions(limit)
    return self.plugin:sendJSON(client, 200, {
        ok = true,
        sessions = sessions,
        startup_signature_found = signature_found,
        startup_marker = START_MARKER,
        startup_taglines = TAGLINE_MARKERS,
    })
end

function LogsModule:handleClear(client, params)
    local action = tostring(params.action or "truncate"):lower()
    local log_path = self:getLogPath()

    if action == "clear" then
        action = "truncate"
    end

    if action == "truncate" then
        local file, err = io.open(log_path, "wb")
        if not file then
            return self.plugin:sendJSON(client, 500, {
                ok = false,
                error = tostring(err),
            })
        end
        file:close()
    elseif action == "delete" then
        local existing = io.open(log_path, "rb")
        if existing then
            existing:close()
            local ok, err = os.remove(log_path)
            if not ok then
                return self.plugin:sendJSON(client, 500, {
                    ok = false,
                    error = tostring(err),
                })
            end
        end
    else
        return self.plugin:sendJSON(client, 400, {
            ok = false,
            error = "invalid_action",
        })
    end

    return self.plugin:sendJSON(client, 200, {
        ok = true,
        action = action,
        log_path = log_path,
    })
end

return LogsModule
