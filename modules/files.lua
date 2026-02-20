local ffiutil = require("ffi/util")
local lfs = require("libs/libkoreader-lfs")
local util = require("util")
local _ = require("gettext")

local FilesModule = {}

local function parse_bool(v)
    if v == nil then
        return false
    end
    v = tostring(v):lower()
    return v == "1" or v == "true" or v == "yes" or v == "on"
end

function FilesModule:new(plugin)
    local o = {
        plugin = plugin,
    }
    setmetatable(o, self)
    self.__index = self
    return o
end

function FilesModule:handle(client, req, path, params)
    if req.method == "GET" and (path == "/api/files/list" or path == "/api/sftp/list") then
        return self:handleList(client, params), true
    elseif req.method == "GET" and (path == "/api/files/download" or path == "/api/sftp/download") then
        return self:handleDownload(client, params), true
    elseif req.method == "POST" and (path == "/api/files/upload" or path == "/api/sftp/upload") then
        return self:handleUpload(client, req, params), true
    elseif req.method == "POST" and (path == "/api/files/mkdir" or path == "/api/sftp/mkdir") then
        return self:handleMkdir(client, params), true
    elseif req.method == "POST" and (path == "/api/files/delete" or path == "/api/sftp/delete") then
        return self:handleDelete(client, params), true
    end

    return nil, false
end

function FilesModule:sanitizeRelativePath(raw_path, allow_empty)
    local candidate = raw_path or ""
    if type(candidate) ~= "string" then
        candidate = tostring(candidate)
    end

    candidate = candidate:gsub("\\", "/")
    candidate = candidate:gsub("^/+", "")

    if candidate:find("%z", 1, true) then
        return nil, _("Invalid path.")
    end

    local parts = {}
    for part in candidate:gmatch("[^/]+") do
        if part == "." or part == "" then
            -- skip
        elseif part == ".." then
            return nil, _("Path traversal is not allowed.")
        else
            table.insert(parts, part)
        end
    end

    local rel = table.concat(parts, "/")
    if rel == "" and not allow_empty then
        return nil, _("Path is required.")
    end

    return rel
end

function FilesModule:resolveExistingPath(rel)
    local abs = rel == "" and self.plugin.data_dir or ffiutil.joinPath(self.plugin.data_dir, rel)
    local real = ffiutil.realpath(abs)
    if not real then
        return nil, 404, _("Path not found.")
    end
    if not self.plugin:isUnderRoot(real) then
        return nil, 403, _("Access denied.")
    end
    return real
end

function FilesModule:resolveTargetPath(rel)
    local guess = ffiutil.joinPath(self.plugin.data_dir, rel)
    local parent = ffiutil.dirname(guess)
    local parent_real = ffiutil.realpath(parent)
    if not parent_real then
        return nil, 404, _("Parent folder not found.")
    end
    if not self.plugin:isUnderRoot(parent_real) then
        return nil, 403, _("Access denied.")
    end

    local basename = ffiutil.basename(guess)
    if not basename or basename == "" or basename == "." or basename == ".." then
        return nil, 400, _("Invalid file name.")
    end

    return ffiutil.joinPath(parent_real, basename)
end

function FilesModule:readRequestBodyToFile(client, content_length)
    local cache_dir = ffiutil.joinPath(self.plugin.data_dir, "cache")
    util.makePath(cache_dir)

    local tmp_path
    for _ = 1, 8 do
        local name = string.format("devtools-upload-%d-%06d.tmp", os.time(), math.random(0, 999999))
        tmp_path = ffiutil.joinPath(cache_dir, name)
        if not util.pathExists(tmp_path) then
            break
        end
        tmp_path = nil
    end

    if not tmp_path then
        return nil, _("Failed to allocate temporary file.")
    end

    local file, err = io.open(tmp_path, "wb")
    if not file then
        return nil, tostring(err)
    end

    local remaining = content_length
    while remaining > 0 do
        local to_read = math.min(remaining, 32 * 1024)
        local chunk, recv_err, partial = client:receive(to_read)
        chunk = chunk or partial
        if chunk and #chunk > 0 then
            file:write(chunk)
            remaining = remaining - #chunk
        end
        if recv_err and remaining > 0 then
            file:close()
            os.remove(tmp_path)
            return nil, tostring(recv_err)
        end
    end

    file:close()
    return tmp_path
