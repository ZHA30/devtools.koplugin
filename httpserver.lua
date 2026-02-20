local Event = require("ui/event")
local logger = require("logger")
local socket = require("socket")

local STATUS_TEXT = {
    [400] = "Bad Request",
    [405] = "Method Not Allowed",
    [413] = "Payload Too Large",
    [431] = "Request Header Fields Too Large",
}

local HttpServer = {
    host = "*",
    port = nil,
    header_timeout = 0.5,
    body_timeout = 3,
    max_header_size = 16 * 1024,
    max_body_size = 64 * 1024 * 1024,
}

function HttpServer:new(o)
    o = o or {}
    setmetatable(o, self)
    self.__index = self
    return o
end

function HttpServer:start()
    local server, err = socket.bind(self.host, self.port)
    if not server then
        return false, err or "bind failed"
    end
    self.server = server
    self.server:settimeout(0.01)
    logger.dbg("Devtools HttpServer: listening on", self.host, self.port)
    return true
end

function HttpServer:stop()
    if self.server then
        self.server:close()
        self.server = nil
    end
end

local function send_simple(client, status, body)
    local status_text = STATUS_TEXT[status] or "Error"
    body = body or status_text
    local response = table.concat({
        string.format("HTTP/1.0 %d %s", status, status_text),
        "Content-Type: text/plain; charset=utf-8",
        string.format("Content-Length: %d", #body),
        "Connection: close",
        "",
        body,
    }, "\r\n")
    client:send(response)
    client:close()
end

function HttpServer:waitEvent()
    local client = self.server:accept()
    if not client then
        return
    end

    client:settimeout(self.header_timeout, "t")

    local request_line, err = client:receive("*l")
    if not request_line then
        client:close()
        logger.dbg("Devtools HttpServer: failed request line", err)
        return
    end

    local method, uri, version = request_line:match("^(%u+)%s+([^%s]+)%s+HTTP/(%d%.%d)$")
    if not method then
        send_simple(client, 400, "Malformed request line")
        return Event:new("InputEvent")
    end

    local headers = {}
    local total_header_bytes = #request_line
    while true do
        local line, line_err = client:receive("*l")
        if not line then
            client:close()
            logger.dbg("Devtools HttpServer: failed header line", line_err)
            return Event:new("InputEvent")
        end
        if line == "" then
            break
        end

        total_header_bytes = total_header_bytes + #line
        if total_header_bytes > self.max_header_size then
            send_simple(client, 431, "Headers too large")
            return Event:new("InputEvent")
        end

        local key, value = line:match("^([^:]+):%s*(.*)$")
        if key then
            headers[key:lower()] = value
        end
    end

    if method ~= "GET" and method ~= "POST" then
        send_simple(client, 405, "Only GET and POST are supported")
        return Event:new("InputEvent")
    end

    local content_length = tonumber(headers["content-length"] or "0") or 0
    if content_length < 0 then
        send_simple(client, 400, "Invalid content length")
        return Event:new("InputEvent")
    end
    if content_length > self.max_body_size then
        send_simple(client, 413, "Payload too large")
        return Event:new("InputEvent")
    end

    client:settimeout(self.body_timeout, "t")

    local req = {
        method = method,
        uri = uri,
        http_version = version,
        headers = headers,
        content_length = content_length,
    }

    local ok, event_or_nil = pcall(self.receiveCallback, req, client)
    if not ok then
        logger.err("Devtools HttpServer: request handler crashed:", event_or_nil)
        pcall(function() client:close() end)
        return Event:new("InputEvent")
    end

    return event_or_nil
end

function HttpServer:send(data, client)
    client:send(data)
    client:close()
end

return HttpServer
