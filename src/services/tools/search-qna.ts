import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { qnaSearchList, qnaDetail, stripHtml } from "../kasb/client";
import { handleApiError } from "../utils/error-handler";

const SearchQnaInputSchema = z.object({
  query: z.string().min(1).describe("검색어 (한글 회계 용어)"),
  rows: z.number().int().min(1).max(30).default(10).describe("검색 결과 목록 개수 (기본 10)"),
  detail_top_n: z.number().int().min(0).max(5).default(3).describe("목록 중 상위 몇 건의 전문(질의/회신/관련기준)을 함께 반환할지 (기본 3)"),
}).strict();

type SearchQnaInput = z.infer<typeof SearchQnaInputSchema>;

export function registerSearchQnaTool(server: McpServer): void {
  server.registerTool(
    "search_qna",
    {
      title: "회계기준 질의회신 검색 (KASB 공식)",
      description: `한국회계기준원의 질의회신(신속처리질의, IFRS 해석위원회 회신 등)을 검색합니다.
목록(문서번호/제목/일자)과 함께, 상위 매칭 건은 전문(질의 내용/회신/관련 회계기준 원문)까지 반환합니다.
특정 회사의 실무 사례에 가까운 판단이 필요할 때, 기준서 원문(search_standard/get_standard_content)과 함께 활용하세요.

[파라미터]
- query: 검색어
- rows: 목록에 포함할 결과 수 (기본 10)
- detail_top_n: 전문까지 가져올 상위 건수 (기본 3, 0이면 목록만)`,
      inputSchema: SearchQnaInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params: SearchQnaInput) => {
      try {
        const list = await qnaSearchList(params.query, params.rows);
        const listOutput = list.map((q) => ({
          docNumber: q.docNumber,
          title: stripHtml(Array.isArray(q.title) ? q.title.join(" ") : q.title),
          prefix: q.prefixStr ?? null,
          date: q.date ? q.date.slice(0, 10) : null,
        }));

        const details: Array<{ docNumber: string; title: string; fullContent: string }> = [];
        const top = list.slice(0, params.detail_top_n);
        for (const q of top) {
          const detail = await qnaDetail(q.docNumber);
          if (!detail) continue;
          details.push({
            docNumber: detail.docNumber,
            title: stripHtml(detail.title),
            fullContent: stripHtml(detail.fullContent),
          });
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ query: params.query, list: listOutput, details }) }],
        };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}
