import { parseLaunchCommand } from "./tweet.js";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

assert(
  parseLaunchCommand("@letslauncharc $DOG CAT Dog Cat")?.ticker === "DOG",
  "ticker",
);
assert(
  parseLaunchCommand("@letslauncharc $DOG CAT Dog Cat")?.name === "CAT Dog Cat",
  "name",
);
assert(parseLaunchCommand("just vibes") === null, "noise");
assert(parseLaunchCommand("@letslauncharc $D") === null, "short ticker");
assert(parseLaunchCommand("@letslauncharc $DOGE") === null, "missing name");
assert(
  parseLaunchCommand("hey @letslauncharc please $PEPE Pepe")?.name === "Pepe",
  "stop words after ticker still need a name",
);

console.log("parse tests ok");
