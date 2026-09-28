# King James Version text

`kjv.json` is parsed from Project Gutenberg eBook 10, *The King James Version of the Bible*, using the reproducible importer at `scripts/import-kjv.mjs`.

- Source text: https://www.gutenberg.org/files/10/10-0.txt
- Edition record and copyright statement: https://www.gutenberg.org/ebooks/10
- Project Gutenberg identifies this eBook as public domain in the USA. The dataset is limited to the same 66 books and chapter counts used by this application; the importer rejects any mismatch and checks all 31,102 verse markers.
- To regenerate, download the source text and run `node scripts/import-kjv.mjs <source-text-path> src/features/bible-books/data/kjv.json`.
- Public-domain status can vary by jurisdiction. Confirm local requirements before distributing the text outside the United States.

No NIV or Amharic Bible text is included.