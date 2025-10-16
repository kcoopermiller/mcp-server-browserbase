import { z } from "zod";
import { defineTool, type Tool, type ToolResult } from "./tool.js";
import type { Context } from "../context.js";
import type { ToolActionResult } from "../types/types.js";
import type {
  ImageContent,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { registerScreenshot } from "../mcp/resources.js";

async function takeAndRegisterScreenshot(
  context: Context,
  page: Awaited<ReturnType<Context["getActivePage"]>>,
  namePrefix: string,
): Promise<{ content: (ImageContent | TextContent)[] }> {
  const buffer = await page!.screenshot({ fullPage: false });
  const base64 = buffer.toString("base64");
  const name = `${namePrefix}-${new Date().toISOString().replace(/:/g, "-")}`;
  const sessionId = context.currentSessionId;

  registerScreenshot(sessionId, name, base64);

  const serverInstance = context.getServer();
  if (serverInstance) {
    serverInstance.notification({
      method: "notifications/resources/list_changed",
    });
  }

  return {
    content: [
      { type: "text", text: `Screenshot captured: ${name}` },
      { type: "image", data: base64, mimeType: "image/png" },
    ],
  };
}

// Screenshot
const CuScreenshotInputSchema = z.object({});
export const cuScreenshotTool: Tool<typeof CuScreenshotInputSchema> =
  defineTool({
    capability: "computer_use",
    schema: {
      name: "browserbase_stagehand_cu_screenshot",
      description:
        "Capture a screenshot of the current page and return it as an image.",
      inputSchema: CuScreenshotInputSchema,
    },
    handle: async (context: Context): Promise<ToolResult> => {
      const action = async (): Promise<ToolActionResult> => {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        return await takeAndRegisterScreenshot(context, page, "cu-screenshot");
      };
      return { action, waitForNetwork: false };
    },
  });

// Click
const CuClickInputSchema = z.object({
  x: z.number().int().describe("X coordinate (pixels)"),
  y: z.number().int().describe("Y coordinate (pixels)"),
  button: z.enum(["left", "right", "middle"]).optional().default("left"),
});
export const cuClickTool: Tool<typeof CuClickInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_click",
    description: "Click at page coordinates using the mouse.",
    inputSchema: CuClickInputSchema,
  },
  handle: async (context: Context, { x, y, button }): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      try {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        await page.mouse.click(x, y, { button });
        const result = await takeAndRegisterScreenshot(
          context,
          page,
          "cu-click",
        );
        // Prepend action text to result content
        return {
          content: [
            { type: "text", text: `Clicked at (${x}, ${y}) with ${button}` },
            ...(result.content ?? []),
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to click: ${msg}`);
      }
    };
    return { action, waitForNetwork: false };
  },
});

// Double click
const CuDoubleClickInputSchema = z.object({
  x: z.number().int().describe("X coordinate (pixels)"),
  y: z.number().int().describe("Y coordinate (pixels)"),
});
export const cuDoubleClickTool: Tool<typeof CuDoubleClickInputSchema> =
  defineTool({
    capability: "computer_use",
    schema: {
      name: "browserbase_stagehand_cu_double_click",
      description: "Double click at page coordinates.",
      inputSchema: CuDoubleClickInputSchema,
    },
    handle: async (context: Context, { x, y }): Promise<ToolResult> => {
      const action = async (): Promise<ToolActionResult> => {
        try {
          const page = await context.getActivePage();
          if (!page) throw new Error("No active page available");
          await page.mouse.dblclick(x, y);
          const result = await takeAndRegisterScreenshot(
            context,
            page,
            "cu-double-click",
          );
          return {
            content: [
              { type: "text", text: `Double clicked at (${x}, ${y})` },
              ...(result.content ?? []),
            ],
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to double click: ${msg}`);
        }
      };
      return { action, waitForNetwork: false };
    },
  });

// Scroll via mouse wheel at a location
const CuScrollInputSchema = z.object({
  x: z.number().int().describe("X coordinate to move before wheel"),
  y: z.number().int().describe("Y coordinate to move before wheel"),
  scroll_x: z.number().int().describe("Horizontal wheel delta"),
  scroll_y: z.number().int().describe("Vertical wheel delta"),
});
export const cuScrollTool: Tool<typeof CuScrollInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_scroll",
    description:
      "Scroll using the mouse wheel after moving to the given coordinates.",
    inputSchema: CuScrollInputSchema,
  },
  handle: async (
    context: Context,
    { x, y, scroll_x, scroll_y },
  ): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      try {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        await page.mouse.move(x, y);
        await page.mouse.wheel(scroll_x, scroll_y);
        const result = await takeAndRegisterScreenshot(
          context,
          page,
          "cu-scroll",
        );
        return {
          content: [
            {
              type: "text",
              text: `Scrolled at (${x}, ${y}) by (${scroll_x}, ${scroll_y})`,
            },
            ...(result.content ?? []),
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to scroll: ${msg}`);
      }
    };
    return { action, waitForNetwork: false };
  },
});

// Type text via keyboard
const CuTypeInputSchema = z.object({
  text: z.string().describe("Text to type at the current focus"),
  delayMs: z
    .number()
    .int()
    .optional()
    .describe("Optional delay between keystrokes in milliseconds"),
});
export const cuTypeTool: Tool<typeof CuTypeInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_type",
    description: "Type text using the keyboard at the current focus.",
    inputSchema: CuTypeInputSchema,
  },
  handle: async (context: Context, { text, delayMs }): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      try {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        await page.keyboard.type(text, { delay: delayMs });
        const result = await takeAndRegisterScreenshot(
          context,
          page,
          "cu-type",
        );
        return {
          content: [
            { type: "text", text: `Typed ${text.length} characters` },
            ...(result.content ?? []),
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to type: ${msg}`);
      }
    };
    return { action, waitForNetwork: false };
  },
});

