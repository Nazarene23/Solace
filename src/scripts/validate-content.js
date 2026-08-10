const path = require("node:path");

const {
  loadContentPacks,
} = require(
  "../utils/contentLoader",
);

const libraries = [
  {
    name: "Affirmations",
    folder: "affirmations",
    target: 365,
  },
  {
    name: "Wellness Tips",
    folder: "tips",
    target: 365,
  },
  {
    name: "Reflections",
    folder: "reflections",
    target: 365,
  },
  {
    name: "Guided Breathing",
    folder: "breathing",
    target: null,
  },
];

let totalItems = 0;

try {
  console.log(
    "Solace content validation\n",
  );

  for (const library of libraries) {
    const folderPath = path.join(
      __dirname,
      "../data",
      library.folder,
    );

    const items =
      loadContentPacks(
        folderPath,
      );

    const categories = new Map();

    for (const item of items) {
      const count =
        categories.get(
          item.category,
        ) ?? 0;

      categories.set(
        item.category,
        count + 1,
      );
    }

    totalItems += items.length;

    const countLabel =
      Number.isFinite(
        library.target,
      )
        ? `${items.length}/${library.target}`
        : String(items.length);

    console.log(
      `${library.name}: ${countLabel}`,
    );

    for (
      const [category, count]
      of [...categories.entries()].sort()
    ) {
      console.log(
        `  - ${category}: ${count}`,
      );
    }

    console.log("");
  }

  console.log(
    `Total validated entries: ${totalItems}`,
  );

  console.log(
    "No duplicate IDs, duplicate content, or invalid entries found.",
  );
} catch (error) {
  console.error(
    `Content validation failed: ${error.message}`,
  );

  process.exitCode = 1;
}