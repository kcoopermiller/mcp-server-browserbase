import navigateTool from "./navigate.js";
import actTool from "./act.js";
import extractTool from "./extract.js";
import observeTool from "./observe.js";
import screenshotTool from "./screenshot.js";
import sessionTools from "./session.js";
import getUrlTool from "./url.js";
import {
  cuScreenshotTool,
  cuClickTool,
  cuDoubleClickTool,
  cuScrollTool,
  cuTypeTool,
  cuWaitTool,
  cuMoveTool,
  cuKeypressTool,
  cuDragTool,
} from "./computerUse.js";

// Export individual tools
export { default as navigateTool } from "./navigate.js";
export { default as actTool } from "./act.js";
export { default as extractTool } from "./extract.js";
export { default as observeTool } from "./observe.js";
export { default as screenshotTool } from "./screenshot.js";
export { default as sessionTools } from "./session.js";
export { default as getUrlTool } from "./url.js";
export {
  cuScreenshotTool,
  cuClickTool,
  cuDoubleClickTool,
  cuScrollTool,
  cuTypeTool,
  cuWaitTool,
  cuMoveTool,
  cuKeypressTool,
  cuDragTool,
} from "./computerUse.js";

// Export all tools as array
export const TOOLS = [
  ...sessionTools,
  navigateTool,
  actTool,
  extractTool,
  observeTool,
  screenshotTool,
  getUrlTool,
  // Computer-use tools
  cuScreenshotTool,
  cuClickTool,
  cuDoubleClickTool,
  cuScrollTool,
  cuTypeTool,
  cuWaitTool,
  cuMoveTool,
  cuKeypressTool,
  cuDragTool,
];

export const sessionManagementTools = sessionTools;
