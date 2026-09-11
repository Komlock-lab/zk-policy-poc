import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServer } = vi.hoisted(() => ({ createServer: vi.fn() }));
vi.mock("node:net", () => ({ createServer }));

import { availablePort } from "./anvil.ts";

describe("availablePort", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([0, 8545])("reserves requested port %i on loopback", async (port) => {
    const allocatedPort = port || 49152;
    const server = Object.assign(new EventEmitter(), {
      listen: vi.fn((_port, _host, ready) => ready()),
      address: () => ({ port: allocatedPort }),
      close: vi.fn((done) => done()),
    });
    createServer.mockReturnValue(server);
    await expect(availablePort(port)).resolves.toBe(allocatedPort);
    expect(server.listen).toHaveBeenCalledWith(port, "127.0.0.1", expect.any(Function));
    expect(server.close).toHaveBeenCalledOnce();
  });

  it("rejects an occupied fixed port without falling back", async () => {
    const error = Object.assign(new Error("address already in use"), { code: "EADDRINUSE" });
    const server = Object.assign(new EventEmitter(), {
      listen: vi.fn(() => server.emit("error", error)),
    });
    createServer.mockReturnValue(server);
    await expect(availablePort(8545)).rejects.toBe(error);
    expect(server.listen).toHaveBeenCalledOnce();
  });
});
