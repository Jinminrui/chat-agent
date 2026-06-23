import { prisma } from "../../lib/prisma";

type ConversationRecord = {
  id: string;
  userId: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type MessageRecord = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string | Date;
};

export async function createConversation(
  userId: string,
): Promise<ConversationRecord> {
  return prisma.conversation.create({
    data: {
      userId,
      title: "New conversation",
    },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listConversations(
  userId: string,
): Promise<ConversationRecord[]> {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      userId: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listMessages(
  userId: string,
  conversationId: string,
): Promise<MessageRecord[] | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!conversation || conversation.userId !== userId) {
    return null;
  }

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      conversationId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });
}