end

function FilesModule:deleteDirectoryRecursive(dir_path)
    for name in lfs.dir(dir_path) do
        if name ~= "." and name ~= ".." then
            local child = ffiutil.joinPath(dir_path, name)
            local sym_attr = lfs.symlinkattributes(child)
            local mode = sym_attr and sym_attr.mode or nil

            if mode == "directory" then
                local ok, err = self:deleteDirectoryRecursive(child)
                if not ok then
                    return nil, err
                end
            else
                local ok_remove, err_remove = os.remove(child)
                if not ok_remove then
                    return nil, err_remove
                end
            end
        end
    end

    local ok, err = lfs.rmdir(dir_path)
    if not ok then
        return nil, err
    end
    return true
end

function FilesModule:createDirectorySecure(rel)
    local current = self.plugin.data_dir

    for part in rel:gmatch("[^/]+") do
        local candidate = ffiutil.joinPath(current, part)
        local existing_real = ffiutil.realpath(candidate)

        if existing_real then
            if not self.plugin:isUnderRoot(existing_real) then
                return nil, 403, _("Access denied.")
            end

            local mode = lfs.attributes(existing_real, "mode")
            if mode ~= "directory" then
                return nil, 400, _("Target exists and is not a directory.")
            end

            current = existing_real
        else
            local ok, mk_err = lfs.mkdir(candidate)
            if not ok then
                return nil, 500, tostring(mk_err)
            end

            local created_real = ffiutil.realpath(candidate)
            if not created_real then
                return nil, 500, _("Failed to create directory.")
            end
            if not self.plugin:isUnderRoot(created_real) then
                return nil, 403, _("Access denied.")
            end

            current = created_real
        end
    end

    return current
end

function FilesModule:handleList(client, params)
    local rel, rel_err = self:sanitizeRelativePath(params.path, true)
    if not rel then
        return self.plugin:sendJSON(client, 400, { ok = false, error = rel_err })
    end

    local dir_path, code, err = self:resolveExistingPath(rel)
    if not dir_path then
        return self.plugin:sendJSON(client, code, { ok = false, error = err })
    end

    local attr = lfs.attributes(dir_path)
    if not attr or attr.mode ~= "directory" then
        return self.plugin:sendJSON(client, 400, { ok = false, error = _("Target is not a directory.") })
    end

    local entries = {}
    for name in lfs.dir(dir_path) do
        if name ~= "." and name ~= ".." then
            local full = ffiutil.joinPath(dir_path, name)
            local sym_attr = lfs.symlinkattributes(full)
            local real_attr = lfs.attributes(full)
            local mode = sym_attr and sym_attr.mode or (real_attr and real_attr.mode) or "file"
            local rel_path = rel == "" and name or (rel .. "/" .. name)

            table.insert(entries, {
                name = name,
                path = rel_path,
                type = mode,
                size = real_attr and real_attr.size or 0,
                mtime = real_attr and real_attr.modification or 0,
            })
        end
    end

    table.sort(entries, function(a, b)
        local ad = a.type == "directory"
        local bd = b.type == "directory"
        if ad ~= bd then
            return ad
        end
        return a.name:lower() < b.name:lower()
    end)

    return self.plugin:sendJSON(client, 200, {
        ok = true,
        root = self.plugin.data_dir,
        path = rel,
        entries = entries,
    })
end

function FilesModule:handleDownload(client, params)
    local rel, rel_err = self:sanitizeRelativePath(params.path, false)
    if not rel then
        return self.plugin:sendJSON(client, 400, { ok = false, error = rel_err })
    end

    local file_path, code, err = self:resolveExistingPath(rel)
    if not file_path then
        return self.plugin:sendJSON(client, code, { ok = false, error = err })
    end

    local attr = lfs.attributes(file_path)
    if not attr or attr.mode ~= "file" then
        return self.plugin:sendJSON(client, 400, { ok = false, error = _("Target is not a file.") })
    end

    return self.plugin:sendFile(client, file_path, self.plugin.CTYPE.BINARY, ffiutil.basename(file_path))
