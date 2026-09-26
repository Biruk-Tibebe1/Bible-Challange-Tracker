import { generateChallenge } from "./challenge-generator.ts";
import type { ChallengeGenerationInput, EthiopianDate } from "./challenge-types.ts";

export interface PredefinedChallengeConfiguration {
  calendar: "Ethiopian";
  startDate: EthiopianDate;
  endDate: EthiopianDate;
  durationDays: number;
  generation: ChallengeGenerationInput;
}

export const FULL_BIBLE_CHALLENGE_CONFIG: PredefinedChallengeConfiguration = {
  calendar: "Ethiopian",
  startDate: { year: 2019, month: "Meskerem", day: 1 },
  endDate: { year: 2019, month: "Pagume", day: 5 },
  durationDays: 365,
  generation: {
    startLocation: { bookId: "genesis", chapterNumber: 1 },
    endLocation: { bookId: "revelation", chapterNumber: 22 },
    totalDays: 365,
    remainderPlacement: "later",
  },
};

export const FULL_BIBLE_CHALLENGE = generateChallenge(FULL_BIBLE_CHALLENGE_CONFIG.generation);