// app/ai/deep-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, tool } from "ai";
import Exa from "exa-js";
import OpenAI from "openai";
import fs from "fs";

type Learning = {
  learning: string;
  followUpQuestions: string[];
};

type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
};

type Research = {
  query: string | undefined;
  queries: string[];
  searchResults: SearchResult[];
  knowledgeBaseResults: string[]; // Массив ответов из векторной базы
  learnings: Learning[];
  completedQueries: string[];
};

const exa = new Exa(process.env.EXA_API_KEY!);

const mainModel = openai("gpt-4.1-mini");

// Поиск в интернете, без изменений
const searchWeb = async (
  query: string,
  breadth: number,
  startPublishedDate: string | undefined,
  endPublishedDate: string | undefined,
  includeDomains: string[] | undefined,
  excludeDomains: string[] | undefined,
  includeText: string[] | undefined,
  excludeText: string[] | undefined
) => {
  const { results } = await exa.searchAndContents(query, {
    numResults: breadth,
    livecrawl: "always",
    startPublishedDate: endPublishedDate
      ? undefined
      : startPublishedDate || undefined,
    endPublishedDate: startPublishedDate
      ? undefined
      : endPublishedDate || undefined,
    includeDomains: includeDomains ? includeDomains : undefined,
    excludeDomains: excludeDomains ? includeDomains : undefined,
    includeText: includeText ? includeDomains : undefined,
    excludeText: excludeText ? includeDomains : undefined,
  });

  results.map((result, index) => {
    console.log("searchWebresults index", index);
    console.log("searchWebresults", result.title);
    console.log("searchWebresults", result.url);
  });

  return results.map(
    (r) =>
      ({
        title: r.title,
        url: r.url,
        content: r.text,
        publishedDate: r.publishedDate,
      } as SearchResult)
  );
};

// Генерация поисковых запросов, без изменений
const generateSearchQueries = async (query: string, breadth: number) => {
  const {
    object: { queries },
  } = await generateObject({
    model: mainModel,
    prompt: `Generate ${breadth} search queries for the following query: ${query}`,
    schema: z.object({
      queries: z.array(z.string()).min(1).max(7),
    }),
  });
  return queries;
};

// Поиск и обработка результатов, без изменений
const searchAndProcess = async (
  startPublishedDate: string | undefined,
  endPublishedDate: string | undefined,
  includeDomains: string[] | undefined,
  excludeDomains: string[] | undefined,
  includeText: string[] | undefined,
  excludeText: string[] | undefined,
  breadth: number,
  query: string,
  accumulatedSources: SearchResult[]
) => {
  const pendingSearchResults: SearchResult[] = [];
  const finalSearchResults: SearchResult[] = [];
  await generateText({
    model: mainModel,
    prompt: `Search the web for information about ${query}, For each item, where possible, collect detailed examples of use cases (news stories) with a detailed description.`,
    system:
      "You are a researcher. For each query, search the web and then evaluate if the results are relevant and will help answer the following query",
    maxSteps: 7,
    tools: {
      searchWeb: tool({
        description: "Search the web for information about a given query",
        parameters: z.object({
          query: z.string().min(1),
        }),
        async execute({ query }) {
          const results = await searchWeb(
            query,
            breadth,
            startPublishedDate,
            endPublishedDate,
            includeDomains,
            excludeDomains,
            includeText,
            excludeText
          );
          pendingSearchResults.push(...results);
          return results;
        },
      }),
      evaluate: tool({
        description: "Evaluate the search results",
        parameters: z.object({}),
        async execute() {
          try {
            const pendingResult = pendingSearchResults.pop();
            if (!pendingResult) {
              return "No search results available for evaluation.";
            }

            const { object: evaluation } = await generateObject({
              model: mainModel,
              prompt: `Evaluate whether the search results are relevant and will help answer the following query: ${query}. If the page already exists in the existing results, mark it as irrelevant.
   
              <search_results>
              ${JSON.stringify(pendingResult)}
              </search_results>
   
              <existing_results>
              ${JSON.stringify(accumulatedSources.map((result) => result.url))}
              </existing_results>
   
              `,
              output: "enum",
              enum: ["relevant", "irrelevant"],
            });
            console.log(" evaluation", evaluation);
            if (evaluation === "relevant") {
              finalSearchResults.push(pendingResult);
            }
            return evaluation === "irrelevant"
              ? "Search results are irrelevant. Please search again with a more specific query."
              : "Search results are relevant. End research for this query.";
          } catch (error) {
            console.error("Error in evaluate tool:", error);
            return "Evaluation tool error occurred, skipping this evaluation.";
          }
        },
      }),
    },
  });
  return finalSearchResults;
};

// Генерация learnings, без изменений
const generateLearnings = async (query: string, searchResult: SearchResult) => {
  const { object } = await generateObject({
    model: mainModel,
    prompt: `The user is researching "${query}". The following search result were deemed relevant.
      Generate a learning and a follow-up question from the following search result:
   
      <search_result>
      ${JSON.stringify(searchResult)}
      </search_result>
      `,
    schema: z.object({
      learning: z.string(),
      followUpQuestions: z.array(z.string()),
    }),
  });
  return object;
};

