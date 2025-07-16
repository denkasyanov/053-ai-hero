import { z } from "zod";
import { tool } from "ai";
import { searchSerper } from "~/serper";

export const searchWebTool = tool({
  parameters: z.object({
    query: z.string().describe("The query to search the web for"),
  }),
  execute: async ({ query }, { abortSignal }) => {
    const results = await searchSerper(
      { q: query, num: 10 },
      abortSignal,
    );

    return results.organic.map((result) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
    }));
  },
});