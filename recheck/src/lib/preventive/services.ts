// Free preventive care for adults. Under the ACA, plans generally cover these
// at no cost with an in-network provider (healthcare.gov). Criteria and
// intervals come from the official pages linked on each service, checked on
// CHECKED_ON. Names and plain-language explanations live in the dictionaries
// (src/lib/i18n/*.ts, key preventiveServices.<id>).

export type Sex = "female" | "male";

export type PreventiveMethod = { id: string; everyMonths: number };

export type PreventiveService = {
  id: string;
  kind: "vaccine" | "screening";
  // Age the person turns this year, inclusive.
  minAge?: number;
  maxAge?: number;
  sex?: Sex;
  // Only for people who said they were born in or lived in a country where TB is common.
  needsTbRisk?: boolean;
  // null: once, or the official recommendation sets no fixed interval.
  everyMonths: number | null;
  // From this age the interval changes (blood pressure: yearly from 40).
  everyMonthsFromAge?: { age: number; months: number };
  // When the interval depends on the test used, the person picks one.
  methods?: PreventiveMethod[];
  sourceName: "USPSTF" | "CDC";
  sourceUrl: string;
};

export const CHECKED_ON = "2026-11-15";

export const COVERAGE_SOURCE_URL = "https://www.healthcare.gov/preventive-care-adults/";

const USPSTF = "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/";
const CDC_ADULT_SCHEDULE = "https://www.cdc.gov/vaccines/hcp/imz-schedules/adult-age.html";

export const PREVENTIVE_SERVICES: PreventiveService[] = [
  // Screenings: USPSTF grade A or B recommendations for non-pregnant adults.
  {
    id: "blood_pressure",
    kind: "screening",
    minAge: 18,
    // Every 3–5 years at 18–39 with a normal reading and no added risk; yearly from 40.
    everyMonths: 36,
    everyMonthsFromAge: { age: 40, months: 12 },
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}hypertension-in-adults-screening`,
  },
  {
    id: "colorectal_cancer",
    kind: "screening",
    minAge: 45,
    maxAge: 75,
    everyMonths: 12,
    methods: [
      { id: "stool_test", everyMonths: 12 },
      { id: "stool_dna_test", everyMonths: 36 },
      { id: "colonoscopy", everyMonths: 120 },
    ],
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}colorectal-cancer-screening`,
  },
  {
    id: "breast_cancer",
    kind: "screening",
    minAge: 40,
    maxAge: 74,
    sex: "female",
    everyMonths: 24,
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}breast-cancer-screening`,
  },
  {
    id: "cervical_cancer",
    kind: "screening",
    minAge: 21,
    maxAge: 65,
    sex: "female",
    everyMonths: 36,
    methods: [
      { id: "pap_test", everyMonths: 36 },
      { id: "hpv_test", everyMonths: 60 },
    ],
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}cervical-cancer-screening`,
  },
  {
    id: "hiv",
    kind: "screening",
    minAge: 18,
    maxAge: 65,
    everyMonths: null,
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}human-immunodeficiency-virus-hiv-infection-screening`,
  },
  {
    id: "hepatitis_c",
    kind: "screening",
    minAge: 18,
    maxAge: 79,
    everyMonths: null,
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}hepatitis-c-screening`,
  },
  {
    id: "latent_tb",
    kind: "screening",
    minAge: 18,
    needsTbRisk: true,
    everyMonths: null,
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}latent-tuberculosis-infection-screening`,
  },
  {
    id: "osteoporosis",
    kind: "screening",
    minAge: 65,
    sex: "female",
    everyMonths: null,
    sourceName: "USPSTF",
    sourceUrl: `${USPSTF}osteoporosis-screening`,
  },
  // Vaccines: CDC adult immunization schedule (2025).
  {
    id: "flu_vaccine",
    kind: "vaccine",
    everyMonths: 12,
    sourceName: "CDC",
    sourceUrl: CDC_ADULT_SCHEDULE,
  },
  {
    id: "tdap_vaccine",
    kind: "vaccine",
    everyMonths: 120,
    sourceName: "CDC",
    sourceUrl: CDC_ADULT_SCHEDULE,
  },
  {
    id: "hpv_vaccine",
    kind: "vaccine",
    minAge: 19,
    maxAge: 26,
    everyMonths: null,
    sourceName: "CDC",
    sourceUrl: CDC_ADULT_SCHEDULE,
  },
  {
    id: "shingles_vaccine",
    kind: "vaccine",
    minAge: 50,
    everyMonths: null,
    sourceName: "CDC",
    sourceUrl: CDC_ADULT_SCHEDULE,
  },
  {
    id: "rsv_vaccine",
    kind: "vaccine",
    minAge: 75,
    everyMonths: null,
    sourceName: "CDC",
    sourceUrl: CDC_ADULT_SCHEDULE,
  },
];

export const PREVENTIVE_SERVICE_IDS = PREVENTIVE_SERVICES.map((service) => service.id);
