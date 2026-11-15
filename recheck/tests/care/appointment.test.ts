import { describe, expect, it } from "vitest";
import { appointmentEmail, appointmentIcs, appointmentStage, parseAppointmentTime } from "@/lib/care/appointment";

const now = new Date("2026-11-15T12:00:00Z");

describe("parseAppointmentTime", () => {
  it("accepts a future instant from the browser", () => {
    expect(parseAppointmentTime("2026-11-20T18:30:00.000Z", now)).toBe("2026-11-20T18:30:00.000Z");
  });

  it("rejects past, malformed and far-future times", () => {
    expect(parseAppointmentTime("2026-11-14T18:30:00.000Z", now)).toBe("past");
    expect(parseAppointmentTime("2026-11-20 18:30", now)).toBe("invalid");
    expect(parseAppointmentTime("", now)).toBe("invalid");
    expect(parseAppointmentTime("2028-11-20T18:30:00.000Z", now)).toBe("invalid");
  });
});

describe("appointmentStage", () => {
  it("is upcoming until two hours after the start, then asks about the visit", () => {
    expect(appointmentStage("2026-11-15T11:00:00.000Z", "planned", now)).toBe("upcoming");
    expect(appointmentStage("2026-11-15T09:00:00.000Z", "planned", now)).toBe("after_visit");
  });

  it("follows the saved status and ignores cases without an appointment", () => {
    expect(appointmentStage("2026-11-10T09:00:00.000Z", "done", now)).toBe("done");
    expect(appointmentStage("2026-11-20T09:00:00.000Z", "cancelled", now)).toBe("cancelled");
    expect(appointmentStage(null, null, now)).toBeNull();
  });
});

describe("appointmentEmail", () => {
  it("asks to book and to confirm the network for the person's plan", () => {
    const email = appointmentEmail({
      providerName: "Mission Sports Medicine",
      careLabel: "Sports medicine",
      insurance: "UnitedHealthcare Choice Plus",
      name: "Michael",
    });
    expect(email.subject).toBe("New patient appointment request");
    expect(email.body).toContain("new-patient visit with Mission Sports Medicine (sports medicine)");
    expect(email.body).toContain("in-network for my plan (UnitedHealthcare Choice Plus)");
    expect(email.body.endsWith("Michael")).toBe(true);
  });

  it("works without a plan or name", () => {
    const email = appointmentEmail({ providerName: "Clinic", careLabel: "Primary care", insurance: null, name: null });
    expect(email.body).toContain("in-network for my insurance plan");
    expect(email.body.endsWith("Thank you,")).toBe(true);
  });
});

describe("appointmentIcs", () => {
  it("builds a one-hour UTC event with escaped text", () => {
    const ics = appointmentIcs({
      caseId: "case-1",
      startsAt: "2026-11-20T18:30:00.000Z",
      providerName: "Clinic, Inc",
      address: "1 Main St; Suite 2",
      phone: "(415) 555-0100",
      now,
    });
    expect(ics).toContain("DTSTART:20261120T183000Z\r\n");
    expect(ics).toContain("DTEND:20261120T193000Z\r\n");
    expect(ics).toContain("SUMMARY:Appointment: Clinic\\, Inc\r\n");
    expect(ics).toContain("LOCATION:1 Main St\\; Suite 2\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});
