import "server-only";
import { openai } from "@/lib/ai/openai-client";

export interface ResearchResult {
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  keyFacts: string[];
  notableAchievements: string[];
  expertise: string[];
  controversies?: string[];
}

/**
 * Research a person using GPT-4o with web search via Responses API.
 * Returns biographical information and key facts.
 *
 * @param name - Name of the person to research
 * @param description - Optional description to guide research
 * @returns Structured research results with sources
 */
export async function researchPerson(
  name: string,
  description?: string
): Promise<ResearchResult> {
  console.log(`[Research] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[Research] 🆕 NEW PARSER CODE LOADED - v2.0`);
  console.log(`[Research] 🔍 Starting web search for: ${name}`);
  if (description) {
    console.log(`[Research] 📝 With description: ${description}`);
  }
  const startTime = Date.now();

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  console.log(`[Research] 📅 Current date: ${today}`);

  const userQuery = description
    ? `Search for the latest background and comprehensive information about ${name}. Focus on: ${description}.

Organize your findings in these sections with complete bullet points:

## Key Facts
- Full name, birthdate, and birthplace
- Current position/role as of ${today} (be specific with dates)
- Educational background (degrees, institutions, years)
- Career history with major positions and dates

## Notable Achievements
- Major career milestones and accomplishments
- Significant policies, initiatives, or projects led
- Awards, recognitions, or historic firsts
- Recent developments (within past 2 years)
- Quantifiable results and impact

## Areas of Expertise
- Professional domains and specializations
- Core skills and knowledge areas
- Industry experience and focus
- What they're professionally known for

Provide detailed, complete sentences for each bullet point with specific dates and context.`
    : `Search for the latest background and comprehensive information about ${name}.

Organize your findings in these sections with complete bullet points:

## Key Facts
- Full name, birthdate, and birthplace
- Current position/role as of ${today} (be specific with dates)
- Educational background (degrees, institutions, years)
- Career history with major positions and dates

## Notable Achievements
- Major career milestones and accomplishments
- Significant policies, initiatives, or projects led
- Awards, recognitions, or historic firsts
- Recent developments (within past 2 years)
- Quantifiable results and impact

## Areas of Expertise
- Professional domains and specializations
- Core skills and knowledge areas
- Industry experience and focus
- What they're professionally known for

Provide detailed, complete sentences for each bullet point with specific dates and context.`;

  try {
    console.log(`[Research] 🌐 Calling OpenAI Responses API with web_search tool...`);
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: `Date is ${today}`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userQuery,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "text",
        },
        verbosity: "medium",
      },
      tools: [
        {
          type: "web_search",
          user_location: {
            type: "approximate",
          },
          search_context_size: "medium",
        },
      ],
      store: false,
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[Research] ✅ Web search completed in ${(elapsedMs / 1000).toFixed(2)}s`);

    // Extract content from Responses API
    console.log(`[Research] 📤 Extracting response content from Responses API...`);
    const output = (response as any).output || [];

    let jsonContent = "";
    for (const item of output) {
      if (item.type === "message" && item.role === "assistant") {
        const content = item.content || [];
        for (const contentItem of content) {
          if (contentItem.type === "output_text") {
            jsonContent = contentItem.text;
            break;
          }
        }
        if (jsonContent) break;
      }
    }

    if (!jsonContent) {
      console.error(`[Research] ❌ No content returned from web search`);
      throw new Error("No content returned from web search");
    }

    console.log(`[Research] 📄 Received ${jsonContent.length} characters of research data`);
    console.log(`[Research] 📝 First 500 chars of response:\n${jsonContent.substring(0, 500)}...`);

    // Parse markdown-formatted text response
    const keyFacts: string[] = [];
    const notableAchievements: string[] = [];
    const expertise: string[] = [];
    const controversies: string[] = [];

    let currentSection: "facts" | "achievements" | "expertise" | "controversies" | null = null;
    let currentItem = "";

    // Helper to strip markdown formatting
    const stripMarkdown = (text: string): string => {
      return text
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
        .replace(/`([^`]+)`/g, '$1') // Remove code formatting
        .trim();
    };

    const saveCurrentItem = () => {
      if (!currentItem || !currentSection) return;

      const cleaned = stripMarkdown(currentItem);
      if (cleaned.length >= 30) {
        console.log(`[Research]   ✅ Adding to ${currentSection}: "${cleaned.substring(0, 80)}..."`);
        switch (currentSection) {
          case "facts":
            keyFacts.push(cleaned);
            break;
          case "achievements":
            notableAchievements.push(cleaned);
            break;
          case "expertise":
            expertise.push(cleaned);
            break;
          case "controversies":
            controversies.push(cleaned);
            break;
        }
      }
      currentItem = "";
    };

    const lines = jsonContent.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        // Empty line might signal end of current item
        if (currentItem.length > 0) {
          saveCurrentItem();
        }
        continue;
      }

      // Detect section headers (## or ###)
      if (/^###+\s*(Key Facts|Current Role|Current Position)/i.test(trimmed)) {
        saveCurrentItem(); // Save any pending item
        currentSection = "facts";
        console.log(`[Research] 📋 Found Key Facts section`);
        continue;
      } else if (/^###+\s*(Notable Achievements|Accomplishments|Major.*Initiatives)/i.test(trimmed)) {
        saveCurrentItem();
        currentSection = "achievements";
        console.log(`[Research] 🏆 Found Notable Achievements section`);
        continue;
      } else if (/^###+\s*(Areas? of Expertise|Expertise|Specializations)/i.test(trimmed)) {
        saveCurrentItem();
        currentSection = "expertise";
        console.log(`[Research] 💼 Found Areas of Expertise section`);
        continue;
      } else if (/^###+\s*(Controversies|Criticisms)/i.test(trimmed)) {
        saveCurrentItem();
        currentSection = "controversies";
        console.log(`[Research] ⚠️  Found Controversies section`);
        continue;
      }

      // Skip lines that are section dividers or other non-content
      if (!currentSection) continue;

      // If line starts with bullet, it might be a new item or category header
      if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
        const content = trimmed.substring(1).trim();

        // Check if this is a category header (bold text, short, generic)
        if (/^\*\*[^*]+\*\*\s*$/.test(content) && content.length < 80) {
          // Category header - save previous item and skip this
          saveCurrentItem();
          continue;
        }

        // This is a real content line - save previous and start new
        saveCurrentItem();
        currentItem = content;
      } else {
        // Continuation line (no bullet) - append to current item
        currentItem += (currentItem ? " " : "") + trimmed;
      }
    }

    // Save last item
    saveCurrentItem();

    console.log(`[Research] 📝 Parsed sections:`);
    console.log(`[Research]   • Key Facts: ${keyFacts.length} items`);
    console.log(`[Research]   • Achievements: ${notableAchievements.length} items`);
    console.log(`[Research]   • Expertise: ${expertise.length} items`);

    // Extract sources from web_search_call items in input
    console.log(`[Research] 🔗 Extracting sources from web_search_call items...`);
    const sources: ResearchResult["sources"] = [];
    const input = (response as any).input || [];

    const seenUrls = new Set<string>();

    // Helper to get a clean title from URL
    const getTitleFromUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const path = urlObj.pathname;

        // Try to extract a meaningful page name from path
        const pathParts = path.split('/').filter(p => p && p !== 'wiki');
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          // Clean up the path part
          const cleaned = lastPart
            .replace(/[-_]/g, ' ')
            .replace(/\?.*$/, '') // Remove query params
            .replace(/\.html?$/, ''); // Remove .html

          if (cleaned && cleaned.length > 3) {
            return `${hostname} - ${cleaned}`;
          }
        }

        return hostname;
      } catch (e) {
        return url;
      }
    };

    // Find all web_search_call items
    let webSearchCallCount = 0;
    for (const item of input) {
      if (item.type === "web_search_call") {
        webSearchCallCount++;
        console.log(`[Research] 🔍 Found web_search_call #${webSearchCallCount}:`, JSON.stringify(item, null, 2));

        const action = item.action;
        if (!action) continue;

        // Extract queries
        if (action.queries) {
          console.log(`[Research]   🔎 Queries: ${action.queries.join(', ')}`);
        }

        // Extract from open_page action
        if (action.type === "open_page" && action.url) {
          if (!seenUrls.has(action.url)) {
            seenUrls.add(action.url);
            sources.push({
              title: getTitleFromUrl(action.url),
              url: action.url,
              snippet: "",
            });
            console.log(`[Research]   ✅ Source from open_page: ${action.url}`);
          }
        }

        // Extract from search action with sources
        if (action.sources) {
          for (const source of action.sources) {
            if (source.url && !seenUrls.has(source.url)) {
              seenUrls.add(source.url);
              sources.push({
                title: source.title || getTitleFromUrl(source.url),
                url: source.url,
                snippet: source.snippet || "",
              });
              console.log(`[Research]   ✅ Source from search results: ${source.title || source.url}`);
            }
          }
        }
      }
    }

    console.log(`[Research] 📊 Found ${webSearchCallCount} web_search_call items`);

    // Also extract from inline markdown links in the response
    console.log(`[Research] 🔗 Extracting URLs from inline markdown links...`);
    const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;

    while ((match = urlRegex.exec(jsonContent)) !== null) {
      const [, linkText, url] = match;

      if (!seenUrls.has(url)) {
        seenUrls.add(url);

        // Clean up URL title
        let title = linkText;
        if (linkText === name || linkText.length < 5) {
          title = getTitleFromUrl(url);
        }

        sources.push({
          title,
          url,
          snippet: "",
        });
        console.log(`[Research]   📄 From inline link: "${title}" -> ${url}`);
      }
    }

    console.log(`[Research] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[Research] 📊 Extraction Summary:`);
    console.log(`[Research]   • ${keyFacts.length} key facts`);
    console.log(`[Research]   • ${notableAchievements.length} achievements`);
    console.log(`[Research]   • ${expertise.length} expertise areas`);
    console.log(`[Research]   • ${sources.length} sources`);
    console.log(`[Research] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return {
      summary: jsonContent,
      sources: sources.slice(0, 5), // Limit to top 5 sources
      keyFacts,
      notableAchievements,
      expertise,
      controversies: controversies.length > 0 ? controversies : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Research] Failed:", msg);
    throw new Error(`Research failed: ${msg}`);
  }
}
