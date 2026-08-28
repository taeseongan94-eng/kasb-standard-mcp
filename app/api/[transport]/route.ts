import { createMcpHandler } from "mcp-handler";
import { registerSearchStandardTool } from "@/services/tools/search-standard";
import { registerStandardTocTool } from "@/services/tools/standard-toc";
import { registerStandardContentTool } from "@/services/tools/standard-content";
import { registerSearchQnaTool } from "@/services/tools/search-qna";
import { registerQnaDetailTool } from "@/services/tools/qna-detail";
import { registerStandardCatalogTool } from "@/services/tools/standard-catalog";

const handler = createMcpHandler(
  (server) => {
    registerSearchStandardTool(server);
    registerStandardTocTool(server);
    registerStandardContentTool(server);
    registerSearchQnaTool(server);
    registerQnaDetailTool(server);
    registerStandardCatalogTool(server);
  },
  {},
  {
    basePath: "/api",
    maxDuration: 90,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
