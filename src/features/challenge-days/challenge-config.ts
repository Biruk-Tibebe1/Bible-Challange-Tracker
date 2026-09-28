export type EthiopianMonth = "Meskerem" | "Pagume";

export interface EthiopianChallengeDate {
  month: EthiopianMonth;
  day: number;
}

export const challengeConfig = {
  calendar: "Ethiopian",
  year: 2019,
  start: { month: "Meskerem", day: 1 },
  end: { month: "Pagume", day: 5 },
  durationDays: 365,
  bible: {
    canon: "Standard Protestant",
    bookCount: 66,
    chapterCount: 1189,
    firstChapter: "Genesis 1",
    finalChapter: "Revelation 22",
  },
  readingDistribution: {
    daysWithThreeChapters: 271,
    daysWithFourChapters: 94,
  },
  chapterCoverage: "exactly-once",
} as const;

export function formatChallengeDate(date: EthiopianChallengeDate): string {
  return `${date.month} ${date.day}, ${challengeConfig.year} E.C.`;
}