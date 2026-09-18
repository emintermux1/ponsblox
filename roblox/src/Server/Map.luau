local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local Map = {}

local function paint(inst: BasePart, color: Color3, material: Enum.Material?)
	inst.Color = color
	inst.Material = material or Enum.Material.SmoothPlastic
	inst.Anchored = true
	inst.TopSurface = Enum.SurfaceType.Smooth
	inst.BottomSurface = Enum.SurfaceType.Smooth
end

local function brick(name: string, size: Vector3, pos: Vector3, color: Color3, parent: Instance, material: Enum.Material?): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = CFrame.new(pos)
	paint(p, color, material)
	p.Parent = parent
	return p
end

local function label(part: BasePart, text: string, face: Enum.NormalId)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 20
	gui.Parent = part
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.GothamBlack
	t.TextScaled = true
	t.TextColor3 = Color3.fromRGB(243, 230, 208)
	t.Text = text
	t.Parent = gui
	return t
end

local function prompt(part: BasePart, station: string, action: string)
	local pr = Instance.new("ProximityPrompt")
	pr.ActionText = action
	pr.ObjectText = "Ponsblox"
	pr.HoldDuration = 0
	pr.MaxActivationDistance = 12
	pr.RequiresLineOfSight = false
	pr:SetAttribute("Station", station)
	pr.Parent = part
end

local function sky()
	Lighting.ClockTime = 17.35
	Lighting.Brightness = 2.2
	Lighting.Ambient = Color3.fromRGB(68, 48, 42)
	Lighting.OutdoorAmbient = Color3.fromRGB(96, 70, 58)
	Lighting.FogColor = Color3.fromRGB(90, 40, 30)
	Lighting.FogEnd = 420
	for _, old in Lighting:GetChildren() do
		if old:IsA("Atmosphere") or old:IsA("BloomEffect") then
			old:Destroy()
		end
	end
	local atm = Instance.new("Atmosphere")
	atm.Density = 0.32
	atm.Offset = 0.2
	atm.Color = Color3.fromRGB(190, 92, 64)
	atm.Decay = Color3.fromRGB(40, 16, 12)
	atm.Glare = 0.15
	atm.Haze = 1.4
	atm.Parent = Lighting
	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.4
	bloom.Size = 18
	bloom.Threshold = 0.9
	bloom.Parent = Lighting
end

function Map.build()
	sky()
	local world = Workspace:FindFirstChild("PonsbloxWorld")
	if world then
		world:Destroy()
	end
	world = Instance.new("Folder")
	world.Name = "PonsbloxWorld"
	world.Parent = Workspace

	local dirt = Color3.fromRGB(58, 34, 28)
	local stone = Color3.fromRGB(42, 38, 40)
	local brickC = Color3.fromRGB(176, 58, 42)
	local dark = Color3.fromRGB(28, 26, 32)
	local sand = Color3.fromRGB(186, 150, 112)

	brick("Ground", Vector3.new(360, 4, 360), Vector3.new(0, -2, 0), dirt, world, Enum.Material.Slate)
	brick("Plaza", Vector3.new(120, 1, 120), Vector3.new(0, 0.5, 0), sand, world, Enum.Material.Concrete)
	brick("RoadX", Vector3.new(360, 0.6, 22), Vector3.new(0, 0.4, 0), stone, world)
	brick("RoadZ", Vector3.new(22, 0.6, 360), Vector3.new(0, 0.4, 0), stone, world)

	for i = -3, 3 do
		if i ~= 0 then
			brick("LampA" .. i, Vector3.new(1, 18, 1), Vector3.new(i * 28, 9, 14), Color3.fromRGB(30, 30, 30), world)
			brick("GlowA" .. i, Vector3.new(3, 1, 3), Vector3.new(i * 28, 18, 14), Color3.fromRGB(255, 170, 90), world, Enum.Material.Neon)
			brick("LampB" .. i, Vector3.new(1, 18, 1), Vector3.new(i * 28, 9, -14), Color3.fromRGB(30, 30, 30), world)
			brick("GlowB" .. i, Vector3.new(3, 1, 3), Vector3.new(i * 28, 18, -14), Color3.fromRGB(255, 170, 90), world, Enum.Material.Neon)
		end
	end

	local pad = brick("ThePad", Vector3.new(52, 28, 40), Vector3.new(-78, 14, -48), brickC, world, Enum.Material.Brick)
	brick("PadRoof", Vector3.new(58, 3, 46), Vector3.new(-78, 29, -48), Color3.fromRGB(90, 24, 18), world)
	brick("PadDoor", Vector3.new(12, 16, 2), Vector3.new(-78, 8, -27), Color3.fromRGB(20, 12, 10), world)
	label(pad, "THE PAD", Enum.NormalId.Front)
	local padUse = brick("PadUse", Vector3.new(10, 4, 10), Vector3.new(-78, 2, -20), Color3.fromRGB(210, 70, 50), world, Enum.Material.Neon)
	prompt(padUse, "launch", "Use the Pad")

	local floor = brick("TheFloor", Vector3.new(64, 22, 48), Vector3.new(84, 11, -44), dark, world, Enum.Material.Metal)
	brick("FloorRoof", Vector3.new(70, 2, 54), Vector3.new(84, 23, -44), Color3.fromRGB(16, 16, 18), world)
	label(floor, "THE FLOOR", Enum.NormalId.Front)
	local floorUse = brick("FloorUse", Vector3.new(10, 4, 10), Vector3.new(84, 2, -14), Color3.fromRGB(80, 80, 95), world, Enum.Material.Neon)
	prompt(floorUse, "trade", "Enter the Floor")

	local board = brick("TheBoard", Vector3.new(80, 22, 4), Vector3.new(0, 12, -88), Color3.fromRGB(12, 12, 14), world)
	label(board, "THE BOARD", Enum.NormalId.Front)
	local boardGui = board:FindFirstChildOfClass("SurfaceGui")
	if boardGui then
		local feed = Instance.new("TextLabel")
		feed.Name = "Feed"
		feed.Size = UDim2.new(1, -20, 0.7, 0)
		feed.Position = UDim2.fromOffset(10, 40)
		feed.BackgroundTransparency = 1
		feed.Font = Enum.Font.Code
		feed.TextSize = 22
		feed.TextXAlignment = Enum.TextXAlignment.Left
		feed.TextYAlignment = Enum.TextYAlignment.Top
		feed.TextColor3 = Color3.fromRGB(220, 200, 180)
		feed.Text = "Waiting on the board…"
		feed.Parent = boardGui
	end
	prompt(board, "board", "Read the Board")

	brick("SpawnPad", Vector3.new(20, 1, 20), Vector3.new(0, 1, 48), Color3.fromRGB(210, 80, 60), world, Enum.Material.Neon)
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "PonsbloxSpawn"
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.CFrame = CFrame.new(0, 2, 52)
	spawn.Anchored = true
	spawn.Duration = 0
	paint(spawn, Color3.fromRGB(243, 230, 208), Enum.Material.SmoothPlastic)
	spawn.Parent = world

	return world
end

function Map.setBoard(text: string)
	local world = Workspace:FindFirstChild("PonsbloxWorld")
	if not world then
		return
	end
	local board = world:FindFirstChild("TheBoard")
	if not board then
		return
	end
	local gui = board:FindFirstChildOfClass("SurfaceGui")
	local feed = gui and gui:FindFirstChild("Feed")
	if feed and feed:IsA("TextLabel") then
		feed.Text = text
	end
end

return Map
