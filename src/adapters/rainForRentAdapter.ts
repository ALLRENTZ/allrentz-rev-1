export interface RainForRentEquipmentRecord {
  supplier_name: "Rain for Rent";
  equipment_name: string;
  capacity: string;
  equipment_type: string;
  product_detail_url: string;
  image_url: string;
}

type RawExport =
  | string
  | {
      content?: unknown;
      html?: unknown;
      results?: Array<{ content?: unknown }>;
    };

const SUPPLIER_NAME = "Rain for Rent" as const;
const CARD_START_PATTERN = /<div\b[^>]*class=["'][^"']*\be-loop-item\b[^"']*["'][^>]*>/gi;

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }

    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }

    return namedEntities[body.toLowerCase()] ?? entity;
  });
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractHtml(raw: RawExport): string {
  if (typeof raw === "string") {
    const trimmed = raw.trim();

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return extractHtml(JSON.parse(trimmed) as RawExport);
      } catch {
        // The export may be raw HTML that happens to begin with JSON-like text.
      }
    }

    if (trimmed.includes("e-loop-item")) {
      return raw;
    }
  }

  if (raw && typeof raw === "object") {
    if (typeof raw.content === "string") {
      return raw.content;
    }

    if (typeof raw.html === "string") {
      return raw.html;
    }

    if (Array.isArray(raw.results)) {
      const html = raw.results.find((result) => typeof result?.content === "string")?.content;
      if (typeof html === "string") {
        return html;
      }
    }
  }

  throw new TypeError("Rain for Rent export does not contain HTML content.");
}

function splitProductCards(html: string): string[] {
  const starts = Array.from(html.matchAll(CARD_START_PATTERN), (match) => match.index ?? -1).filter(
    (index) => index >= 0,
  );

  return starts.map((start, index) => html.slice(start, starts[index + 1] ?? html.length));
}

function extractHeading(card: string): { name: string; url: string } | null {
  const heading = card.match(
    /<h3\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i,
  );

  if (!heading) {
    return null;
  }

  return {
    url: decodeHtml(heading[1]).trim(),
    name: cleanText(heading[2]),
  };
}

function extractImageUrl(card: string): string {
  const lazyImage = card.match(/<img\b[^>]*\bdata-src=["']([^"']+)["']/i)?.[1];
  if (lazyImage) {
    return decodeHtml(lazyImage).trim();
  }

  const src = card.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
  return src.startsWith("data:") ? "" : decodeHtml(src).trim();
}

function extractLabeledValue(card: string, label: string): string {
  const values = Array.from(card.matchAll(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi), (match) => cleanText(match[1]));
  const labelIndex = values.findIndex((value) => value.toLowerCase() === label.toLowerCase());
  return labelIndex >= 0 ? values[labelIndex + 1] ?? "" : "";
}

function normalizeCapacity(value: string): string {
  const numericValue = value.match(/\d[\d,]*(?:\.\d+)?/)?.[0] ?? "";
  return numericValue.replace(/,/g, "");
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function adaptRainForRentTankBoxExport(raw: RawExport): RainForRentEquipmentRecord[] {
  const html = extractHtml(raw);
  const uniqueRecords = new Map<string, RainForRentEquipmentRecord>();

  for (const card of splitProductCards(html)) {
    const heading = extractHeading(card);
    if (!heading || !heading.name || !isAbsoluteHttpUrl(heading.url)) {
      continue;
    }

    const imageUrl = extractImageUrl(card);
    const record: RainForRentEquipmentRecord = {
      supplier_name: SUPPLIER_NAME,
      equipment_name: heading.name,
      capacity: normalizeCapacity(extractLabeledValue(card, "Capacity")),
      equipment_type: extractLabeledValue(card, "Type"),
      product_detail_url: heading.url,
      image_url: imageUrl,
    };

    uniqueRecords.set(record.product_detail_url, record);
  }

  return Array.from(uniqueRecords.values());
}
