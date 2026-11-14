"use client";

import { useActionState, useState } from "react";
import type { ReviewState } from "@/app/(app)/documents/[id]/actions";
import type { ReviewedDetails, ReviewedLine } from "@/lib/documents/review";
import { formatCents, parseMoneyToCents, sumCents } from "@/lib/money";

type Row = ReviewedLine & { key: number };

type Props = {
  action: (state: ReviewState, formData: FormData) => Promise<ReviewState>;
  initialDetails: ReviewedDetails;
  initialLines: ReviewedLine[];
  initialTotal: string;
};

const emptyLine: ReviewedLine = { code: "", description: "", service_date: "", amount: "", quantity: null };
const inputClass = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

export function ReviewForm({ action, initialDetails, initialLines, initialTotal }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [details, setDetails] = useState(initialDetails);
  const setDetail = (field: keyof ReviewedDetails, value: string) =>
    setDetails((current) => ({ ...current, [field]: value }));
  const [nextKey, setNextKey] = useState(Math.max(initialLines.length, 1));
  const [rows, setRows] = useState<Row[]>(() =>
    (initialLines.length > 0 ? initialLines : [emptyLine]).map((line, key) => ({ ...line, key })),
  );
  const [statedTotal, setStatedTotal] = useState(initialTotal);

  const update = (key: number, field: keyof ReviewedLine, value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  const addRow = () => {
    setRows((current) => [...current, { ...emptyLine, key: nextKey }]);
    setNextKey((key) => key + 1);
  };

  const amounts = rows.map((row) => parseMoneyToCents(row.amount));
  const lineSum = sumCents(amounts.filter((amount): amount is number => amount !== null));
  const totalCents = parseMoneyToCents(statedTotal);
  const payload = JSON.stringify({
    details,
    lines: rows.map((row) => ({
      code: row.code,
      description: row.description,
      service_date: row.service_date,
      amount: row.amount,
      quantity: row.quantity,
    })),
    statedTotal,
  });

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="payload" value={payload} />

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">About this document</legend>
        <label className={labelClass}>
          Type
          <select
            value={details.type}
            onChange={(e) => setDetail("type", e.target.value)}
            className={`${inputClass} font-normal`}
          >
            <option value="bill">Bill from a provider</option>
            <option value="eob">Explanation of benefits from an insurer</option>
            <option value="receipt">Receipt</option>
            <option value="other">Something else</option>
          </select>
        </label>
        <label className={labelClass}>
          Hospital, clinic or doctor
          <input value={details.provider_name} onChange={(e) => setDetail("provider_name", e.target.value)} className={`${inputClass} font-normal`} />
        </label>
        <label className={labelClass}>
          Patient
          <input value={details.patient_name} onChange={(e) => setDetail("patient_name", e.target.value)} className={`${inputClass} font-normal`} />
        </label>
        <label className={labelClass}>
          Date of service
          <input type="date" value={details.service_date} onChange={(e) => setDetail("service_date", e.target.value)} className={`${inputClass} font-normal`} />
        </label>
        <label className={labelClass}>
          Paid by insurance
          <input value={details.insurance_paid} inputMode="decimal" placeholder="Leave empty if not shown" onChange={(e) => setDetail("insurance_paid", e.target.value)} className={`${inputClass} font-normal`} />
        </label>
        <label className={labelClass}>
          {details.type === "eob" ? "Your responsibility" : "Amount you owe"}
          <input value={details.patient_responsibility} inputMode="decimal" placeholder="Leave empty if not shown" onChange={(e) => setDetail("patient_responsibility", e.target.value)} className={`${inputClass} font-normal`} />
        </label>
      </fieldset>

      <h2 className="mt-8 mb-2 font-semibold">Charges</h2>
      <div className="hidden gap-2 px-1 text-xs font-medium text-slate-500 sm:grid sm:grid-cols-[6rem_9rem_1fr_7rem_2rem]">
        <span>Code</span>
        <span>Date of service</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
      </div>
      <ul className="flex flex-col gap-3 sm:gap-2">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[6rem_9rem_1fr_7rem_2rem] sm:border-0 sm:p-0"
          >
            <input aria-label={`Line ${index + 1} code`} placeholder="Code" value={row.code} onChange={(e) => update(row.key, "code", e.target.value)} className={inputClass} />
            <input aria-label={`Line ${index + 1} date of service`} type="date" value={row.service_date} onChange={(e) => update(row.key, "service_date", e.target.value)} className={inputClass} />
            <input aria-label={`Line ${index + 1} description`} placeholder="Description" value={row.description} onChange={(e) => update(row.key, "description", e.target.value)} className={`${inputClass} col-span-2 sm:col-span-1`} />
            <input
              aria-label={`Line ${index + 1} amount`}
              placeholder="0.00"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => update(row.key, "amount", e.target.value)}
              className={`${inputClass} text-right ${row.amount && amounts[index] === null ? "border-red-500" : ""}`}
            />
            <button
              type="button"
              aria-label={`Remove line ${index + 1}`}
              onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              disabled={rows.length === 1}
              className="rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={addRow} className="mt-3 text-sm font-medium text-slate-700 underline">
        Add a line
      </button>

      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1 font-medium">
          Total charges printed on the document
          <input
            value={statedTotal}
            onChange={(e) => setStatedTotal(e.target.value)}
            inputMode="decimal"
            placeholder="Leave empty if there is none"
            className={`${inputClass} font-normal sm:w-56`}
          />
        </label>
        <p>
          Lines add up to <strong>{formatCents(lineSum)}</strong>
          {totalCents !== null && totalCents !== lineSum && (
            <span className="block text-[var(--rc-red)]">
              {formatCents(totalCents - lineSum)} difference from the printed total
            </span>
          )}
        </p>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        If every line matches your paper document, save it even when the totals differ. A
        total that doesn&apos;t add up is worth asking the provider about.
      </p>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "These lines match my document"}
      </button>
    </form>
  );
}