async function getKnowledgeItem(query: string, vectorStoreId: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await client.responses.create({
    model: "gpt-4.1",
    tools: [
      {
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        max_num_results: 5,
      },
    ],
    input: [
      {
        role: "developer",
        content: `Search the vector store for information. Output format language: ${
          process.env.NEXT_PUBLIC_APP_HTTP_LANG || "en"
        }`,
      },
      {
        role: "user",
        content: query,
      },
    ],
  });
  console.log(" getKnowledgeItem query", query);
  console.log("response.output_text", response.output_text);
  return response.output_text;
}

// Глубинное исследование с учётом внутренней базы знаний
const deepResearch = async (
  startPublishedDate: string | undefined,
  endPublishedDate: string | undefined,
  includeDomains: string[] | undefined,
  excludeDomains: string[] | undefined,
  includeText: string[] | undefined,
  excludeText: string[] | undefined,
  prompt: string,
  depth: number = 2,
  breadth: number = 5,
  vectorOfThought: string[] = [],
  accumulatedResearch: Research = {
    query: undefined,
    queries: [],
    searchResults: [],
    knowledgeBaseResults: [],
    learnings: [],
    completedQueries: [],
  },
  vectorStoreId: string
): Promise<Research> => {
  if (!accumulatedResearch.query) {
    accumulatedResearch.query = prompt;
  }

  if (depth === 0) {
    return accumulatedResearch;
  }

  let updatedPrompt = "";
  if (vectorOfThought.length === 0) {
    updatedPrompt = prompt;
  } else {
    const vectorOfThoughItem = vectorOfThought[vectorOfThought.length - depth];
    updatedPrompt = `${prompt},focus on these important branches of thought:  ${vectorOfThoughItem} `;
  }
  console.log(" call depth: ", depth);
  console.log(" updatedPrompt: ", updatedPrompt);
  const queries = await generateSearchQueries(updatedPrompt, breadth);
  accumulatedResearch.queries.push(...queries);

  for (const query of queries) {
    const searchResults = await searchAndProcess(
      startPublishedDate,
      endPublishedDate,
      includeDomains,
      excludeDomains,
      includeText,
      excludeText,
      breadth,
      query,
      accumulatedResearch.searchResults
    );
    accumulatedResearch.searchResults.push(...searchResults);

    if (vectorStoreId && vectorStoreId !== "") {
      console.log("getKnowledgeItem ", getKnowledgeItem);
      const kbResult = await getKnowledgeItem(query, vectorStoreId);
      accumulatedResearch.knowledgeBaseResults.push(kbResult);
    }

    for (const searchResult of searchResults) {
      const learnings = await generateLearnings(query, searchResult);
      accumulatedResearch.learnings.push(learnings);
      accumulatedResearch.completedQueries.push(query);

      const newQuery = `Overall research goal: ${prompt}
Previous search queries: ${accumulatedResearch.completedQueries.join(", ")}
Follow-up questions: ${learnings.followUpQuestions.join(", ")}`;

      await deepResearch(
        startPublishedDate,
        endPublishedDate,
        includeDomains,
        excludeDomains,
        includeText,
        excludeText,
        newQuery,
        depth - 1,
        Math.ceil(breadth / 2),
        vectorOfThought,
        accumulatedResearch,

        vectorStoreId
      );
    }
  }
  return accumulatedResearch;
};

const generateReport = async (
  research: Research,
  vectorOfThought: string[],
  systemPrompt: string
) => {
  console.log("research ", research);
  const { text } = await generateText({
    model: openai("o3-mini"),
    system: systemPrompt,
    prompt:
      "Use the following structured research data to generate a detailed expert report:\n\n" +
      JSON.stringify(research, null, 2),
  });

  return text;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      startPublishedDate,
      endPublishedDate,
      includeDomains,
      excludeDomains,
      includeText,
      excludeText,
      prompt,
      depth,
      breadth,
      vectorOfThought,
      vectorStoreId,
      systemPrompt,
    } = body;

    if (
      typeof prompt !== "string" ||
      typeof depth !== "number" ||
      typeof breadth !== "number" ||
      !Array.isArray(vectorOfThought)
    ) {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    const research = await deepResearch(
      startPublishedDate,
      endPublishedDate,
      includeDomains,
      excludeDomains,
      includeText,
      excludeText,
      prompt,
      vectorOfThought.length || depth,
      breadth,
      vectorOfThought,
      undefined,
      vectorStoreId
    );

    console.log("Исследование завершено!");
    console.log("Генерирую отчёт...");
    const report = await generateReport(
      research,
      vectorOfThought,
      systemPrompt
    );
    console.log("Отчёт сгенерирован! report.md");
    fs.writeFileSync("report.md", report);

    return NextResponse.json({ text: report });
  } catch (error) {
    console.error("deep-search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