end

function FilesModule:handleUpload(client, req, params)
    local rel, rel_err = self:sanitizeRelativePath(params.path, false)
    if not rel then
        return self.plugin:sendJSON(client, 400, { ok = false, error = rel_err })
    end

    if not req.content_length or req.content_length <= 0 then
        return self.plugin:sendJSON(client, 411, { ok = false, error = _("Content-Length is required.") })
    end

    if req.content_length > self.plugin.upload_max_bytes then
        return self.plugin:sendJSON(client, 413, {
            ok = false,
            error = self.plugin:T(_("Payload too large (max %1 bytes)."), self.plugin.upload_max_bytes),
        })
    end

    local target_path, code, err = self:resolveTargetPath(rel)
    if not target_path then
        return self.plugin:sendJSON(client, code, { ok = false, error = err })
    end

    local overwrite = parse_bool(params.overwrite)
    local existing_mode = lfs.attributes(target_path, "mode")
    if existing_mode == "directory" then
        return self.plugin:sendJSON(client, 400, { ok = false, error = _("Cannot overwrite a directory.") })
    end
    if existing_mode and not overwrite then
        return self.plugin:sendJSON(client, 409, { ok = false, error = _("File already exists.") })
    end

    local tmp_path, read_err = self:readRequestBodyToFile(client, req.content_length)
    if not tmp_path then
        return self.plugin:sendJSON(client, 500, { ok = false, error = read_err })
    end

    if existing_mode == "file" and overwrite then
        os.remove(target_path)
    end

    local ok, rename_err = os.rename(tmp_path, target_path)
    if not ok then
        os.remove(tmp_path)
        return self.plugin:sendJSON(client, 500, { ok = false, error = tostring(rename_err) })
    end

    return self.plugin:sendJSON(client, 200, {
        ok = true,
        path = rel,
        bytes = req.content_length,
    })
end

function FilesModule:handleMkdir(client, params)
    local rel, rel_err = self:sanitizeRelativePath(params.path, false)
    if not rel then
        return self.plugin:sendJSON(client, 400, { ok = false, error = rel_err })
    end

    local created_path, code, err = self:createDirectorySecure(rel)
    if created_path then
        return self.plugin:sendJSON(client, 200, {
            ok = true,
            path = rel,
            created = true,
        })
    end

    return self.plugin:sendJSON(client, code, { ok = false, error = err })
end

function FilesModule:handleDelete(client, params)
    local rel, rel_err = self:sanitizeRelativePath(params.path, false)
    if not rel then
        return self.plugin:sendJSON(client, 400, { ok = false, error = rel_err })
    end

    local target_path, code, err = self:resolveExistingPath(rel)
    if not target_path then
        return self.plugin:sendJSON(client, code, { ok = false, error = err })
    end

    if target_path == self.plugin.data_dir then
        return self.plugin:sendJSON(client, 403, { ok = false, error = _("Refusing to delete data root.") })
    end

    local sym_attr = lfs.symlinkattributes(target_path)
    local mode = sym_attr and sym_attr.mode or nil

    if mode == "directory" then
        if not parse_bool(params.recursive) then
            return self.plugin:sendJSON(client, 400, { ok = false, error = _("Directory delete requires recursive=1.") })
        end
        local ok, remove_err = self:deleteDirectoryRecursive(target_path)
        if not ok then
            return self.plugin:sendJSON(client, 500, { ok = false, error = tostring(remove_err) })
        end
    else
        local ok_remove, remove_err = os.remove(target_path)
        if not ok_remove then
            return self.plugin:sendJSON(client, 500, { ok = false, error = tostring(remove_err) })
        end
    end

    return self.plugin:sendJSON(client, 200, {
        ok = true,
        path = rel,
        deleted = true,
    })
end

return FilesModule
