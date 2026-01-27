"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface JsonSyntaxHighlightProps {
  jsonString: string;
  className?: string;
}

// Tokenize and highlight JSON
function highlightJson(json: string): React.ReactNode[] {
  // Try to parse and pretty-print
  let formatted: string;
  try {
    const parsed = JSON.parse(json);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = json;
  }

  const tokens: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const addToken = (text: string, className: string) => {
    tokens.push(
      <span key={key++} className={className}>
        {text}
      </span>
    );
  };

  while (i < formatted.length) {
    const char = formatted[i];

    // String (key or value)
    if (char === '"') {
      let end = i + 1;
      while (end < formatted.length && formatted[end] !== '"') {
        if (formatted[end] === "\\") end++; // skip escaped char
        end++;
      }
      const str = formatted.slice(i, end + 1);
      
      // Check if this is a key (followed by colon)
      let afterQuote = end + 1;
      while (afterQuote < formatted.length && /\s/.test(formatted[afterQuote])) {
        afterQuote++;
      }
      
      if (formatted[afterQuote] === ":") {
        // It's a key
        addToken(str, "text-sky-600 dark:text-sky-400");
      } else {
        // It's a string value
        addToken(str, "text-emerald-600 dark:text-emerald-400");
      }
      i = end + 1;
      continue;
    }

    // Number
    if (/[\d.-]/.test(char) && (i === 0 || /[\s,:\[\{]/.test(formatted[i - 1]))) {
      let end = i;
      while (end < formatted.length && /[\d.eE+-]/.test(formatted[end])) {
        end++;
      }
      const num = formatted.slice(i, end);
      if (/^-?\d+\.?\d*([eE][+-]?\d+)?$/.test(num)) {
        addToken(num, "text-amber-600 dark:text-amber-400 font-mono");
        i = end;
        continue;
      }
    }

    // Boolean / null
    const remaining = formatted.slice(i);
    if (remaining.startsWith("true")) {
      addToken("true", "text-violet-600 dark:text-violet-400 font-medium");
      i += 4;
      continue;
    }
    if (remaining.startsWith("false")) {
      addToken("false", "text-violet-600 dark:text-violet-400 font-medium");
      i += 5;
      continue;
    }
    if (remaining.startsWith("null")) {
      addToken("null", "text-rose-500 dark:text-rose-400 font-medium");
      i += 4;
      continue;
    }

    // Brackets and braces
    if (char === "{" || char === "}") {
      addToken(char, "text-muted-foreground/70");
      i++;
      continue;
    }
    if (char === "[" || char === "]") {
      addToken(char, "text-muted-foreground/70");
      i++;
      continue;
    }

    // Colon and comma
    if (char === ":") {
      addToken(char, "text-muted-foreground");
      i++;
      continue;
    }
    if (char === ",") {
      addToken(char, "text-muted-foreground/60");
      i++;
      continue;
    }

    // Whitespace - preserve it
    if (/\s/.test(char)) {
      let end = i;
      while (end < formatted.length && /\s/.test(formatted[end])) {
        end++;
      }
      tokens.push(<span key={key++}>{formatted.slice(i, end)}</span>);
      i = end;
      continue;
    }

    // Fallback
    tokens.push(<span key={key++}>{char}</span>);
    i++;
  }

  return tokens;
}

export function JsonSyntaxHighlight({ jsonString, className }: JsonSyntaxHighlightProps) {
  const highlighted = React.useMemo(() => highlightJson(jsonString), [jsonString]);

  return (
    <pre className={cn("font-mono text-foreground whitespace-pre overflow-x-auto", className)}>
      <code>{highlighted}</code>
    </pre>
  );
}

