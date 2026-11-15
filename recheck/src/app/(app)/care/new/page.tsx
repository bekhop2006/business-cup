import { CareDescriptionForm } from "@/components/CareDescriptionForm";
import { getT } from "@/lib/i18n/server";

export default async function NewCarePage() {
  const { t } = await getT();
  return (
    <>
      <h1>{t.careNew.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--rc-muted)]">{t.careNew.intro}</p>
      <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">{t.home.emergencyBefore} <a href="tel:911" className="font-medium underline">{t.home.call911}</a> {t.home.emergencyAfter} {t.careNew.dontWait}</p>
      <CareDescriptionForm t={t.careForm} />
    </>
  );
}
