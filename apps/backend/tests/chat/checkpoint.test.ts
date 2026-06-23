import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCheckpointService } from "../../src/modules/chat/checkpoint.service";

function createMockPrisma() {
  return {
    checkpoint: {
      create: vi.fn().mockResolvedValue({ id: "cp-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
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

  it("deletes all checkpoints except the latest N", async () => {
    const keepIds = ["cp-3", "cp-2"];
    mockPrisma.checkpoint.findMany.mockResolvedValue(
      keepIds.map((id) => ({ id })),
    );

    const service = createCheckpointService({
      prisma: mockPrisma as never,
    });

    await service.cleanup("conv-1", 2);

    expect(mockPrisma.checkpoint.findMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1" },
      orderBy: { messageIndex: "desc" },
      take: 2,
      select: { id: true },
    });
    expect(mockPrisma.checkpoint.deleteMany).toHaveBeenCalledWith({
      where: {
        conversationId: "conv-1",
        id: { notIn: keepIds },
      },
    });
  });

  it("skips deletion when no checkpoints exist", async () => {
    mockPrisma.checkpoint.findMany.mockResolvedValue([]);

    const service = createCheckpointService({
      prisma: mockPrisma as never,
    });

    await service.cleanup("conv-empty", 5);

    expect(mockPrisma.checkpoint.deleteMany).not.toHaveBeenCalled();
  });
});
