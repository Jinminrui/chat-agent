import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCheckpointService } from "../../src/modules/chat/checkpoint.service";

function createMockPrisma() {
  return {
    checkpoint: {
      create: vi.fn().mockResolvedValue({ id: "cp-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

describe("CheckpointService", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it("saves checkpoint with conversationId, messageIndex, and state", async () => {
    const service = createCheckpointService({
      prisma: mockPrisma as never,
    });

    const messages = [{ role: "user" as const, content: "hi" }];
    await service.save("conv-1", 5, messages);

    expect(mockPrisma.checkpoint.create).toHaveBeenCalledWith({
      data: {
        conversationId: "conv-1",
        messageIndex: 5,
        state: { messages },
      },
    });
  });

  it("loads latest checkpoint for conversation", async () => {
    const savedCheckpoint = {
      id: "cp-1",
      conversationId: "conv-1",
      messageIndex: 5,
      state: { messages: [{ role: "user", content: "hi" }] },
      createdAt: new Date(),
    };
    mockPrisma.checkpoint.findFirst.mockResolvedValue(savedCheckpoint);

    const service = createCheckpointService({
      prisma: mockPrisma as never,
    });

    const checkpoint = await service.load("conv-1");

    expect(mockPrisma.checkpoint.findFirst).toHaveBeenCalledWith({
      where: { conversationId: "conv-1" },
      orderBy: { messageIndex: "desc" },
    });
    expect(checkpoint).toEqual(savedCheckpoint);
  });

  it("returns null when no checkpoint exists", async () => {
    mockPrisma.checkpoint.findFirst.mockResolvedValue(null);

    const service = createCheckpointService({
      prisma: mockPrisma as never,
    });

    const checkpoint = await service.load("conv-empty");
    expect(checkpoint).toBeNull();
  });
});
