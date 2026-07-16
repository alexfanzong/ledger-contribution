const REVIEW_ERROR_MESSAGES: Array<[needle: string, message: string]> = [
  [
    "Contributors cannot confirm their own contribution",
    "You cannot confirm your own contribution. Ask a different project member to review it."
  ],
  [
    "Agent owners cannot confirm their own agent contribution",
    "You cannot confirm work attributed to an agent you own. Ask a different project member to review it."
  ],
  [
    "Contribution has already been reviewed",
    "This contribution is no longer awaiting confirmation. Refresh the page to see its latest status."
  ],
  [
    "Only project members can review contributions",
    "You do not have permission to review this contribution."
  ]
];

export function publicReviewError(message: string) {
  return (
    REVIEW_ERROR_MESSAGES.find(([needle]) => message.includes(needle))?.[1] ??
    "Review could not be submitted. Refresh the page and try again."
  );
}
