local HttpService = game:GetService("HttpService")
local Config = require(game:GetService("ReplicatedStorage").Shared.Config)
local Secret = require(script.Parent.Secret)

local Api = {}

local function request(method: string, path: string, body: any?)
	local payload = {
		Url = Config.ApiBase .. path,
		Method = method,
		Headers = {
			["Content-Type"] = "application/json",
			["x-ponsblox-secret"] = Secret.Value,
		},
	}
	if body ~= nil then
		payload.Body = HttpService:JSONEncode(body)
	end
	local ok, res = pcall(function()
		return HttpService:RequestAsync(payload)
	end)
	if not ok then
		return nil, tostring(res)
	end
	if not res.Success then
		return nil, "HTTP " .. tostring(res.StatusCode)
	end
	local decoded = HttpService:JSONDecode(res.Body)
	return decoded, nil
end

function Api.feed()
	return request("GET", "/v1/feed")
end

function Api.status()
	return request("GET", "/v1/status")
end

function Api.intent(code: string)
	return request("GET", "/v1/intents/" .. code)
end

function Api.launch(fields)
	return request("POST", "/v1/intents/launch", fields)
end

function Api.trade(fields)
	return request("POST", "/v1/intents/trade", fields)
end

function Api.linkOf(userId: number)
	return request("GET", "/v1/link/" .. tostring(userId))
end

return Api
