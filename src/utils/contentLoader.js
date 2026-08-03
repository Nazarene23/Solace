const fs = require('node:fs');
const path = require('node:path');

function loadContentPacks(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(
      `Content folder does not exist: ${folderPath}`,
    );
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((file) => file.endsWith('.json'));

  const allItems = [];
  const usedIds = new Set();

  for (const file of files) {
    const filePath = path.join(folderPath, file);

    let items;

    try {
      items = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
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

    for (const item of items) {
      if (
        !item ||
        typeof item.id !== 'string'
      ) {
        console.warn(
          `Skipping invalid entry in ${file}.`,
        );

        continue;
      }

      if (usedIds.has(item.id)) {
        throw new Error(
          `Duplicate content ID found: ${item.id}`,
        );
      }

      usedIds.add(item.id);

      allItems.push({
        ...item,
        sourcePack: file.replace('.json', ''),
      });
    }
  }

  if (allItems.length === 0) {
    throw new Error(
      `No valid content entries found in: ${folderPath}`,
    );
  }

  return allItems;
}

module.exports = {
  loadContentPacks,
};