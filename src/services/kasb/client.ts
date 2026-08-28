import type {
  StandardIndexItem,
  StandardIndexResponse,
  ParagraphsResponse,
  SearchCountResponse,
  QnaListItem,
  QnaListResponse,
  QnaDetail,
  QnaDetailResponse,
  Clause,
} from "./types";

/**
 * db.kasb.or.kr(한국회계기준원 회계기준열람서비스)의 비공식 REST API 클라이언트.
 * 사이트는 Next.js SPA라 페이지를 그대로 fetch하면 본문이 안 나오지만, 내부적으로
 * 쓰는 이 API들을 인증 없이 직접 호출하면 조항 원문을 그대로 받을 수 있다.
 * (2026-08-25 네트워크 요청 캡처로 확인·검증)
 *
 * stdNum 체계: K-IFRS는 1000번대(1016=유형자산 등), 일반기업회계기준은 장 번호
 * 그대로(2=재무제표 표시 등). 둘 다 동일한 API 패턴으로 조회된다.
 *
 * 주의: 비공식 API이므로 사이트 개편 시 깨질 수 있다.
 */

const BASE = "https://db.kasb.or.kr/api";

async function getJson<T>(url: string, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      lastError = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastError;
}

export function stripHtml(html: string | undefined): string {
  return (html || "")
    .replace(/<em>/g, "")
    .replace(/<\/em>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "")
    .trim();
}

export async function getToc(stdNum: string | number): Promise<StandardIndexItem[]> {
  const data = await getJson<StandardIndexResponse>(`${BASE}/standard-indexes/${stdNum}`);
  return data.standardIndexes || [];
}

export async function getParagraphs(
  stdNum: string | number,
  documentId: string,
  searchWord = ""
): Promise<Clause[]> {
  const data = await getJson<ParagraphsResponse>(
    `${BASE}/paragraphs/${stdNum}/${documentId}?searchWord=${encodeURIComponent(searchWord)}`
  );
  return data.clauses || [];
}

export async function searchCount(searchWord: string): Promise<SearchCountResponse["countingData"]> {
  const data = await getJson<SearchCountResponse>(
    `${BASE}/search/total/count?searchWord=${encodeURIComponent(searchWord)}`
  );
  return data.countingData;
}

/** 목차 트리에서 실제 조항 leaf(자식이 없는 항목)만 추린다. */
export function getLeaves(toc: StandardIndexItem[]): StandardIndexItem[] {
  const parentIds = new Set<string>();
  toc.forEach((item) => (item.parentDocumentIds || []).forEach((id) => parentIds.add(id)));
  return toc.filter((item) => !parentIds.has(item.documentId) && item.documentType !== "body-introduction");
}

export interface StandardSection {
  sectionTitle: string;
  ref?: string;
  paragraphs: Array<{ paraNum: string; content: string }>;
}

/**
 * 기준서 전체(또는 searchWord 매칭분만) 본문을 섹션별로 구성해서 반환한다.
 * onlyMatching=true면 문단 내용에 searchWord가 포함된 조항만 남긴다.
 */
export async function getStandardContent(
  stdNum: string | number,
  searchWord = "",
  onlyMatching = false
): Promise<StandardSection[]> {
  const toc = await getToc(stdNum);
  const leaves = getLeaves(toc);

  const sections: StandardSection[] = [];
  for (const leaf of leaves) {
    const clauses = await getParagraphs(stdNum, leaf.documentId, searchWord);
    if (!clauses.length) continue;
    const filtered = onlyMatching
      ? clauses.filter((c) => stripHtml(c.paraContent).toLowerCase().includes(searchWord.toLowerCase()))
      : clauses;
    if (!filtered.length) continue;
    sections.push({
      sectionTitle: leaf.title,
      ref: leaf.ref,
      paragraphs: filtered.map((c) => ({ paraNum: c.paraNum, content: stripHtml(c.paraContent) })),
    });
  }
  return sections;
}

// ---------- 질의회신(Q&A) ----------

export async function qnaSearchList(word: string, rows = 10): Promise<QnaListItem[]> {
  const data = await getJson<QnaListResponse>(
    `${BASE}/qnas/v2?types=all&page=1&rows=${rows}&searchWord=${encodeURIComponent(word)}`
  );
  return data.facilityQnas || [];
}

export async function qnaDetail(docNumber: string): Promise<QnaDetail | null> {
  const data = await getJson<QnaDetailResponse>(`${BASE}/qnas/v2/${encodeURIComponent(docNumber)}`);
  return data.facilityQna ?? null;
}
