import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchCount, getStandardContent } from "../kasb/client";
import { handleApiError } from "../utils/error-handler";

const SearchStandardInputSchema = z.object({
  query: z.string().min(1).describe("검색어 (한글 회계 용어, 예: '리스부채', '수익인식')"),
}).strict();

type SearchStandardInput = z.infer<typeof SearchStandardInputSchema>;

export function registerSearchStandardTool(server: McpServer): void {
  server.registerTool(
    "search_standard",
    {
      title: "회계기준서 검색 (KASB 공식)",
      description: `검색어가 어느 기준서(K-IFRS/일반기업회계기준)에 몇 건 있는지 먼저 확인한 뒤,
가장 관련성 높은 기준서에서 검색어가 포함된 조항 원문을 그대로 반환합니다.
db.kasb.or.kr(한국회계기준원 회계기준열람서비스)의 실제 조항 원문입니다 — 추측이나 학습된 지식이 아닙니다.

[사용 시점]
어느 기준서에서 봐야 할지 모를 때 출발점으로 사용하세요. 특정 기준서 번호를 이미 알고 있으면
get_standard_content 를 직접 쓰는 게 더 정확합니다(이 도구는 "가장 매칭이 많은 기준서 1개"만 봅니다).

[반환]
- matchCounts: 기준서별 매칭 문단 수 (상위 10개)
- topStandard: 가장 매칭이 많은 기준서 번호
- sections: topStandard에서 검색어가 포함된 조항 원문 (섹션 제목 + 문단번호 + 본문)`,
      inputSchema: SearchStandardInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params: SearchStandardInput) => {
      try {
        const counts = await searchCount(params.query);
        const stdCounts = Object.entries(counts.standardCountData || {}).sort((a, b) => b[1] - a[1]);

        if (stdCounts.length === 0) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ query: params.query, matchCounts: [], topStandard: null, sections: [] }) }],
          };
        }

        const topStandard = stdCounts[0][0];
        const sections = await getStandardContent(topStandard, params.query, true);

        const output = {
          query: params.query,
          matchCounts: stdCounts.slice(0, 10).map(([stdNum, count]) => ({ stdNum, count })),
          topStandard,
          sections,
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}
