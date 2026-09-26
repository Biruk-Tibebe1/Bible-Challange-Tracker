# Progress

`progress-model.ts` defines immutable completion records independently of challenge schedules. A progress object is keyed by a challenge identifier and stores each day as complete or incomplete; it contains no user, auth, database, or persistence fields.

`use-challenge-progress.ts` keeps challenge-keyed progress objects in React state as the UI/domain model. Unauthenticated progress remains in memory for the current session. Authenticated challenge views hydrate this model from `user_challenge_progress` and write to the cloud before reflecting completion. Shared schedules remain unchanged, allowing participants to maintain separate progress records.