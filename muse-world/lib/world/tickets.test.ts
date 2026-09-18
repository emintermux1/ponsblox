import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quietTape, tapeFromPulse } from "./tape";
import {
  activeTicketFlash,
  openSimTicket,
  quietTicketBoard,
  ticketQuoteSource,
  ticketVerb,
} from "./tickets";

describe("SIM desk tickets", () => {
  it("click buy is a local SIM ticket and never a fill", () => {
    const tape = tapeFromPulse({
      ticker: "WIF",
      name: "dogwifhat",
      source: "dexscreener",
      priceUsd: 1.25,
      changePct: 3.5,
    });
    const next = openSimTicket(quietTicketBoard(), tape, "BUY", 1000);
    assert.equal(next.tickets.length, 1);
    assert.equal(next.tickets[0]?.label, "SIM");
    assert.equal(next.tickets[0]?.side, "BUY");
    assert.equal(next.tickets[0]?.ticker, "WIF");
    assert.equal(next.tickets[0]?.quoteUsd, 1.25);
    assert.equal(next.tickets[0]?.quoteSource, "dexscreener");
    assert.deepEqual(next.tickets[0]?.fills, []);
    assert.deepEqual(next.fills, []);
    assert.equal(ticketQuoteSource(tape), "dexscreener");
    assert.equal(ticketVerb("BUY"), "YES");
    assert.equal(ticketVerb("SELL"), "NO");
  });

  it("without a real quote the ticket stays SIM and quote-less", () => {
    const next = openSimTicket(quietTicketBoard(), quietTape(), "SELL", 40);
    assert.equal(next.tickets[0]?.label, "SIM");
    assert.equal(next.tickets[0]?.quoteUsd, null);
    assert.equal(next.tickets[0]?.quoteSource, "sim");
    assert.deepEqual(next.fills, []);
  });

  it("refuses PAID and never invents fills", () => {
    const paid = openSimTicket(
      quietTicketBoard(),
      { ...quietTape(), ticker: "PAID", source: "gecko", priceUsd: 9 },
      "BUY",
      80,
    );
    assert.deepEqual(paid.tickets, []);
    assert.deepEqual(paid.fills, []);
    assert.equal(activeTicketFlash(quietTicketBoard(), 10), null);
  });
});
