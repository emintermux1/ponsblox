local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Ponsblox")
local openStation = remotes:WaitForChild("OpenStation")
local startLaunch = remotes:WaitForChild("StartLaunch")
local startTrade = remotes:WaitForChild("StartTrade")
local pollIntent = remotes:WaitForChild("PollIntent")
local getFeed = remotes:WaitForChild("GetFeed")

pcall(function()
	StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.EmotesMenu, false)
end)

local gui = Instance.new("ScreenGui")
gui.Name = "PonsbloxStation"
gui.ResetOnSpawn = false
gui.Enabled = false
gui.Parent = player:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(360, 280)
frame.Position = UDim2.new(0.5, -180, 1, -300)
frame.BackgroundColor3 = Color3.fromRGB(20, 14, 12)
frame.BorderSizePixel = 0
frame.Parent = gui

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Size = UDim2.new(1, -20, 0, 28)
title.Position = UDim2.fromOffset(10, 8)
title.Font = Enum.Font.GothamBlack
title.TextSize = 18
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(243, 230, 208)
title.Text = ""
title.Parent = frame

local body = Instance.new("TextLabel")
body.BackgroundTransparency = 1
body.Size = UDim2.new(1, -20, 0, 70)
body.Position = UDim2.fromOffset(10, 40)
body.Font = Enum.Font.Gotham
body.TextSize = 14
body.TextWrapped = true
body.TextXAlignment = Enum.TextXAlignment.Left
body.TextYAlignment = Enum.TextYAlignment.Top
body.TextColor3 = Color3.fromRGB(196, 177, 154)
body.Text = ""
body.Parent = frame

local nameBox = Instance.new("TextBox")
nameBox.Size = UDim2.new(0.5, -16, 0, 32)
nameBox.Position = UDim2.fromOffset(10, 118)
nameBox.PlaceholderText = "Name"
nameBox.Text = ""
nameBox.Parent = frame

local symbolBox = Instance.new("TextBox")
symbolBox.Size = UDim2.new(0.5, -16, 0, 32)
symbolBox.Position = UDim2.new(0.5, 6, 0, 118)
symbolBox.PlaceholderText = "TICKER"
symbolBox.Text = ""
symbolBox.Parent = frame

local go = Instance.new("TextButton")
go.Size = UDim2.new(1, -20, 0, 36)
go.Position = UDim2.fromOffset(10, 168)
go.BackgroundColor3 = Color3.fromRGB(217, 74, 50)
go.TextColor3 = Color3.new(1, 1, 1)
go.Font = Enum.Font.GothamBold
go.TextSize = 16
go.Text = "Go"
go.Parent = frame

local close = Instance.new("TextButton")
close.Size = UDim2.fromOffset(70, 28)
close.Position = UDim2.new(1, -80, 0, 8)
close.BackgroundTransparency = 1
close.TextColor3 = Color3.fromRGB(196, 177, 154)
close.Font = Enum.Font.Gotham
close.TextSize = 14
close.Text = "Walk off"
close.Parent = frame

local note = Instance.new("TextLabel")
note.BackgroundTransparency = 1
note.Size = UDim2.new(1, -20, 0, 48)
note.Position = UDim2.fromOffset(10, 214)
note.Font = Enum.Font.Gotham
note.TextSize = 13
note.TextWrapped = true
note.TextXAlignment = Enum.TextXAlignment.Left
note.TextColor3 = Color3.fromRGB(243, 230, 208)
note.Text = ""
note.Parent = frame

local station = "launch"

close.MouseButton1Click:Connect(function()
	gui.Enabled = false
end)

local function watchCode(code: string, url: string)
	note.Text = "Code " .. code .. "\nConfirm on the site, then come back."
	if url and url ~= "" then
		note.Text = note.Text .. "\n" .. url
	end
	task.spawn(function()
		for _ = 1, 40 do
			task.wait(3)
			local cur = pollIntent:InvokeServer(code)
			if cur and cur.status == "signed" then
				note.Text = "It's live. Walk the floor."
				return
			end
		end
	end)
end

go.MouseButton1Click:Connect(function()
	if station == "board" then
		local data = getFeed:InvokeServer()
		if data and data.tokens then
			local lines = {}
			for i, t in ipairs(data.tokens) do
				if i > 5 then
					break
				end
				table.insert(lines, tostring(t.symbol))
			end
			note.Text = #lines > 0 and table.concat(lines, "  ·  ") or "Quiet board."
		end
		return
	end
	if station == "trade" then
		local data, err = startTrade:InvokeServer({
			token = symbolBox.Text,
			side = "buy",
			amount = nameBox.Text,
		})
		if not data then
			note.Text = err or "Need a linked wallet from the confirm site."
			return
		end
		watchCode(data.code, data.signUrl)
		return
	end
	local data, err = startLaunch:InvokeServer({
		name = nameBox.Text,
		symbol = symbolBox.Text,
		logo = "",
		description = "From the Pad",
		twitter = "",
		telegram = "",
		website = "",
		creatorTaxBps = 0,
		buybackEnabled = false,
		quoteIn = "",
	})
	if not data then
		note.Text = err or "Need a linked wallet from the confirm site."
		return
	end
	watchCode(data.code, data.signUrl)
end)

openStation.OnClientEvent:Connect(function(name)
	station = tostring(name or "launch")
	gui.Enabled = true
	nameBox.Visible = station ~= "board"
	symbolBox.Visible = station ~= "board"
	if station == "launch" then
		title.Text = "THE PAD"
		body.Text = "You walked into the Pad. This is the game inside the game."
		go.Text = "Put it on the board"
		nameBox.PlaceholderText = "Name"
		symbolBox.PlaceholderText = "TICKER"
	elseif station == "trade" then
		title.Text = "THE FLOOR"
		body.Text = "The Floor is a room on this map. Buy and sell here, not on a website."
		go.Text = "Take the trade"
		nameBox.PlaceholderText = "Amount"
		symbolBox.PlaceholderText = "Token 0x…"
	else
		title.Text = "THE BOARD"
		body.Text = "Look up. The wall is the feed."
		go.Text = "Refresh"
	end
	note.Text = ""
end)
