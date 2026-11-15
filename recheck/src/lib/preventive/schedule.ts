import { PREVENTIVE_SERVICES, type PreventiveService, type Sex } from "@/lib/preventive/services";

// Which free preventive services apply to a person and when each is due.
// Pure code from the official criteria in services.ts; the LLM is never involved.

export type PreventiveProfile = {
  birthYear: number | null;
  sex: Sex | null;
  tbRisk: boolean | null;
};

// The stored profile columns, narrowed.
export function preventiveProfileOf(profile: {
  birth_year: number | null;
  sex: string | null;
  tb_risk: boolean | null;
} | null): PreventiveProfile {
  const sex = profile?.sex === "female" || profile?.sex === "male" ? profile.sex : null;
  return { birthYear: profile?.birth_year ?? null, sex, tbRisk: profile?.tb_risk ?? null };
}

export type ServiceStatus =
  | { kind: "not_recorded" }
  | { kind: "due"; lastDoneOn: string }
  | { kind: "up_to_date"; lastDoneOn: string; nextDueOn: string | null };

export type Eligibility = {
  services: PreventiveService[];
  // Services we can't show yet because the profile is missing a detail.
  hiddenForMissingAge: number;
  hiddenForMissingSex: number;
};

// We only know the birth year, so we use the age the person turns this year.
export function ageThisYear(birthYear: number, today: Date): number {
  return today.getUTCFullYear() - birthYear;
}

function needsAge(service: PreventiveService): boolean {
  return service.minAge !== undefined || service.maxAge !== undefined;
}

export function eligibleServices(profile: PreventiveProfile, today: Date): Eligibility {
  const age = profile.birthYear === null ? null : ageThisYear(profile.birthYear, today);
  let hiddenForMissingAge = 0;
  let hiddenForMissingSex = 0;
  const services = PREVENTIVE_SERVICES.filter((service) => {
    if (service.needsTbRisk && profile.tbRisk !== true) return false;
    if (needsAge(service)) {
      if (age === null) {
        hiddenForMissingAge += 1;
        return false;
      }
      if (service.minAge !== undefined && age < service.minAge) return false;
      if (service.maxAge !== undefined && age > service.maxAge) return false;
    }
    if (service.sex) {
      if (profile.sex === null) {
        hiddenForMissingSex += 1;
        return false;
      }
      if (profile.sex !== service.sex) return false;
    }
    return true;
  });
  return { services, hiddenForMissingAge, hiddenForMissingSex };
}

// "2026-10-01" + 12 months -> "2027-10-01". Dates are calendar dates in UTC.
export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

export type PreventiveRecord = { service_id: string; last_done_on: string; method: string | null };

// How often a service repeats for this person, given the test they had.
export function intervalMonths(service: PreventiveService, age: number | null, method: string | null): number | null {
  const chosen = service.methods?.find((option) => option.id === method);
  if (chosen) return chosen.everyMonths;
  if (service.everyMonthsFromAge && age !== null && age >= service.everyMonthsFromAge.age) {
    return service.everyMonthsFromAge.months;
  }
  return service.everyMonths;
}

export function serviceStatus(
  service: PreventiveService,
  record: { lastDoneOn: string; method: string | null } | null,
  age: number | null,
  today: Date,
): ServiceStatus {
  if (!record) return { kind: "not_recorded" };
  const months = intervalMonths(service, age, record.method);
  // Once in a lifetime, or no fixed interval in the official recommendation.
  if (months === null) return { kind: "up_to_date", lastDoneOn: record.lastDoneOn, nextDueOn: null };
  const nextDueOn = addMonths(record.lastDoneOn, months);
  if (nextDueOn <= today.toISOString().slice(0, 10)) return { kind: "due", lastDoneOn: record.lastDoneOn };
  return { kind: "up_to_date", lastDoneOn: record.lastDoneOn, nextDueOn };
}

export type ServiceWithStatus = { service: PreventiveService; status: ServiceStatus; method: string | null };

export function preventiveChecklist(
  profile: PreventiveProfile,
  records: PreventiveRecord[],
  today: Date,
): Eligibility & { items: ServiceWithStatus[]; unused: number } {
  const eligibility = eligibleServices(profile, today);
  const age = profile.birthYear === null ? null : ageThisYear(profile.birthYear, today);
  const byService = new Map(records.map((record) => [record.service_id, record]));
  const items = eligibility.services.map((service) => {
    const record = byService.get(service.id);
    return {
      service,
      method: record?.method ?? null,
      status: serviceStatus(service, record ? { lastDoneOn: record.last_done_on, method: record.method } : null, age, today),
    };
  });
  const unused = items.filter((item) => item.status.kind !== "up_to_date").length;
  return { ...eligibility, items, unused };
}

// Month input "2026-10" -> "2026-10-01". Rejects future months.
export function parseDoneMonth(value: string, today: Date): string | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
  if (!match) return "invalid";
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 1900) return "invalid";
  const iso = `${match[1]}-${match[2]}-01`;
  const thisMonth = today.toISOString().slice(0, 7) + "-01";
  if (iso > thisMonth) return "invalid";
  return iso;
}
