/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

export interface MemoryItem {
  id: string;
  category: string; // 'user_preferences' | 'personal_profile' | 'projects' | 'people_orgs' | 'working_preferences' | 'instructions' | 'facts'
  content: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

const MEMORY_FILE_PATH = path.join(process.cwd(), "data", "memories.json");

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(MEMORY_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load all memories from the JSON file.
 */
export function loadMemories(): MemoryItem[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(MEMORY_FILE_PATH)) {
      // Seed with some initial helpful user context based on Tony's profile if empty
      const initialMemories: MemoryItem[] = [
        {
          id: "mem-1",
          category: "personal_profile",
          content: "Preferred name is Tony, a System Architect & Creative Technologist.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "System initialization"
        },
        {
          id: "mem-2",
          category: "working_preferences",
          content: "Prefers concise, objective, and intellectually precise communication with dry wit.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "System initialization"
        }
      ];
      fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(initialMemories, null, 2));
      return initialMemories;
    }
    const data = fs.readFileSync(MEMORY_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("[Memory Store] Error loading memories:", err);
    return [];
  }
}

/**
 * Save all memories to the JSON file.
 */
export function saveMemories(memories: MemoryItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memories, null, 2), "utf8");
  } catch (err) {
    console.error("[Memory Store] Error saving memories:", err);
  }
}

/**
 * Perform a keyword-based search to retrieve relevant memories.
 */
export function findRelevantMemories(query: string, memories: MemoryItem[]): MemoryItem[] {
  if (!query) return [];
  
  const searchTerms = query.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .split(/\s+/)
    .filter(term => term.length > 2); // Only match terms with length > 2

  if (searchTerms.length === 0) return [];

  // Categorize or relevance score
  const scored = memories.map(mem => {
    let score = 0;
    const contentLower = mem.content.toLowerCase();
    const catLower = mem.category.toLowerCase();

    for (const term of searchTerms) {
      if (contentLower.includes(term)) {
        score += 2;
        // Exact word match bonus
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(contentLower)) {
          score += 3;
        }
      }
      if (catLower.includes(term)) {
        score += 1;
      }
    }
    return { mem, score };
  });

  // Return top 5 matches with a positive relevance score
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.mem)
    .slice(0, 5);
}

/**
 * Refuse secret credentials like passwords or keys.
 */
export function containsSensitiveSecrets(content: string): boolean {
  const secretPatterns = [
    /api[-_]?key/i,
    /password/i,
    /secret[-_]?key/i,
    /token/i,
    /private[-_]?key/i,
    /passwd/i,
    /credential/i,
    /credit[-_]?card/i,
    /bearer/i
  ];
  return secretPatterns.some(pattern => pattern.test(content));
}
