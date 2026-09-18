local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Api = require(script.Parent.Api)
local Map = require(script.Parent.Map)

Map.build()

local remotes = Instance.new("Folder")
remotes.Name = "Ponsblox"
remotes.Parent = ReplicatedStorage

local function remoteFn(name: string)
	local r = Instance.new("RemoteFunction")
	r.Name = name
	r.Parent = remotes
	return r
end

local function remoteEv(name: string)
	local r = Instance.new("RemoteEvent")
	r.Name = name
	r.Parent = remotes
	return r
end

local getFeed = remoteFn("GetFeed")
local getStatus = remoteFn("GetStatus")
local getLink = remoteFn("GetLink")
local startLaunch = remoteFn("StartLaunch")
local startTrade = remoteFn("StartTrade")
local pollIntent = remoteFn("PollIntent")
local openStation = remoteEv("OpenStation")

getFeed.OnServerInvoke = function()
	return Api.feed()
end

getStatus.OnServerInvoke = function()
	return Api.status()
end

getLink.OnServerInvoke = function(player: Player)
	return Api.linkOf(player.UserId)
end

startLaunch.OnServerInvoke = function(player: Player, fields)
	if typeof(fields) ~= "table" then
		return nil, "bad fields"
	end
	fields.robloxUserId = tostring(player.UserId)
	if typeof(fields.recipient) ~= "string" or fields.recipient == "" then
		local link = Api.linkOf(player.UserId)
		if link and link.address then
			fields.recipient = link.address
		end
	end
	return Api.launch(fields)
end

startTrade.OnServerInvoke = function(player: Player, fields)
	if typeof(fields) ~= "table" then
		return nil, "bad fields"
	end
	fields.robloxUserId = tostring(player.UserId)
	if typeof(fields.recipient) ~= "string" or fields.recipient == "" then
		local link = Api.linkOf(player.UserId)
		if link and link.address then
			fields.recipient = link.address
		end
	end
	return Api.trade(fields)
end

pollIntent.OnServerInvoke = function(_player: Player, code: any)
	if typeof(code) ~= "string" then
		return nil, "bad code"
	end
	return Api.intent(code)
end

local function refreshBoard()
	local data = Api.feed()
	if not data or not data.tokens then
		Map.setBoard("Board is quiet.")
		return
	end
	local lines = {}
	for i, t in ipairs(data.tokens) do
		if i > 6 then
			break
		end
		table.insert(lines, string.format("%s   %s", tostring(t.symbol), tostring(t.capRblx or "—")))
	end
	Map.setBoard(#lines > 0 and table.concat(lines, "\n") or "Nobody on the board yet.")
end

task.spawn(function()
	while true do
		refreshBoard()
		task.wait(12)
	end
end)

local function hookPrompt(inst: Instance)
	if not inst:IsA("ProximityPrompt") then
		return
	end
	inst.Triggered:Connect(function(player)
		openStation:FireClient(player, inst:GetAttribute("Station"))
	end)
end

for _, d in workspace:GetDescendants() do
	hookPrompt(d)
end
workspace.DescendantAdded:Connect(hookPrompt)

Players.PlayerAdded:Connect(function(player)
	Api.linkOf(player.UserId)
end)
