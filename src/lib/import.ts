import Papa from "papaparse";
import { getDB } from "./db";

const SECTION_MARKER = "# SECTION:";

type ImportMode = "replace" | "merge";

interface ParsedSections {
  categories: Record<string, unknown>[];
  paymentMethods: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
}

interface ImportResult {
  categories: number;
  paymentMethods: number;
  budgets: number;
  expenses: number;
}

function parseCSVSections(csv: string): ParsedSections {
  const lines = csv.split("\n");
  const sections: ParsedSections = {
    categories: [],
    paymentMethods: [],
    budgets: [],
    expenses: [],
  };

  let currentSection: keyof ParsedSections | null = null;
  let currentHeaders: string[] = [];

  for (const line of lines) {
    if (line.startsWith(SECTION_MARKER)) {
      const name = line.slice(SECTION_MARKER.length).trim();
      if (name === "CATEGORIES") currentSection = "categories";
      else if (name === "PAYMENT_METHODS") currentSection = "paymentMethods";
      else if (name === "BUDGETS") currentSection = "budgets";
      else if (name === "EXPENSES") currentSection = "expenses";
      else currentSection = null;
      currentHeaders = [];
      continue;
    }

    if (currentSection && currentHeaders.length === 0) {
      const result = Papa.parse(line, { header: false });
      currentHeaders = result.data[0] as string[];
      continue;
    }

    if (currentSection && currentHeaders.length > 0 && line.trim()) {
      const result = Papa.parse(line, { header: false });
      const values = result.data[0] as string[];
      const row: Record<string, unknown> = {};
      currentHeaders.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      sections[currentSection].push(row);
    }
  }

  return sections;
}

export function parseCSVPreview(csv: string): ImportResult {
  const sections = parseCSVSections(csv);
  return {
    categories: sections.categories.length,
    paymentMethods: sections.paymentMethods.length,
    budgets: sections.budgets.length,
    expenses: sections.expenses.length,
  };
}

async function replaceAll(
  sections: ParsedSections
): Promise<ImportResult> {
  const db = getDB();

  await db.exec({ sql: "DELETE FROM expenses" });
  await db.exec({ sql: "DELETE FROM budgets" });
  await db.exec({ sql: "DELETE FROM categories" });
  await db.exec({ sql: "DELETE FROM payment_methods" });

  for (const row of sections.categories) {
    await db.exec({
      sql: "INSERT INTO categories(id, name, color, icon, created_at) VALUES(?,?,?,?,?)",
      bind: [
        row.id || crypto.randomUUID(),
        row.name || "",
        row.color || "#6366f1",
        row.icon || "",
        row.created_at || new Date().toISOString(),
      ],
    });
  }

  for (const row of sections.paymentMethods) {
    await db.exec({
      sql: "INSERT INTO payment_methods(id, name, icon, created_at) VALUES(?,?,?,?)",
      bind: [
        row.id || crypto.randomUUID(),
        row.name || "",
        row.icon || "",
        row.created_at || new Date().toISOString(),
      ],
    });
  }

  for (const row of sections.budgets) {
    await db.exec({
      sql: "INSERT INTO budgets(id, month, amount, created_at) VALUES(?,?,?,?)",
      bind: [
        row.id || crypto.randomUUID(),
        row.month || "",
        parseFloat(String(row.amount || "0")),
        row.created_at || new Date().toISOString(),
      ],
    });
  }

  for (const row of sections.expenses) {
    await db.exec({
      sql: "INSERT INTO expenses(id, amount, concept, description, recurring_months, category_id, payment_method_id, date, created_at) VALUES(?,?,?,?,?,?,?,?,?)",
      bind: [
        row.id || crypto.randomUUID(),
        parseFloat(String(row.amount || "0")),
        row.concept || "",
        row.description || "",
        parseInt(String(row.recurring_months || "0")) || 0,
        row.category_id || null,
        row.payment_method_id || null,
        row.date || "",
        row.created_at || new Date().toISOString(),
      ],
    });
  }

  return {
    categories: sections.categories.length,
    paymentMethods: sections.paymentMethods.length,
    budgets: sections.budgets.length,
    expenses: sections.expenses.length,
  };
}

async function mergeData(
  sections: ParsedSections
): Promise<ImportResult> {
  const db = getDB();

  let catCount = 0;
  for (const row of sections.categories) {
    const exists = await db.selectValue(
      "SELECT COUNT(*) FROM categories WHERE name=?",
      [row.name || ""]
    );
    if (exists && Number(exists) > 0) continue;

    await db.exec({
      sql: "INSERT INTO categories(id, name, color, icon, created_at) VALUES(?,?,?,?,?)",
      bind: [
        row.id || crypto.randomUUID(),
        row.name || "",
        row.color || "#6366f1",
        row.icon || "",
        row.created_at || new Date().toISOString(),
      ],
    });
    catCount++;
  }

  let pmCount = 0;
  for (const row of sections.paymentMethods) {
    const exists = await db.selectValue(
      "SELECT COUNT(*) FROM payment_methods WHERE name=?",
      [row.name || ""]
    );
    if (exists && Number(exists) > 0) continue;

    await db.exec({
      sql: "INSERT INTO payment_methods(id, name, icon, created_at) VALUES(?,?,?,?)",
      bind: [
        row.id || crypto.randomUUID(),
        row.name || "",
        row.icon || "",
        row.created_at || new Date().toISOString(),
      ],
    });
    pmCount++;
  }

  let budgetCount = 0;
  for (const row of sections.budgets) {
    const month = row.month || "";
    if (!month) continue;

    const exists = await db.selectValue(
      "SELECT COUNT(*) FROM budgets WHERE month=?",
      [month]
    );
    if (exists && Number(exists) > 0) {
      await db.exec({
        sql: "UPDATE budgets SET amount=? WHERE month=?",
        bind: [parseFloat(String(row.amount || "0")), month],
      });
    } else {
      await db.exec({
        sql: "INSERT INTO budgets(id, month, amount, created_at) VALUES(?,?,?,?)",
        bind: [
          row.id || crypto.randomUUID(),
          month,
          parseFloat(String(row.amount || "0")),
          row.created_at || new Date().toISOString(),
        ],
      });
    }
    budgetCount++;
  }

  let expCount = 0;
  for (const row of sections.expenses) {
    const id = (row.id as string) || "";
    if (id) {
      const exists = await db.selectValue(
        "SELECT COUNT(*) FROM expenses WHERE id=?",
        [id]
      );
      if (exists && Number(exists) > 0) continue;
    }

    await db.exec({
      sql: "INSERT INTO expenses(id, amount, concept, description, recurring_months, category_id, payment_method_id, date, created_at) VALUES(?,?,?,?,?,?,?,?,?)",
      bind: [
        id || crypto.randomUUID(),
        parseFloat(String(row.amount || "0")),
        row.concept || "",
        row.description || "",
        parseInt(String(row.recurring_months || "0")) || 0,
        row.category_id || null,
        row.payment_method_id || null,
        row.date || "",
        row.created_at || new Date().toISOString(),
      ],
    });
    expCount++;
  }

  return {
    categories: catCount,
    paymentMethods: pmCount,
    budgets: budgetCount,
    expenses: expCount,
  };
}

export async function importFromCSV(
  csv: string,
  mode: ImportMode
): Promise<ImportResult> {
  const sections = parseCSVSections(csv);

  if (mode === "replace") {
    return replaceAll(sections);
  }

  return mergeData(sections);
}
