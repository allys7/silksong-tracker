import fs from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(import.meta.dirname, "../src/data");

interface Result {
  file: string;
  id?: string;
  description?: string;
}

async function findMissingLocationsIn(
  value: any,
  file: string,
  results: Result[],
) {
  if (Array.isArray(value)) {
    for (const el of value) {
      await findMissingLocationsIn(el, file, results);
    }
    return;
  }
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "id")) {
      const hasLocations = Object.hasOwn(value, "locations");
      if (!hasLocations) {
        results.push({
          file,
          id: String(value.id),
          description: value.description ?? "",
        });
      }
    }
    for (const k of Object.keys(value)) {
      await findMissingLocationsIn(value[k], file, results);
    }
  }
}

async function main() {
  try {
    const entries = await fs.readdir(dataDir);
    const jsonFiles = entries.filter(
      (f) =>
        f.endsWith(".json")
        && !f.endsWith(".schema.json")
        && !f.includes("scenes")
        && !f.includes("journal"),
    );
    const results: Result[] = [];

    for (const file of jsonFiles) {
      const p = path.join(dataDir, file);
      let raw: string;
      try {
        raw = await fs.readFile(p, "utf8");
      } catch (error) {
        console.error("Failed to read", file, error);
        continue;
      }
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        console.error("Failed to parse JSON in", file, error);
        continue;
      }
      await findMissingLocationsIn(parsed, file, results);
    }

    if (results.length === 0) {
      console.log('No items missing "locations" found.');
      return;
    }

    for (const r of results) {
      console.log(`${r.file}\t${r.id ?? "<no-id>"}\t${r.description}`);
    }
    console.log(`\nTotal: ${results.length}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void main();