// Wait
const CuWaitInputSchema = z.object({
  ms: z
    .number()
    .int()
    .default(1000)
    .describe("Milliseconds to wait (default 1000)"),
});
export const cuWaitTool: Tool<typeof CuWaitInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_wait",
    description: "Wait/sleep for a specified number of milliseconds.",
    inputSchema: CuWaitInputSchema,
  },
  handle: async (context: Context, { ms }): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      const page = await context.getActivePage();
      if (!page) throw new Error("No active page available");
      await page.waitForTimeout(ms);
      const result = await takeAndRegisterScreenshot(context, page, "cu-wait");
      return {
        content: [
          { type: "text", text: `Waited for ${ms} ms` },
          ...(result.content ?? []),
        ],
      };
    };
    return { action, waitForNetwork: false };
  },
});

// Move mouse
const CuMoveInputSchema = z.object({
  x: z.number().int().describe("X coordinate (pixels)"),
  y: z.number().int().describe("Y coordinate (pixels)"),
});
export const cuMoveTool: Tool<typeof CuMoveInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_move",
    description: "Move the mouse to page coordinates.",
    inputSchema: CuMoveInputSchema,
  },
  handle: async (context: Context, { x, y }): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      try {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        await page.mouse.move(x, y);
        const result = await takeAndRegisterScreenshot(
          context,
          page,
          "cu-move",
        );
        return {
          content: [
            { type: "text", text: `Moved mouse to (${x}, ${y})` },
            ...(result.content ?? []),
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to move: ${msg}`);
      }
    };
    return { action, waitForNetwork: false };
  },
});

// Keypress (supports combos like "Shift+Tab")
const CuKeypressInputSchema = z.object({
  keys: z
    .array(z.string())
    .min(1)
    .describe(
      "List of keys or chords to press, e.g. ['Enter'] or ['Shift+Tab', 'ArrowDown']",
    ),
});
export const cuKeypressTool: Tool<typeof CuKeypressInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_keypress",
    description: "Press one or more keys (supports modifier chords).",
    inputSchema: CuKeypressInputSchema,
  },
  handle: async (context: Context, { keys }): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      try {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        for (const key of keys) {
          await page.keyboard.press(key);
        }
        const result = await takeAndRegisterScreenshot(
          context,
          page,
          "cu-keypress",
        );
        return {
          content: [
            { type: "text", text: `Pressed keys: ${keys.join(", ")}` },
            ...(result.content ?? []),
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to press keys: ${msg}`);
      }
    };
    return { action, waitForNetwork: false };
  },
});

// Drag with a path of points
const CuDragInputSchema = z.object({
  path: z
    .array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
      }),
    )
    .min(2)
    .describe(
      "Sequence of points to drag through (must include start and end)",
    ),
});
export const cuDragTool: Tool<typeof CuDragInputSchema> = defineTool({
  capability: "computer_use",
  schema: {
    name: "browserbase_stagehand_cu_drag",
    description:
      "Drag the mouse along a path: press at first point, move through points, release at last point.",
    inputSchema: CuDragInputSchema,
  },
  handle: async (context: Context, { path }): Promise<ToolResult> => {
    const action = async (): Promise<ToolActionResult> => {
      try {
        const page = await context.getActivePage();
        if (!page) throw new Error("No active page available");
        const [start, ...rest] = path;
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        for (const pt of rest) {
          await page.mouse.move(pt.x, pt.y);
        }
        await page.mouse.up();
        const result = await takeAndRegisterScreenshot(
          context,
          page,
          "cu-drag",
        );
        return {
          content: [
            {
              type: "text",
              text: `Dragged from (${start.x}, ${start.y}) to (${rest[rest.length - 1].x}, ${rest[rest.length - 1].y}) via ${path.length} points`,
            },
            ...(result.content ?? []),
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to drag: ${msg}`);
      }
    };
    return { action, waitForNetwork: false };
  },
});

export default {};
