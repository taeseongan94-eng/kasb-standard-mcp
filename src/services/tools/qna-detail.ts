import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { qnaDetail, stripHtml } from "../kasb/client";
import { handleApiError } from "../utils/error-handler";

const QnaDetailInputSchema = z.object({
  doc_number: z.string().min(1).describe("질의회신 문서번호 (예: 'SSI-202606011') — search_qna 결과의 docNumber"),
}).strict();

type QnaDetailInput = z.infer<typeof QnaDetailInputSchema>;

export function registerQnaDetailTool(server: McpServer): void {
  server.registerTool(
    "get_qna_detail",
    {
      title: "회계기준 질의회신 전문 조회 (KASB 공식)",
      description: `특정 문서번호의 질의회신 전문(질의 내용, 회신, 관련 회계기준 원문)을 반환합니다.
문서번호를 모르면 search_qna 로 먼저 검색하세요.`,
      inputSchema: QnaDetailInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params: QnaDetailInput) => {
      try {
        const detail = await qnaDetail(params.doc_number);
        if (!detail) {
          return { content: [{ type: "text" as const, text: `문서번호 '${params.doc_number}'를 찾을 수 없습니다.` }], isError: true };
        }
        const output = {
          docNumber: detail.docNumber,
          title: stripHtml(detail.title),
          fullContent: stripHtml(detail.fullContent),
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}
