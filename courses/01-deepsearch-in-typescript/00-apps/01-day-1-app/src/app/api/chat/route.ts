import type { Message } from "ai";
import {
  appendResponseMessages,
  createDataStreamResponse,
  streamText,
} from "ai";
import { model } from "~/llm/model";
import { auth } from "~/server/auth";
import { upsertChat } from "~/server/queries/chat";
import {
  createUserRequest,
  getUserRequestsToday,
  isUserAdmin,
} from "~/server/queries/user";
import { checkRateLimit } from "~/server/rate-limit";
import { searchWebTool } from "~/tools";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check rate limit
  const userId = session.user.id;
  const [requestCount, isAdmin] = await Promise.all([
    getUserRequestsToday({ userId }),
    isUserAdmin({ userId }),
  ]);

  const rateLimitCheck = checkRateLimit(requestCount, isAdmin);

  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `You have reached your daily limit of ${rateLimitCheck.limit} requests. Please try again tomorrow.`,
        resetAt: rateLimitCheck.resetAt?.toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.floor(
            ((rateLimitCheck.resetAt?.getTime() ?? 0) - Date.now()) / 1000,
          ).toString(),
        },
      },
    );
  }

  // Record the request
  await createUserRequest({ userId });

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
  };

  const { messages, chatId } = body;

  // Generate a new chat ID if not provided
  const finalChatId = chatId ?? crypto.randomUUID();

  // Create a new chat if chatId was not provided
  if (!chatId) {
    // Extract the first user message content for the title
    const firstUserMessage = messages.find((msg) => msg.role === "user");
    const title =
      firstUserMessage?.parts?.[0]?.type === "text"
        ? firstUserMessage.parts[0].text.slice(0, 100)
        : "New Chat";

    // Create the chat with the initial user message
    await upsertChat({
      userId,
      chatId: finalChatId,
      title,
      messages,
    });
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Send new chat ID to frontend if this is a new chat
      if (!chatId) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: finalChatId,
        });
      }

      console.log("Messages being sent to model:", messages);

      const result = streamText({
        model,
        messages,
        system: `You are a helpful AI assistant with access to web search capabilities. 
When answering questions:
- Always use the searchWeb tool to find up-to-date information
- When you use information from search results, you MUST cite the source with inline links in markdown format [like this](url)
- Every fact or piece of information obtained from search results must include its source link
- Provide comprehensive answers based on search results
- If search results are insufficient, acknowledge limitations`,
        maxSteps: 10,
        tools: {
          searchWeb: searchWebTool,
        },
        onFinish: async ({ text, finishReason, usage, response }) => {
          const responseMessages = response.messages;

          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Extract the first user message content for the title (if this is a new chat)
          const firstUserMessage = updatedMessages.find(
            (msg) => msg.role === "user",
          );
          const title =
            firstUserMessage?.parts?.[0]?.type === "text"
              ? firstUserMessage.parts[0].text.slice(0, 100)
              : "New Chat";

          // Save the complete conversation to the database
          await upsertChat({
            userId,
            chatId: finalChatId,
            title,
            messages: updatedMessages,
          });
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
