// Appointments the person books themselves by phone or email. Recheck never
// books on their behalf; it keeps the date, reminds them and asks for the
// bill afterwards.

export const APPOINTMENT_STATUSES = ["planned", "done", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

// How long after the start we stop calling a visit "upcoming".
const VISIT_LENGTH_MS = 2 * 60 * 60 * 1000;

// The browser turns the local date and time the person typed into an ISO
// instant (so daylight saving is handled there). It must be in the future.
export function parseAppointmentTime(iso: string, now: Date): string | "invalid" | "past" {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/.test(iso)) return "invalid";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "invalid";
  if (time <= now.getTime()) return "past";
  if (time - now.getTime() > 400 * 24 * 60 * 60 * 1000) return "invalid";
  return new Date(time).toISOString();
}

export type AppointmentStage = "upcoming" | "after_visit" | "done" | "cancelled";

export function appointmentStage(
  appointmentAt: string | null,
  status: string | null,
  now: Date,
): AppointmentStage | null {
  if (!appointmentAt || !status) return null;
  if (status === "done") return "done";
  if (status === "cancelled") return "cancelled";
  return new Date(appointmentAt).getTime() + VISIT_LENGTH_MS > now.getTime() ? "upcoming" : "after_visit";
}

// A request the person can paste into an email to the clinic. Plain text,
// only details they gave us; no member IDs.
export function appointmentEmail(input: {
  providerName: string;
  careLabel: string;
  insurance: string | null;
  name: string | null;
}): { subject: string; body: string } {
  const plan = input.insurance ? `my plan (${input.insurance})` : "my insurance plan";
  return {
    subject: "New patient appointment request",
    body: [
      "Hello,",
      "",
      `I'd like to book a new-patient visit with ${input.providerName} (${input.careLabel.toLowerCase()}). What is your earliest availability?`,
      "",
      "Before I book, could you please confirm:",
      `- Is this clinician and location in-network for ${plan}?`,
      "- Do I need a referral or prior authorization?",
      "- What billing codes do you expect, and can you share an estimate of my cost?",
      "",
      "Thank you,",
      input.name ?? "",
    ].join("\n").trimEnd(),
  };
}

// iCalendar file for "Add to calendar". Times are UTC.
export function appointmentIcs(input: {
  caseId: string;
  startsAt: string;
  providerName: string;
  address: string | null;
  phone: string | null;
  now: Date;
}): string {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (text: string) => text.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\r?\n/g, "\\n");
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const description = [
    "Booked by you with the clinic. Before you go, confirm the clinic is in-network for your exact plan.",
    input.phone ? `Clinic phone: ${input.phone}` : null,
    "After the visit, add your bill to Recheck to check the charges.",
  ].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recheck//Appointment//EN",
    "BEGIN:VEVENT",
    `UID:${input.caseId}@recheck`,
    `DTSTAMP:${stamp(input.now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`Appointment: ${input.providerName}`)}`,
    input.address ? `LOCATION:${escape(input.address)}` : null,
    `DESCRIPTION:${escape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null).join("\r\n") + "\r\n";
}
