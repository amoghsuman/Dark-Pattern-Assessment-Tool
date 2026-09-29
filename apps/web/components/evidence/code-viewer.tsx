'use client';

import type { CodeSnippetEvidence, ConfigExcerptEvidence } from '@dpat/shared';
import { FileCode2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type CodeEvidence = CodeSnippetEvidence | ConfigExcerptEvidence;

function languageOf(evidence: CodeEvidence): string {
  return evidence.kind === 'code_snippet' ? evidence.language : evidence.format;
}

/**
 * Syntax-highlighted code or configuration excerpt with real file line numbers and highlighted
 * lines. Shiki loads on demand; a plain rendering with the same line numbers shows meanwhile.
 */
export function CodeViewer({ evidence }: { evidence: CodeEvidence }) {
  const text = evidence.kind === 'code_snippet' ? evidence.code : evidence.content;
  const location = evidence.kind === 'code_snippet' ? evidence.filePath : evidence.source;
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('shiki').then(async ({ codeToHtml }) => {
      const out = await codeToHtml(text, {
        lang: languageOf(evidence),
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
        transformers: [
          {
            line(node, line) {
              const fileLine = evidence.startLine + line - 1;
              node.properties['data-line'] = String(fileLine);
              if (evidence.highlightLines.includes(fileLine))
                this.addClassToHast(node, 'highlighted');
            },
          },
        ],
      });
      if (!cancelled) setHtml(out);
    });
    return () => {
      cancelled = true;
    };
  }, [evidence, text]);

  return (
    <figure className="overflow-hidden rounded-lg border">
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/50 px-3 py-2 text-xs">
        <FileCode2 className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-mono font-medium break-all">{location}</span>
        <span className="text-muted-foreground">
          lines {evidence.startLine}–{evidence.endLine}
        </span>
        {evidence.kind === 'code_snippet' && evidence.commitSha ? (
          <span className="font-mono text-muted-foreground">@ {evidence.commitSha}</span>
        ) : null}
        <span className="ml-auto text-muted-foreground">{evidence.caption}</span>
      </figcaption>
      {html ? (
        // Shiki output escapes the source text; the evidence comes from the repository.
        <div
          className="code-viewer overflow-x-auto text-[13px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="code-viewer overflow-x-auto py-3 text-[13px]">
          <code>
            {text.split('\n').map((line, i) => {
              const fileLine = evidence.startLine + i;
              return (
                <span
                  key={fileLine}
                  data-line={fileLine}
                  className={
                    evidence.highlightLines.includes(fileLine) ? 'line highlighted' : 'line'
                  }
                >
                  {line}
                  {'\n'}
                </span>
              );
            })}
          </code>
        </pre>
      )}
    </figure>
  );
}
