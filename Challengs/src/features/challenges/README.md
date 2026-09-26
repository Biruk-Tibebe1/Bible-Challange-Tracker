# Challenge Generation

This framework-independent feature generates schedule-only challenge data from the Bible catalog in `../bible-books`. It has no dependency on users, authentication, groups, persistence, progress state, or UI.

`generateChallenge()` obtains the inclusive ordered chapter range from the Bible dataset and divides the chapter count by the requested days. By default, remainder chapters go to earlier days; callers can select later days when the schedule requires it. Daily counts differ by at most one while Bible order is preserved. If there are more days than chapters, the first days receive one chapter each and the remaining days are empty.

`predefined-challenge.ts` uses the same generator for Genesis 1 through Revelation 22 across 365 days, placing its 94 four-chapter readings on later days so Day 1 is Genesis 1–3 and Day 365 is Revelation 19–22. It keeps Meskerem 1, 2019 E.C. through Pagume 5, 2019 E.C. as separate structured Ethiopian date metadata and does not implement calendar conversion.

Run `npm test` for the full-Bible validation and custom generation scenarios. The Node built-in test runner uses TypeScript type stripping, so use a Node version that supports `--experimental-strip-types`.