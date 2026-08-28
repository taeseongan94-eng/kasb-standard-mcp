import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getToc } from "../kasb/client";
import { handleApiError } from "../utils/error-handler";

const StandardTocInputSchema = z.object({
  std_num: z.union([z.string(), z.number()]).describe(
    "기준서번호. K-IFRS는 1000번대(예: 1016=유형자산, 1115=수익인식, 1116=리스), 일반기업회계기준은 장 번호(예: 2=재무제표 표시, 10=유형자산)"
  ),
}).strict();

type StandardTocInput = z.infer<typeof StandardTocInputSchema>;

export function registerStandardTocTool(server: McpServer): void {
  server.registerTool(
    "get_standard_toc",
    {
      title: "회계기준서 목차 조회 (KASB 공식)",
      description: `특정 기준서의 목차(문단 구조)를 반환합니다. 각 항목은 documentId, title, ref(문단번호 범위), level을 포함합니다.
전체 본문이 너무 길 때, 어느 섹션에 원하는 내용이 있는지 먼저 훑어보는 용도입니다.
전체/특정 조항 원문이 필요하면 get_standard_content 를 쓰세요.`,
      inputSchema: StandardTocInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params: StandardTocInput) => {
      try {
        const toc = await getToc(params.std_num);
        const output = toc.map((item) => ({
          documentId: item.documentId,
          title: item.title,
          ref: item.ref ?? null,
          level: item.level,
        }));
        return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}
