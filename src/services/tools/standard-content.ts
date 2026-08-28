import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStandardContent } from "../kasb/client";
import { handleApiError } from "../utils/error-handler";

const StandardContentInputSchema = z.object({
  std_num: z.union([z.string(), z.number()]).describe(
    "기준서번호. K-IFRS는 1000번대(예: 1016=유형자산, 1115=수익인식, 1116=리스), 일반기업회계기준은 장 번호(예: 2=재무제표 표시, 10=유형자산)"
  ),
  search_word: z.string().optional().describe("지정하면 이 단어가 포함된 조항만 반환 (하이라이트는 제거된 순수 텍스트)"),
}).strict();

type StandardContentInput = z.infer<typeof StandardContentInputSchema>;

export function registerStandardContentTool(server: McpServer): void {
  server.registerTool(
    "get_standard_content",
    {
      title: "회계기준서 원문 조회 (KASB 공식)",
      description: `기준서 번호를 지정하면 db.kasb.or.kr의 실제 조항 원문(섹션 제목 + 문단번호 + 본문)을 그대로 반환합니다.
회계기준 조항을 감사 판단근거나 조서에 인용할 때는 반드시 이 도구로 확인한 원문을 써야 합니다 —
학습된 지식만으로 조항번호·문구를 답하지 마세요.

[파라미터]
- std_num: 기준서번호 (필수)
- search_word: 지정하면 해당 단어가 포함된 조항만 반환 — 문단 수가 많은 기준서(1109 금융상품,
  1115 수익인식, 1116 리스, 1117 보험계약 등)는 전체를 다 받으면 응답이 매우 커지므로,
  특정 주제만 필요하면 search_word를 채워서 범위를 좁히세요.

[주의]
비공식 API이므로 사이트 개편 시 조회가 실패할 수 있습니다. 실패하면 추측하지 말고
"원문을 확인하지 못했다"고 명시하세요.`,
      inputSchema: StandardContentInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params: StandardContentInput) => {
      try {
        const sections = await getStandardContent(params.std_num, params.search_word ?? "", !!params.search_word);
        return { content: [{ type: "text" as const, text: JSON.stringify({ stdNum: params.std_num, sections }) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}
