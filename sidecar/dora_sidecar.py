#!/usr/bin/env python3

from __future__ import annotations

import html
import json
import os
import re
import sys
import traceback
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any


DEFAULT_SEARCH_URL = os.environ.get("DORA_DEFAULT_SEARCH_URL", "https://html.duckduckgo.com/html/")
DEFAULT_USER_AGENT = "DoraSidecar/0.1"
MAX_CONTENT_CHARS = 20000


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._title_parts: list[str] = []
        self._text_parts: list[str] = []
        self._in_title = False
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lower = tag.lower()
        if lower == "title":
            self._in_title = True
        if lower in {"script", "style", "noscript"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        lower = tag.lower()
        if lower == "title":
            self._in_title = False
        if lower in {"script", "style", "noscript"} and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        text = data.strip()
        if not text:
            return
        if self._in_title:
            self._title_parts.append(text)
        self._text_parts.append(text)

    @property
    def title(self) -> str:
        return " ".join(self._title_parts).strip()

    @property
    def text(self) -> str:
        joined = "\n".join(self._text_parts)
        return normalize_whitespace(joined)


@dataclass
class SidecarError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+", " ", value)).strip()


def read_json_lines() -> None:
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
        except Exception as exc:  # noqa: BLE001
            response = {
                "id": request.get("id") if isinstance(locals().get("request"), dict) else None,
                "type": "error",
                "error": str(exc),
            }
            traceback.print_exc(file=sys.stderr)
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


def handle_request(request: dict[str, Any]) -> dict[str, Any]:
    request_id = request.get("id")
    request_type = request.get("type")
    payload = request.get("payload") or {}
    config = request.get("config") or {}

    if request_type == "search":
        return ok(request_id, handle_search(payload, config))
    if request_type == "browse":
        return ok(request_id, handle_browse(payload))
    if request_type == "extract":
        return ok(request_id, handle_extract(payload, config))
    if request_type == "render":
        return ok(request_id, handle_render(payload))
    if request_type == "ping":
        return ok(request_id, {"status": "ok"})

    raise SidecarError(f"Unsupported sidecar request type: {request_type}")


def ok(request_id: str | None, data: Any) -> dict[str, Any]:
    return {"id": request_id, "type": "results", "data": data}


def fetch_text(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: bytes | None = None) -> str:
    request = urllib.request.Request(
        url,
        method=method,
        data=body,
        headers={"User-Agent": DEFAULT_USER_AGENT, **(headers or {})},
    )
    with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def handle_search(payload: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    query = str(payload.get("query", "")).strip()
    if not query:
        raise SidecarError("Search query is required.")

    endpoint = payload.get("endpoint") or config.get("searchEndpoint") or {}
    mode = endpoint.get("mode") or ("json" if endpoint.get("responsePath") else "html")
    url = endpoint.get("url") or DEFAULT_SEARCH_URL
    method = endpoint.get("method", "GET").upper()
    headers = endpoint.get("headers") or {}

    if mode == "json":
        parsed = urllib.parse.urlparse(url)
        query_map = urllib.parse.parse_qs(parsed.query)
        query_map["q"] = [query]
        if "format" not in query_map:
            query_map["format"] = ["json"]
        updated_url = urllib.parse.urlunparse(
            parsed._replace(query=urllib.parse.urlencode(query_map, doseq=True))
        )
        body = None
    else:
        if method == "GET":
            parsed = urllib.parse.urlparse(url)
            query_map = urllib.parse.parse_qs(parsed.query)
            query_map["q"] = [query]
            updated_url = urllib.parse.urlunparse(
                parsed._replace(query=urllib.parse.urlencode(query_map, doseq=True))
            )
            body = None
        else:
            body = urllib.parse.urlencode({"q": query}).encode("utf-8")
            updated_url = url
            headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    raw = fetch_text(updated_url, method=method, headers=headers, body=body)
    results = (
        extract_search_results_json(raw, endpoint.get("responsePath"))
        if mode == "json"
        else extract_search_results_html(raw)
    )
    return {"query": query, "results": results, "logged": False}


def extract_search_results_json(raw: str, response_path: str | None) -> list[dict[str, Any]]:
    data = json.loads(raw)
    if response_path:
        for key in response_path.split("."):
            data = data.get(key, []) if isinstance(data, dict) else []
    if not isinstance(data, list):
        return []
    results = []
    for item in data:
        if not isinstance(item, dict):
            continue
        results.append(
            {
                "title": item.get("title") or item.get("name") or "Untitled",
                "url": item.get("url") or item.get("link") or "",
                "snippet": item.get("content") or item.get("snippet") or "",
                "score": item.get("score"),
            }
        )
    return results


def extract_search_results_html(raw: str) -> list[dict[str, Any]]:
    block_pattern = re.compile(
        r'<div class="result results_links.*?<div class="clear"></div>\s*</div>\s*</div>',
        re.IGNORECASE | re.DOTALL,
    )
    title_pattern = re.compile(
        r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )
    snippet_pattern = re.compile(
        r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(?P<snippet>.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )

    results = []
    for block_match in block_pattern.finditer(raw):
        block = block_match.group(0)
        title_match = title_pattern.search(block)
        if title_match is None:
            continue
        snippet_match = snippet_pattern.search(block)
        results.append(
            {
                "title": normalize_whitespace(strip_tags(html.unescape(title_match.group("title")))),
                "url": html.unescape(title_match.group("url")),
                "snippet": normalize_whitespace(
                    strip_tags(html.unescape(snippet_match.group("snippet"))) if snippet_match else ""
                ),
            }
        )
        if len(results) >= 10:
            break
    return results


def handle_browse(payload: dict[str, Any]) -> dict[str, Any]:
    url = str(payload.get("url", "")).strip()
    if not url:
        raise SidecarError("URL is required.")
    raw = fetch_text(url)
    extractor = TextExtractor()
    extractor.feed(raw)
    content = extractor.text[:MAX_CONTENT_CHARS]
    return {
        "url": url,
        "title": extractor.title or url,
        "content": content,
        "excerpt": content[:400],
    }


def handle_extract(payload: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    content = normalize_whitespace(str(payload.get("content", "")))
    if not content:
        raise SidecarError("Content is required for extraction.")

    endpoint = config.get("llmEndpoint")
    if endpoint and endpoint.get("url"):
        return llm_extract(content, endpoint)
    return heuristic_extract(content)


def heuristic_extract(content: str) -> dict[str, Any]:
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    headline = paragraphs[0].split("\n", 1)[0][:120] if paragraphs else "Extracted content"
    claims = []
    for paragraph in paragraphs[:3]:
        sentence = paragraph.split(". ")[0].strip()
        if sentence:
            claims.append(
                {
                    "statement": sentence[:240],
                    "sourceUrl": "",
                    "confidence": "low",
                }
            )
    consensus = paragraphs[0][:500] if paragraphs else content[:500]
    gaps = []
    if len(paragraphs) < 2:
        gaps.append("Needs more source material for a stronger extraction.")
    return {
        "topic": headline,
        "keyClaims": claims,
        "consensus": consensus,
        "contradictions": [],
        "knowledgeGaps": gaps,
        "searchQuality": "sparse" if len(paragraphs) < 3 else "rich",
        "timestamp": None,
    }


def llm_extract(content: str, endpoint: dict[str, Any]) -> dict[str, Any]:
    provider = endpoint.get("provider") or "openai"
    headers = {"Content-Type": "application/json", **(endpoint.get("headers") or {})}
    api_key = endpoint.get("apiKey")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    if provider == "anthropic":
        headers.setdefault("x-api-key", api_key or "")
        headers.setdefault("anthropic-version", "2023-06-01")
        body = {
            "model": endpoint.get("model") or "claude-3-haiku-20240307",
            "max_tokens": 1024,
            "system": endpoint.get("systemPrompt") or "Extract structured findings from the provided content.",
            "messages": [{"role": "user", "content": content}],
        }
    else:
        body = {
            "model": endpoint.get("model") or "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": endpoint.get("systemPrompt")
                    or "Extract structured research findings as JSON with topic, keyClaims, consensus, contradictions, knowledgeGaps, searchQuality.",
                },
                {"role": "user", "content": content},
            ],
            "response_format": {"type": "json_object"},
        }

    raw = fetch_text(
        endpoint["url"],
        method="POST",
        headers=headers,
        body=json.dumps(body).encode("utf-8"),
    )
    data = json.loads(raw)
    llm_content = data.get("content", [{}])[0].get("text", "") if provider == "anthropic" else data.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        parsed = json.loads(llm_content)
    except json.JSONDecodeError as exc:
        raise SidecarError(f"LLM extraction did not return valid JSON: {exc}") from exc

    return {
        "topic": parsed.get("topic") or "Extracted content",
        "keyClaims": parsed.get("keyClaims") or parsed.get("key_claims") or [],
        "consensus": parsed.get("consensus") or "",
        "contradictions": parsed.get("contradictions") or [],
        "knowledgeGaps": parsed.get("knowledgeGaps") or parsed.get("knowledge_gaps") or [],
        "searchQuality": parsed.get("searchQuality") or parsed.get("search_quality") or "sparse",
        "timestamp": None,
    }


def handle_render(payload: dict[str, Any]) -> dict[str, Any]:
    content = normalize_whitespace(str(payload.get("content", "")))
    render_type = str(payload.get("renderType", "note"))
    if not content:
        raise SidecarError("Content is required for rendering.")

    lines = [line.strip() for line in content.splitlines() if line.strip()]
    preview = "\n\n".join(lines[:6])
    return {
        "type": render_type,
        "content": content,
        "preview": preview,
        "wordCount": len(content.split()),
        "lineCount": len(lines),
    }


def strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


if __name__ == "__main__":
    read_json_lines()
