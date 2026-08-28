import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CATALOG } from "../kasb/catalog";
import { handleApiError } from "../utils/error-handler";

const StandardCatalogInputSchema = z.object({
  category: z.enum(["K-IFRS", "K-IFRS 해석서", "일반기업회계기준", "기타기준서"]).optional()
    .describe("분류로 필터링 (미지정 시 전체 98개 반환)"),
}).strict();

type StandardCatalogInput = z.infer<typeof StandardCatalogInputSchema>;

export function registerStandardCatalogTool(server: McpServer): void {
  server.registerTool(
    "list_standard_catalog",
    {
      title: "회계기준 전체 카탈로그 (KASB 공식)",
      description: `db.kasb.or.kr에 등재된 회계기준 전체 목록(K-IFRS 본기준서 41 + 해석서 19,
일반기업회계기준 33장, 기타기준서 4 — 총 98개)을 반환합니다.
기준서 제목만 알고 정확한 번호(std_num)를 모를 때 이 목록에서 찾은 뒤
get_standard_toc / get_standard_content 에 넘기세요.`,
      inputSchema: StandardCatalogInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: StandardCatalogInput) => {
      try {
        const list = params.category ? CATALOG.filter((c) => c.category === params.category) : CATALOG;
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}
