const fs = require("node:fs");
const path = require("node:path");

function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function cleanText(text) {
  return text
    .trim()
    .replace(/\s+/g, " ");
}

function loadContentPacks(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(
      `Content folder does not exist: ${folderPath}`,
    );
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith(".json"))
    .sort((first, second) =>
      first.localeCompare(second),
    );

  if (files.length === 0) {
    throw new Error(
      `No JSON content packs found in: ${folderPath}`,
    );
  }

  const allItems = [];
  const usedIds = new Map();
  const usedContent = new Map();

  for (const file of files) {
    const filePath = path.join(
      folderPath,
      file,
    );

    let items;

    try {
      items = JSON.parse(
        fs.readFileSync(
          filePath,
          "utf8",
        ),
      );
    } catch (error) {
      throw new Error(
        `Invalid JSON in ${file}: ${error.message}`,
      );
    }

    if (!Array.isArray(items)) {
      throw new Error(
        `${file} must contain a JSON array.`,
      );
    }

    for (
      let index = 0;
      index < items.length;
      index += 1
    ) {
      const item = items[index];
      const location =
        `${file}, item ${index + 1}`;

      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        throw new Error(
          `Invalid content entry in ${location}.`,
        );
      }

      if (
        typeof item.id !== "string" ||
        !item.id.trim()
      ) {
        throw new Error(
          `Missing or invalid ID in ${location}.`,
        );
      }

      if (
        typeof item.category !== "string" ||
        !item.category.trim()
      ) {
        throw new Error(
          `Missing or invalid category in ${location}.`,
        );
      }

      const id = item.id.trim();
      const category =
        item.category.trim();

      if (usedIds.has(id)) {
        throw new Error(
          `Duplicate content ID "${id}" in ${location}. ` +
          `It was first used in ${usedIds.get(id)}.`,
        );
      }

      let cleanedItem;
      let contentKey;

      if (
        Object.prototype.hasOwnProperty.call(
          item,
          "text",
        )
      ) {
        if (
          typeof item.text !== "string" ||
          !item.text.trim()
        ) {
          throw new Error(
            `Missing or invalid text in ${location}.`,
          );
        }

        const text = cleanText(
          item.text,
        );

        contentKey =
          `text:${normalizeText(text)}`;

        cleanedItem = {
          ...item,
          id,
          category,
          text,
        };
      } else {
        if (
          typeof item.title !== "string" ||
          !item.title.trim()
        ) {
          throw new Error(
            `Missing or invalid title in ${location}.`,
          );
        }

        if (
          !Array.isArray(item.steps) ||
          item.steps.length === 0 ||
          item.steps.some(
            (step) =>
              typeof step !== "string" ||
              !step.trim(),
          )
        ) {
          throw new Error(
            `Missing or invalid breathing steps in ${location}.`,
          );
        }

        if (
          typeof item.closing !== "string" ||
          !item.closing.trim()
        ) {
          throw new Error(
            `Missing or invalid closing text in ${location}.`,
          );
        }

        const title = cleanText(
          item.title,
        );

        const steps = item.steps.map(
          (step) => cleanText(step),
        );

        const closing = cleanText(
          item.closing,
        );

        contentKey =
          `breathing:${normalizeText(title)}`;

        cleanedItem = {
          ...item,
          id,
          category,
          title,
          steps,
          closing,
        };
      }

      if (usedContent.has(contentKey)) {
        throw new Error(
          `Duplicate content in ${location}. ` +
          `It was first used in ${usedContent.get(contentKey)}.`,
        );
      }

      usedIds.set(
        id,
        location,
      );

      usedContent.set(
        contentKey,
        location,
      );

      allItems.push({
        ...cleanedItem,
        sourcePack:
          path.basename(
            file,
            ".json",
          ),
      });
    }
  }

  if (allItems.length === 0) {
    throw new Error(
      `No content entries found in: ${folderPath}`,
    );
  }

  return allItems;
}

module.exports = {
  loadContentPacks,
};