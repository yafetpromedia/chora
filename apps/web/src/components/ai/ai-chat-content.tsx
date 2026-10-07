"use client";

import type { ReactNode } from "react";
import Link from "next/link";

function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  try {
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-c-${i++}`}>{token.slice(1, -1)}</code>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && isSafeHref(link[2])) {
        const href = link[2];
        const label = link[1];
        if (href.startsWith("/")) {
          nodes.push(
            <Link key={`${keyPrefix}-l-${i++}`} href={href} className="ai-chat__md-link">
              {label}
            </Link>,
          );
        } else {
          nodes.push(
            <a
              key={`${keyPrefix}-l-${i++}`}
              href={href}
              className="ai-chat__md-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {label}
            </a>,
          );
        }
      } else {
        nodes.push(token);
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function AiChatContent({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let bi = 0;

  function flushList() {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${bi++}`} className="ai-chat__md-list">
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${bi}-${idx}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${bi++}`} className="ai-chat__md-gap" />);
      continue;
    }
    blocks.push(
      <p key={`p-${bi++}`} className="ai-chat__md-p">
        {renderInline(line, `p-${bi}`)}
      </p>,
    );
  }
  flushList();

  return <div className="ai-chat__md">{blocks}</div>;
}
