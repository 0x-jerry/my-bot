import { tool } from "ai";
import { z } from "zod";
import type { LoadedToolset, ToolSet } from "./types";
import { glob, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { existsSync } from "node:fs";

export async function createSkillToolset(
  _config: ToolSet.Skill,
): Promise<LoadedToolset> {
  const skills = await loadSkills(process.cwd());

  const readSkill = tool({
    title: "Read Skill",
    description: "Read a skill",
    inputSchema: z.object({
      skill: z.string().describe("The skill to read"),
    }),
    execute: async ({ skill }) => {
      const loadedSkill = skills[skill];

      if (!loadedSkill) {
        return `Skill ${skill} not found`;
      }

      return loadedSkill.content;
    },
  });

  if (!Object.keys(skills).length) {
    return {
      toolset: {},
    };
  }

  return {
    instruction: createInstruction(skills),
    toolset: {
      "skill:read": readSkill,
    },
  };
}

function createInstruction(skills: Record<string, LoadedSkill>) {
  const skillDescription: string[] = Object.values(skills).map((skill) => {
    return `- ${skill.name}: ${skill.description}`;
  });

  return `You can use the "skill:read" tool to read a skill deatil. Avaible skills are:\n${skillDescription.join("\n")}`;
}

async function loadSkills(cwd: string) {
  const home = homedir();
  const scanFolders = [
    //
    `${home}/.codex/skills`,
    `${home}/.claude/skills`,
    `${home}/.agents/skills`,
    `${cwd}/.claude/skills`,
    `${cwd}/.agents/skills`,
  ];

  const loadedSkills: Record<string, LoadedSkill> = {};

  for (const folder of scanFolders) {
    const skills = await loadSkill(folder);

    for (const skill of skills) {
      loadedSkills[skill.name] = skill;
    }
  }

  return loadedSkills;
}

async function loadSkill(folder: string) {
  const loadedSkills: LoadedSkill[] = [];

  if (!existsSync(folder)) {
    return loadedSkills;
  }

  const skills = glob(`**/SKILL.md`, { cwd: folder });

  for await (const skill of skills) {
    const file = path.join(folder, skill);
    const content = await readFile(file, "utf8");

    const matterResult = matter(content);

    if (!matterResult.data.name) {
      continue;
    }

    loadedSkills.push({
      file,
      name: matterResult.data.name,
      description: matterResult.data.description,
      metadata: matterResult.data.metadata,
      content: matterResult.content,
    });
  }

  return loadedSkills;
}

interface LoadedSkill {
  file: string;

  name: string;
  description?: string;
  metadata?: Record<string, any>;

  content: string;
}
