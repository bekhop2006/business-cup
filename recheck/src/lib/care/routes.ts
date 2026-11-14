// The places we can suggest for a painful knee, and how each one is billed.
// The visit codes below are the usual CPT codes for such a visit, chosen by
// us to look up public benchmark prices. They are not a prediction of what a
// provider will bill.

export type CareRouteId = "primary_care" | "sports_medicine" | "urgent_care" | "emergency_room";

// Which copay from the user's plan applies to the visit itself.
export type CopayKind = "primary" | "specialist" | "urgent_care" | "er";

// Which Medicare fee schedule rate applies to the doctor's part of the visit:
// "office" is the non-facility rate (clinic or office), "facility" is the rate
// paid when a hospital also bills its own fee.
export type CareSetting = "office" | "facility";

export type VisitCode = {
  cpt: string;
  label: string;
  why: string;
};

export type CareRoute = {
  id: CareRouteId;
  label: string;
  forWhat: string;
  accessNotes: string[];
  copayKind: CopayKind;
  setting: CareSetting;
  visit: VisitCode;
  // Text query for Google Places Text Search.
  placesQuery: string;
  // `taxonomy_description` for the NPI Registry API. Each one was checked to
  // return providers for ZIP 787* on 2026-11-14.
  npiTaxonomy: string;
};

// Under the 2021 AMA office visit rules, the level of a visit follows the
// complexity of medical decision making. An acute, uncomplicated injury is
// usually "low" complexity: 99203 for a new patient (99213 if the practice
// has seen you in the last 3 years). We assume a new patient, which prices
// slightly higher. Urgent care centers usually bill the same office codes.
const NEW_PATIENT_OFFICE_VISIT: VisitCode = {
  cpt: "99203",
  label: "Office visit, new patient (low complexity)",
  why: "An office visit for a new injury that isn't complicated is usually billed as a low-complexity new-patient visit (CPT 99203). If the practice has seen you before, it is usually 99213, which costs less.",
};

export const CARE_ROUTES: Record<CareRouteId, CareRoute> = {
  primary_care: {
    id: "primary_care",
    label: "Primary care doctor",
    forWhat:
      "A first look at pain that is bothering you but isn't getting worse fast. They can examine you, order an X-ray if needed and refer you on.",
    accessNotes: [
      "Usually needs an appointment; same-week visits are common.",
      "On HMO and POS plans this is usually where referrals to specialists come from.",
    ],
    copayKind: "primary",
    setting: "office",
    visit: NEW_PATIENT_OFFICE_VISIT,
    placesQuery: "primary care doctor",
    npiTaxonomy: "Family Medicine",
  },
  sports_medicine: {
    id: "sports_medicine",
    label: "Sports medicine doctor",
    forWhat:
      "Joint, muscle and sports injuries that aren't an emergency, like a knee that still hurts a week after a game.",
    accessNotes: [
      "HMO and POS plans may need a referral from your primary care doctor first; without one the visit may not be covered.",
      "PPO plans usually let you book a specialist directly.",
      "Insurers usually count this as a specialist visit, so the specialist copay applies.",
    ],
    copayKind: "specialist",
    setting: "office",
    visit: NEW_PATIENT_OFFICE_VISIT,
    placesQuery: "sports medicine doctor",
    npiTaxonomy: "Sports Medicine",
  },
  urgent_care: {
    id: "urgent_care",
    label: "Urgent care",
    forWhat:
      "Problems that need to be seen today but aren't life-threatening. Many urgent care centers can take an X-ray on site.",
    accessNotes: [
      "Walk-in, no referral needed on most plans.",
      "Some urgent care centers are owned by a hospital and add a facility fee. Ask before you're seen.",
    ],
    copayKind: "urgent_care",
    setting: "office",
    visit: NEW_PATIENT_OFFICE_VISIT,
    placesQuery: "urgent care",
    npiTaxonomy: "Urgent Care",
  },
  emergency_room: {
    id: "emergency_room",
    label: "Emergency room",
    forWhat: "Emergencies: any of the warning signs that point here, or anything that feels life-threatening.",
    accessNotes: [
      "Open 24/7, no referral needed. If it may be an emergency, call 911 or go now; don't let cost stop you.",
      "Under the federal No Surprises Act, emergency care is charged at your in-network cost sharing even at an out-of-network ER.",
    ],
    copayKind: "er",
    setting: "facility",
    visit: {
      cpt: "99284",
      label: "Emergency department visit (moderate complexity)",
      why: "ER doctor visits are billed in five levels (99281-99285). An injury that needs an exam and often imaging is usually moderate complexity, level 4 (CPT 99284). The hospital also bills its own facility fee on top.",
    },
    placesQuery: "emergency room",
    npiTaxonomy: "General Acute Care Hospital",
  },
};

export type AddOnId = "knee_xray" | "knee_mri";

export type AddOn = {
  id: AddOnId;
  cpt: string;
  label: string;
  // For sentences: "the X-ray", "the MRI".
  shortName: string;
  why: string;
};

export const KNEE_ADD_ONS: Record<AddOnId, AddOn> = {
  knee_xray: {
    id: "knee_xray",
    cpt: "73562",
    label: "Knee X-ray (3 views)",
    shortName: "X-ray",
    why: "Knee X-rays are billed by number of views: 73560 (1-2), 73562 (3), 73564 (4 or more). We use 3 views as a middle case.",
  },
  knee_mri: {
    id: "knee_mri",
    cpt: "73721",
    label: "Knee MRI without contrast",
    shortName: "MRI",
    why: "CPT 73721 is an MRI of a leg joint, such as the knee, without contrast dye.",
  },
};
