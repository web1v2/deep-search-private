"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { __ } from "@/lib/translation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Calendar } from "@/components/ui/calendar";

const fixedPartOfSystemPrompt = (
  vectorOfThought: string[]
) => ` # Role:You are an expert researcher. Today is ${new Date().toISOString()}
# Use language ${
  process.env.NEXT_PUBLIC_APP_HTTP_LANG || "en"
} for generate answer.
${
  vectorOfThought &&
  vectorOfThought.length > 0 &&
  "# This section contains an additional request or requests that indicate the focus of the research or multiple studies. Use this focus to generate the title and to structure the report content. Process each of the main ideas from the following list separately:"
}
${vectorOfThought && vectorOfThought.length > 0 && vectorOfThought.join(", ")}`;

const defaultSystemPrompt = `
# Follow these instructions when responding:
## Ensure that each source retrieved from the internet is described and integrated into the article.

  ## You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
  ## The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
  ## Be highly organized.  
  ## Suggest solutions that I didn't think about.
  ## Be proactive and anticipate my needs.
  ## Treat me as an expert in all subject matter.
  ## Mistakes erode my trust, so be accurate and thorough.
  ## Provide detailed explanations, I'm comfortable with lots of detail.
  ## Value good arguments over authorities, the source is irrelevant.
  ##Consider new technologies and contrarian ideas, not just the conventional wisdom.
  ##You may use high levels of speculation or prediction, just flag it for me.
# Output format:

## Each research must include a title, objective, and date of the research.

## For every source, include:
### If no information is found or the available information is questionable, it is acceptable to respond as- No reliable information was found on this subject.
### All references must be cited as a number in square brackets [n], where n corresponds to the source number in the list of all resources.
### Use Markdown formatting
### A brief overview of the area to be explored.
 #### A middle summary,  minimum in 2000 symbols or more, of the main conclusion or insight gained from it.
 #### A relevant use case or example mentioned in the source. This part must have more charts. It most important part of research. Within a single report, use cases must be provided from all identified sources. This means the number of described cases in each study should match the number of resources used.
 #### Comparison  Table.  The comparison table must have no more than four columns, left-aligned, and be formatted in Markdown style.
####Present a chart to compare numerical indicators if it is possible to extract raw values from the provided documents.
#### Create a list with 3 to 5 advantages and a list with 3 to 5 disadvantages.
 #### Link as [n] to the source.
### Identify three key trends and perform linear forecasting based on regression analysis. Present them as a numbered list:
#### The trend expected to grow the most.
 #### The trend showing stagnation.
 #### The trend expected to decline the most.
### A brief summary of the conclusions that can be drawn from this aspect of the research.
### List all sources that were used in preparing the study. Present them in a list format, like this:
• [1] - https://…,  the publication date: dd-mm-yyyy;
• [2] - https://…,  the publication date: dd-mm-yyyy;
•...
## Provide a comprehensive summary ,minimum in 3000 symbols or more, covering all topics of the report.
# Footer: This research was conducted on the Web1V2 platform. `;

// Схема валидации формы
const DeepSearchFormSchema = z.object({
  prompt: z.string().min(1, { message: __("Prompt is required") }),
  depth: z.number().min(1).max(3),
  breadth: z.number().min(1).max(5),
  vectorOfThought: z.string().optional(),
  vectorStoreId: z.string().optional(),
  startPublishedDate: z.string().optional(),
  endPublishedDate: z.string().optional(),
  includeDomains: z.string().optional(),
  excludeDomains: z.string().optional(),
  includeText: z.string().optional(),
  excludeText: z.string().optional(),
  newSystemPrompt: z.string().min(1),
});

type DeepSearchFormType = z.infer<typeof DeepSearchFormSchema>;

