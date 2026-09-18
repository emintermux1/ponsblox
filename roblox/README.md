# Ponsblox place

This is the game. `Map.luau` builds a 3D server: plaza, The Pad, The Floor, The Board. Players walk up and use ProximityPrompts. A website form is not the game.

```bash
rojo serve roblox/default.project.json
```

Enable HttpService. Keep the API secret on the server only.

When a pad needs a wallet signature it hands the player a `/sign/:code` URL. After they confirm they come back to the map.
