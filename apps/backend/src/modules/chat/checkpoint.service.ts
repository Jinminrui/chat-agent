import type { PrismaClient } from "@prisma/client";
import type { RuntimeMessage } from "./agent-runtime";

type CheckpointState = {
  messages: RuntimeMessage[];
};

export type CheckpointService = {
  save(
    conversationId: string,
    messageIndex: number,
    messages: RuntimeMessage[],
  ): Promise<void>;
  load(conversationId: string): Promise<{
    id: string;
    conversationId: string;
    messageIndex: number;
    state: CheckpointState;
    createdAt: Date;
  } | null>;
  cleanup(conversationId: string, keepLatest: number): Promise<void>;
};

export function createCheckpointService(deps: {
  prisma: Pick<PrismaClient, "checkpoint">;
}): CheckpointService {
  return {
    async save(conversationId, messageIndex, messages) {
      await deps.prisma.checkpoint.create({
        data: {
          conversationId,
          messageIndex,
          state: { messages } satisfies CheckpointState,
        },
      });
    },

    async load(conversationId) {
      return deps.prisma.checkpoint.findFirst({
        where: { conversationId },
        orderBy: { messageIndex: "desc" },
      });
    },

    async cleanup(conversationId, keepLatest) {
      const latest = await deps.prisma.checkpoint.findMany({
        where: { conversationId },
        orderBy: { messageIndex: "desc" },
        take: keepLatest,
        select: { id: true },
      });

      const keepIds = latest.map((cp) => cp.id);

      if (keepIds.length === 0) {
        return;
      }

      await deps.prisma.checkpoint.deleteMany({
        where: {
          conversationId,
          id: { notIn: keepIds },
        },
      });
    },
  };
}
