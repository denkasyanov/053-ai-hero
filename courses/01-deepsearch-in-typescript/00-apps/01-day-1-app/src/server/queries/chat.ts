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
    // First check if the chat exists at all (regardless of owner)
    const existingChat = await tx.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (existingChat) {
      // If chat exists, verify it belongs to the user
      if (existingChat.userId !== userId) {
        // TODO: Handle this error properly to avoid 500 responses
        // Consider using a custom UnauthorizedError class that can be caught
        // in the API route handler and return a proper 404/403 status
        throw new Error("Chat not found");
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