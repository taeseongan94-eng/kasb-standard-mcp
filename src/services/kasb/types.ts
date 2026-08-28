/** db.kasb.or.kr 비공식 API 응답 타입 */

export interface StandardIndexItem {
  documentId: string;
  title: string;
  ref?: string; // 문단번호 범위
  level: number;
  parentDocumentIds?: string[];
  documentType?: string; // "body-introduction" 등
}

export interface StandardIndexResponse {
  standardIndexes: StandardIndexItem[];
}

export interface Clause {
  paraNum: string;
  paraContent: string; // HTML
  fullContent?: string;
}

export interface ParagraphsResponse {
  clauses: Clause[];
}

export interface SearchCountResponse {
  countingData: {
    standardCountData?: Record<string, number>;
    qnaCountData?: Record<string, number>;
  };
}

export interface QnaListItem {
  docNumber: string;
  title: string | string[];
  date?: string;
  prefixStr?: string;
  fullContent?: string;
}

export interface QnaListResponse {
  facilityQnas: QnaListItem[];
}

export interface QnaDetail {
  docNumber: string;
  title: string;
  fullContent: string;
}

export interface QnaDetailResponse {
  facilityQna: QnaDetail;
}

export interface CatalogEntry {
  stdNum: number;
  category: "K-IFRS" | "K-IFRS 해석서" | "일반기업회계기준" | "기타기준서";
  title: string;
}
