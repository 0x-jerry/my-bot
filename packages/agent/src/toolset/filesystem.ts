import { tool } from "ai";
import type { LoadedToolset, ToolSet } from "./types";
import z from "zod";
import {
  readFile,
  writeFile,
  readdir,
  rename,
  mkdir,
  unlink,
} from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { applyPatches } from "diff";

const MAX_READ_LENGTH = 5000;

export async function createFilesystemToolset(
  _config: ToolSet.FileSystem,
): Promise<LoadedToolset> {
  const readFileTool = tool({
    description: "Read a file",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to read"),
      start: z
        .number()
        .optional()
        .describe("The starting character index to read from"),
      limit: z.number().optional().describe("The number of characters to read"),
    }),
    execute: async ({ path, start, limit }) => {
      if (!isAbsolute(path)) {
        return "Error: Please provide an absolute path.";
      }
      try {
        const content = await readFile(path, "utf-8");
        const startChar = start ? Math.max(0, start) : 0;
        const charLimit = Math.min(limit || MAX_READ_LENGTH, MAX_READ_LENGTH);

        const slicedContent = content.slice(startChar, startChar + charLimit);

        if (slicedContent.length < content.length) {
          return `(Showing characters ${startChar} to ${startChar + slicedContent.length} of ${content.length})\n\n${slicedContent}`;
        }

        return slicedContent;
      } catch (error: any) {
        return `Error reading file: ${error.message}`;
      }
    },
  });

  const writeFileTool = tool({
    description: "Write a file",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
    execute: async ({ path, content }) => {
      if (!isAbsolute(path)) {
        return "Error: Please provide an absolute path.";
      }
      try {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, "utf-8");
        return `File written successfully to ${path}`;
      } catch (error: any) {
        return `Error writing file: ${error.message}`;
      }
    },
  });

  const patchTool = tool({
    description: "Patch one or more files using unified diff format.",
    inputSchema: z.object({
      workdir: z.string().describe("The working directory for the patch."),
      patch: z.string().describe("The unified diff patch to apply."),
    }),
    execute: async ({ workdir, patch }) => {
      if (!isAbsolute(workdir)) {
        return `Error: workdir must be an absolute path: ${workdir}`;
      }

      return new Promise<string>((resolve) => {
        const results: string[] = [];
        applyPatches(patch, {
          loadFile: async (patchObj, callback) => {
            const path = join(workdir, patchObj.oldFileName);

            try {
              const content = await readFile(path, "utf-8");
              callback(null, content);
            } catch (err: any) {
              callback(err, "");
            }
          },
          patched: async (patchObj, content, callback) => {
            const oldPath = join(workdir, patchObj.oldFileName);
            const newPath = join(workdir, patchObj.newFileName);

            if (content === false) {
              results.push(`Failed to patch ${newPath}`);
              return callback(null);
            }

            // If renaming, remove old file
            if (newPath !== oldPath) {
              try {
                await unlink(oldPath);
              } catch (err) {
                // ignore if old file doesn't exist
              }
            }

            try {
              await mkdir(dirname(newPath), { recursive: true });
              await writeFile(newPath, content, "utf-8");
              results.push(`Patched ${newPath}`);
              callback(null);
            } catch (err: any) {
              callback(err);
            }
          },
          complete: (err) => {
            if (err) {
              resolve(`Error patching files: ${String(err)}`);
            } else {
              resolve(results.join("\n") || "No patches applied");
            }
          },
        });
      });
    },
  });

  const readDirectoryTool = tool({
    description: "Read a directory",
    inputSchema: z.object({
      path: z.string().describe("The path to the directory to read"),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe("The maximum number of files to return"),
    }),
    execute: async ({ path, limit }) => {
      if (!isAbsolute(path)) {
        return "Error: Please provide an absolute path.";
      }
      try {
        const files = await readdir(path, { withFileTypes: true });
        const fileLimit = limit || 100;

        const fileDetails = files.map(
          (file) => `${file.isDirectory() ? "Directory" : "File"} ${file.name}`,
        );

        if (files.length > fileLimit) {
          const truncatedFiles = fileDetails.slice(0, fileLimit);
          return `(Showing ${fileLimit} of ${files.length} files)\n\n${truncatedFiles.join("\n")}`;
        }

        return fileDetails.join("\n");
      } catch (error: any) {
        return `Error reading directory: ${error.message}`;
      }
    },
  });

  const moveTool = tool({
    description: "Move a file or directory",
    inputSchema: z.object({
      from: z.string().describe("The path to the file or directory to move"),
      to: z.string().describe("The new path for the file or directory"),
    }),
    execute: async ({ from, to }) => {
      if (!isAbsolute(from) || !isAbsolute(to)) {
        return "Error: Please provide absolute paths for both source and destination.";
      }
      try {
        await rename(from, to);
        return `Moved successfully from ${from} to ${to}`;
      } catch (error: any) {
        return `Error moving: ${error.message}`;
      }
    },
  });

  return {
    instruction:
      "All the following tools should use absolute path:\n" +
      `"fs:read", "fs:write", "fs:readDirectory": "fs:move"\n\n` +
      `"fs:patch" should provide a workdir and the patch content should use relative path`,
    toolset: {
      "fs:read": readFileTool,
      "fs:write": writeFileTool,
      "fs:patch": patchTool,
      "fs:readDirectory": readDirectoryTool,
      "fs:move": moveTool,
    },
  };
}
