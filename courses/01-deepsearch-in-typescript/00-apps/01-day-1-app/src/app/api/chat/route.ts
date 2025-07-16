import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { model } from "~/llm/model";
import { auth } from "~/server/auth";
import { searchWebTool } from "~/tools";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

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
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}