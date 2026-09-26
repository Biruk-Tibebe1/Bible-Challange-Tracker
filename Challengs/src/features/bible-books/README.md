# Bible Books

`bible-data.ts` is the framework-independent structural source of truth for the standard Protestant Bible. It defines all 66 books in canonical order and generates chapter references with a continuous global chapter number.

Use its lookup and range utilities for book/chapter access. `validateBibleDataset()` checks the catalog counts, ordering, unique IDs and chapter numbers, continuity, and required global-number examples. This feature does not depend on challenge dates, schedules, users, persistence, or Bible text.