export default function DeepSearchPage() {
  // Управление формой через react-hook-form + zod
  const form = useForm<DeepSearchFormType>({
    resolver: zodResolver(DeepSearchFormSchema),
    defaultValues: {
      prompt: "",
      depth: 1,
      breadth: 2,
      vectorOfThought: "",
      vectorStoreId: "",
      startPublishedDate: "",
      endPublishedDate: "",
      includeDomains: "",
      excludeDomains: "",
      includeText: "",
      excludeText: "",
      newSystemPrompt: defaultSystemPrompt,
    },
  });

  const [computedDepth, setComputedDepth] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);

  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShownAllSettings, setShownAllSettings] = useState(false);

  // Вычисление глубины и systemPrompt при изменении vectorOfThought и newSystemPrompt
  useEffect(() => {
    const vectorOfThoughtValue = form.watch("vectorOfThought") ?? "";
    const newSystemPromptValue = form.watch("newSystemPrompt") ?? "";
  
    const vectorLines = vectorOfThoughtValue
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
 
    const linesCount = vectorLines.length;
    form.setValue("depth", linesCount)
    setComputedDepth(linesCount && linesCount > 0  ? linesCount : 0);
  
    const fixedPart = fixedPartOfSystemPrompt(vectorLines);
    const newPrompt = fixedPart + newSystemPromptValue;
  
    setSystemPrompt(newPrompt);
  }, [form.watch("vectorOfThought"), form.watch("newSystemPrompt")]);
  console.log(' computedDepth', computedDepth)
  // Функция отправки формы
  const onSubmit = async (data: DeepSearchFormType) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Обработка доменов и текста в массивы
      const includeDomainsArr = data.includeDomains
        ? data.includeDomains.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const excludeDomainsArr = data.excludeDomains
        ? data.excludeDomains.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const includeTextArr = data.includeText
        ? data.includeText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5)
        : undefined;
      const excludeTextArr = data.excludeText
        ? data.excludeText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5)
        : undefined;

      const response = await fetch("/api/ai/deep-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startPublishedDate: data.startPublishedDate || undefined,
          endPublishedDate: data.endPublishedDate || undefined,
          prompt: data.prompt,
          depth: computedDepth > 0 ? computedDepth : data.depth,
          breadth: data.breadth,
          vectorStoreId: data.vectorStoreId || undefined,
          vectorOfThought: data.vectorOfThought
            ? data.vectorOfThought.split("\n").map((s) => s.trim()).filter(Boolean)
            : [],
          systemPrompt, // обновленный systemPrompt
          includeDomains: includeDomainsArr,
          excludeDomains: excludeDomainsArr,
          includeText: includeTextArr,
          excludeText: excludeTextArr,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || __("Error in response"));
      } else if (typeof responseData.text === "string") {
        setResult(responseData.text);
      } else {
        setError(__("Unexpected response format"));
      }
    } catch (err) {
      console.error(err);
      setError(__("Network or server error"));
    } finally {
      setLoading(false);
    }
  };

  // Скачивание результата отчёта
  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{__("Deep Research")}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Prompt */}
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{__("Prompt")}</FormLabel>
                <FormControl>
                  <Textarea
                    id="prompt"
                    rows={3}
                    {...field}
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Depth и Breadth - в одной строке */}
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="depth"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>{__("Depth")}</FormLabel>
                  <FormControl>
                    <Input
                      id="depth"
                      type="number"
                      min={1}
                      max={3}
                      {...field}
                      value={computedDepth > 0 ? computedDepth : form.watch("depth") }
                      disabled={computedDepth > 0}
                      className="w-full border p-2 rounded"
                      onChange={(e) => form.setValue("depth", Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="breadth"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>{__("Breadth")}</FormLabel>
                  <FormControl>
                    <Input
                      id="breadth"
                      type="number"
                      min={1}
                      max={5}
                      {...field}
                      className="w-full border p-2 rounded"
                      onChange={(e) => form.setValue("breadth", Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Vector Of Thought */}
          <FormField
            control={form.control}
            name="vectorOfThought"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{__("Topics that must be the focus of the research.")}</FormLabel>
                <FormControl>
                  <Textarea
                    id="vectorOfThought"
                    rows={4}
                    placeholder={__("Comma separated list of strings")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Кнопка показа дополнительных настроек */}
          {!isShownAllSettings ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShownAllSettings(true)}
            >
              {__("Show all settings")}
            </Button>
          ) : (
            <>
              {/* Vector Store ID */}
              <FormField
                control={form.control}
                name="vectorStoreId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__("Vector Store ID")}</FormLabel>
                    <FormControl>
                      <Input
                        id="vectorStoreId"
                        type="text"
                        {...field}
                        className="w-full border p-2 rounded"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start and End Publish Date */}
              <div className="flex gap-4">
                {/* Start Published Date */}
                <FormField
                  control={form.control}
                  name="startPublishedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__("Start Publish Date")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="w-full border p-2 rounded"
                        />
                      </FormControl>
                      <FormDescription>
                        {__(
                          "Only links with a publication date after this one will be returned."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* End Published Date */}
                <FormField
                  control={form.control}
                  name="endPublishedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{__("End Publish Date")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="w-full border p-2 rounded"
                        />
                      </FormControl>
                      <FormDescription>
                        {__("Only links with a previously published date will be returned.")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Include / Exclude Domains */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="includeDomains"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{__("Include Domains")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={__("Comma separated list of domains")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {__(
                          "List of domains to include in the search. Only results from these domains will be returned."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="excludeDomains"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{__("Exclude Domains")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={__("Comma separated list of domains")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {__(
                          "List of domains to exclude from search results. No results from these domains will be returned."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Include / Exclude Text */}
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="includeText"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{__("Include Text")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={__("Comma separated list of strings")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {__(
                          "List of strings that must be present in webpage text of results. Max 5 items, up to ~5 words each."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="excludeText"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>{__("Exclude Text")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder={__("Comma separated list of strings")}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {__(
                          "List of strings that must not be present in webpage text of results. Max 5 items, up to ~5 words each."
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* System Prompt */}
              <FormField
                control={form.control}
                name="newSystemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{__("System Prompt (для генерации отчёта)")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={10}
                        className="font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? __("Researching...") : __("Start Research")}
          </Button>
        </form>
      </Form>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">{__("Result")}</h2>
        {error && (
          <p className="text-red-600 mb-2">
            {__("Ошибка")}: {error}
          </p>
        )}

        {result && (
          <>
            <div className="prose max-w-none max-h-[500px] overflow-auto p-4 border border-gray-300 rounded bg-blue-950 text-white">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            <Button
              onClick={handleDownload}
              className="mt-4 bg-green-600 hover:bg-green-700 w-full"
            >
              {__("Скачать Report.md")}
            </Button>
          </>
        )}
      </section>

      <footer className="border-t border-gray-300 mt-4 text-center p-4">
        <p className="text-sm">
          Powered by{" "}
          <a href="https://web1v2.com" className="text-gray-500 underline">
            Web1V2
          </a>{" "}
          &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}