// Warning-sign questions asked before we suggest where to go for a painful
// knee or leg. Fixed list, answered yes/no by the user. Code decides the
// urgency from the answers; the LLM never does. We never name a diagnosis.
//
// Sources the list is based on (checked 2026-11-14):
// - Ottawa knee rule: Stiell IG et al. "Prospective validation of a decision
//   rule for the use of radiography in acute knee injuries." JAMA.
//   1996;275(8):611-615. https://pubmed.ncbi.nlm.nih.gov/8594242/
//   (unable to bear weight / take 4 steps, even limping).
// - NHS, Knee pain: https://www.nhs.uk/conditions/knee-pain/
//   ("get advice from 111 now": very painful, cannot put weight on it, badly
//   swollen or changed shape, locks or gives way, high temperature with
//   redness or heat around the knee).
// - NHS, Dislocated kneecap: https://www.nhs.uk/conditions/dislocated-kneecap/
//   ("go to A&E": knee changed shape, very swollen very quickly, bone showing).
// - NHS, Broken leg: https://www.nhs.uk/conditions/broken-leg/
//   ("call 999 or go to A&E": leg twisted or bent; blue, grey or pale skin).
// - NHS, DVT: https://www.nhs.uk/conditions/deep-vein-thrombosis-dvt/
//   ("call 999 or go to A&E": leg pain or swelling with shortness of breath
//   or chest pain).
// Where sources differ we take the more urgent level.

export type Urgency = "emergency" | "urgent" | "routine";
export type WarningUrgency = Exclude<Urgency, "routine">;

export type SafetyQuestionId =
  | "chest_pain_or_breathless"
  | "numb_cold_or_blue"
  | "deformity"
  | "rapid_swelling"
  | "cannot_bear_weight"
  | "hot_red_with_fever"
  | "severe_pain"
  | "locks_or_gives_way";

export type SafetyQuestion = {
  id: SafetyQuestionId;
  // Worded so that "yes" is always the warning sign.
  question: string;
  // What the user told us when they answer yes, used in reasons.
  sign: string;
  urgency: WarningUrgency;
  // "injury": only asked when the pain started with an injury.
  appliesTo: "any" | "injury";
  sourceUrl: string;
};

const NHS_KNEE = "https://www.nhs.uk/conditions/knee-pain/";
const NHS_KNEECAP = "https://www.nhs.uk/conditions/dislocated-kneecap/";
const NHS_BROKEN_LEG = "https://www.nhs.uk/conditions/broken-leg/";
const NHS_DVT = "https://www.nhs.uk/conditions/deep-vein-thrombosis-dvt/";
const OTTAWA_KNEE_RULE = "https://pubmed.ncbi.nlm.nih.gov/8594242/";

export const SAFETY_QUESTIONS: readonly SafetyQuestion[] = [
  {
    id: "chest_pain_or_breathless",
    question: "Do you have chest pain or shortness of breath?",
    sign: "You have chest pain or shortness of breath.",
    urgency: "emergency",
    appliesTo: "any",
    sourceUrl: NHS_DVT,
  },
  {
    id: "numb_cold_or_blue",
    question: "Is your leg, foot or toes numb, cold, or turning pale, blue or grey?",
    sign: "Your leg, foot or toes are numb, cold, or changing color.",
    urgency: "emergency",
    appliesTo: "any",
    sourceUrl: NHS_BROKEN_LEG,
  },
  {
    id: "deformity",
    question: "Does your knee or leg look out of shape, bent or twisted, or is bone showing?",
    sign: "Your knee or leg looks out of shape.",
    urgency: "emergency",
    appliesTo: "injury",
    sourceUrl: NHS_KNEECAP,
  },
  {
    id: "rapid_swelling",
    question: "Did your knee become very swollen very quickly after the injury?",
    sign: "Your knee became very swollen very quickly.",
    urgency: "emergency",
    appliesTo: "injury",
    sourceUrl: NHS_KNEECAP,
  },
  {
    id: "cannot_bear_weight",
    question: "Are you unable to take 4 steps on that leg, even with a limp?",
    sign: "You can't take 4 steps on that leg.",
    urgency: "urgent",
    appliesTo: "any",
    sourceUrl: OTTAWA_KNEE_RULE,
  },
  {
    id: "hot_red_with_fever",
    question:
      "Is your knee red or hot to the touch, and do you also have a fever or feel hot, cold or shivery?",
    sign: "Your knee is red or hot and you have a fever or chills.",
    urgency: "urgent",
    appliesTo: "any",
    sourceUrl: NHS_KNEE,
  },
  {
    id: "severe_pain",
    question: "Is the pain severe, or getting worse, even with rest and over-the-counter pain relief?",
    sign: "Your pain is severe or getting worse.",
    urgency: "urgent",
    appliesTo: "any",
    sourceUrl: NHS_KNEE,
  },
  {
    id: "locks_or_gives_way",
    question: "Does your knee lock (get stuck) or give way under you?",
    sign: "Your knee locks or gives way.",
    urgency: "urgent",
    appliesTo: "any",
    sourceUrl: NHS_KNEE,
  },
];

export type SafetyAnswers = Partial<Record<SafetyQuestionId, boolean>>;

export type UrgencyAssessment = {
  urgency: Urgency;
  // Plain-English reasons, most urgent first. Empty only for "routine".
  reasons: string[];
  // Questions answered yes.
  flagged: SafetyQuestionId[];
  // Questions that apply but were not answered.
  unanswered: SafetyQuestionId[];
};

export const UNANSWERED_REASON =
  "Some warning-sign questions were not answered, so we can't rule those signs out.";

// The questions to show. Without an injury, injury-only questions are skipped.
export function safetyQuestionsFor(afterInjury: boolean): SafetyQuestion[] {
  return SAFETY_QUESTIONS.filter((q) => afterInjury || q.appliesTo === "any");
}

// Conservative: any "yes" raises the urgency to that question's level, and a
// question left unanswered never allows "routine". `afterInjury` defaults to
// true so that, when we don't know, every question counts.
export function assessUrgency(
  answers: SafetyAnswers,
  { afterInjury = true }: { afterInjury?: boolean } = {},
): UrgencyAssessment {
  const yes = SAFETY_QUESTIONS.filter((q) => answers[q.id] === true);
  const emergency = yes.filter((q) => q.urgency === "emergency");
  const urgent = yes.filter((q) => q.urgency === "urgent");
  const flagged = [...emergency, ...urgent];
  const unanswered = safetyQuestionsFor(afterInjury)
    .filter((q) => answers[q.id] === undefined)
    .map((q) => q.id);

  const reasons = flagged.map((q) => q.sign);
  let urgency: Urgency = "routine";
  if (emergency.length > 0) urgency = "emergency";
  else if (urgent.length > 0) urgency = "urgent";
  else if (unanswered.length > 0) {
    urgency = "urgent";
    reasons.push(UNANSWERED_REASON);
  }

  return { urgency, reasons, flagged: flagged.map((q) => q.id), unanswered };
}
