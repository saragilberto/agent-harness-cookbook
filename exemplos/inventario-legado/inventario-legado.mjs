#!/usr/bin/env node
/**
 * Read-only inventory of a legacy schema. Before anything gets changed in a
 * twenty-year-old database, the first move is to find out what's actually
 * there — no comments, no declared foreign keys, nothing left behind but
 * the naming convention someone followed for two decades and never wrote
 * down.
 *
 * This parses `CREATE TABLE` blocks with regex, the same style as
 * `scan.mjs`, and flags two heuristics an agent about to touch this schema
 * should see before it writes anything:
 *
 *   - a column named like a foreign key (`*_ID`) with no FOREIGN KEY
 *     constraint declared for it — the relationship is real, it's just not
 *     enforced anywhere the database can check
 *   - a CHAR(1) column — the classic undocumented boolean flag in a
 *     database old enough to predate a real boolean type
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim() !== "") parts.push(current);
  return parts;
}

function parseTable(name, body) {
  const columns = [];
  const primaryKey = [];
  const foreignKeyColumns = new Set();

  for (const rawChunk of splitTopLevel(body, ",")) {
    const chunk = rawChunk.trim();
    if (chunk === "") continue;

    if (/^PRIMARY\s+KEY/i.test(chunk)) {
      const match = chunk.match(/\(([^)]+)\)/);
      if (match) {
        for (const col of match[1].split(",")) primaryKey.push(col.trim().toUpperCase());
      }
      continue;
    }

    if (/^FOREIGN\s+KEY/i.test(chunk)) {
      const match = chunk.match(/\(([^)]+)\)/);
      if (match) {
        for (const col of match[1].split(",")) foreignKeyColumns.add(col.trim().toUpperCase());
      }
      continue;
    }

    const columnMatch = chunk.match(/^(\w+)\s+([\w()0-9,\s]+?)(?:\s+(?:NOT\s+NULL|DEFAULT\s+.+))*$/i);
    if (columnMatch) {
      columns.push({ name: columnMatch[1].toUpperCase(), type: columnMatch[2].trim().toUpperCase() });
    }
  }

  return { name: name.toUpperCase(), columns, primaryKey, foreignKeyColumns };
}

/**
 * @param {string} ddlText
 * @returns {{tables: Array, suspiciousPatterns: Array<{table: string, column: string, kind: string, message: string}>}}
 */
export function inventory(ddlText) {
  const tables = [];
  const suspiciousPatterns = [];
  const tablePattern = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\)\s*;/gi;

  let match;
  while ((match = tablePattern.exec(ddlText)) !== null) {
    const table = parseTable(match[1], match[2]);
    tables.push({ name: table.name, columns: table.columns, primaryKey: table.primaryKey });

    for (const column of table.columns) {
      const looksLikeForeignKey = /_ID$/i.test(column.name) && !table.primaryKey.includes(column.name);
      if (looksLikeForeignKey && !table.foreignKeyColumns.has(column.name)) {
        suspiciousPatterns.push({
          table: table.name,
          column: column.name,
          kind: "implicit-foreign-key",
          message: `${table.name}.${column.name} looks like a foreign key but has no FOREIGN KEY constraint.`,
        });
      }

      if (/^CHAR\(1\)/i.test(column.type)) {
        suspiciousPatterns.push({
          table: table.name,
          column: column.name,
          kind: "undocumented-flag",
          message: `${table.name}.${column.name} is a CHAR(1) with no comment — likely an undocumented boolean flag.`,
        });
      }
    }
  }

  return { tables, suspiciousPatterns };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node inventario-legado.mjs <schema.sql>");
    process.exit(1);
  }
  console.log(JSON.stringify(inventory(readFileSync(target, "utf8")), null, 2));
}
