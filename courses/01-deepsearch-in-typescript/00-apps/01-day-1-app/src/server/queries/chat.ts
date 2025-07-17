import type { Message } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { chats, messages, type DB } from "../db/schema";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) => {
  const { userId, chatId, title, messages: messageList } = opts;

  // Use a transaction to ensure data consistency
  await db.transaction(async (tx) => {
    // Check if the chat exists and belongs to the user
    const existingChat = await tx.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    });

    if (existingChat) {
      // If chat exists, verify it belongs to the user
      if (existingChat.userId !== userId) {
        throw new Error("Unauthorized: Chat does not belong to user");
      }

      // Delete all existing messages
      await tx.delete(messages).where(eq(messages.chatId, chatId));

      // Update the chat's updatedAt timestamp
      await tx
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, chatId));
    } else {
      // Create new chat
      await tx.insert(chats).values({
        id: chatId,
        userId,
        title,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Insert all messages with their order
    if (messageList.length > 0) {
      const messagesToInsert: DB.NewMessage[] = messageList.map(
        (message, index) => ({
          chatId,
          role: message.role,
          parts: message.parts ?? [],
          order: index,
          createdAt: new Date(),
        })
      );

      await tx.insert(messages).values(messagesToInsert);
    }
  });
};

export const getChat = async (opts: {
  chatId: string;
  userId: string;
}) => {
  const { chatId, userId } = opts;
  
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: [messages.order],
      },
    },
  });

  return chat;
};

export const getChats = async (opts: {
  userId: string;
}) => {
  const { userId } = opts;
  
  const userChats = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.updatedAt)],
  });

  return userChats;
};