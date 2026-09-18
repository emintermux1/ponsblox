# Ponsblox

A **Roblox game**. The website exists to send players into the experience. Launch and trade happen on the 3D map (The Pad, The Floor, The Board) — a game inside the game.

Pair on chain is RBLX. The wallet confirm page (`/sign/:code`) is only what the game opens when it needs a signature. It is not a launchpad site.

Default git branch is `main`. Do not point cloud agents at `emintermux1/ponscare` / `master`.

## Run

```bash
cp .env.example .env
npm i
npm run dev:server
npm run dev:web
```

Set `VITE_ROBLOX_PLACE_ID` so Play goes to the live experience. Set `GMGN_API_KEY` if the in-game board should pull GMGN candles later.

## Open the game (this is the product)

A Roblox game is not a website. It is a **place** you open in **Roblox Studio**, then play or publish.

```bash
npm run game:build
```

That writes `roblox/Ponsblox.rbxlx`. Double-click it (or `npm run game:open`). In Studio press **F5 / Play**. The 3D map (Pad, Floor, Board) is built when the server starts.

Open Cloud cannot create a new experience. After a blank place exists, publish the built file from a host that can reach Roblox:

```bash
npm run game:publish
```

That reads `ROBLOX_UNIVERSE_ID`, `ROBLOX_PLACE_ID`, and `ROBLOX_API_KEY`. Put the same Place ID in `VITE_ROBLOX_PLACE_ID` so the website Play button joins it.

```bash
npm run game:serve
```

keeps Rojo syncing scripts into the open Studio place.
