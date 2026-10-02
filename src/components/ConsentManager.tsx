"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_CHANGED_EVENT, CONSENT_OPEN_EVENT, CONSENT_STORAGE_KEY, canMeasure, clearOptionalCookies, isLeadinfoExcluded, readConsent, reloadAfterConsentWithdrawal, saveConsent, type ConsentRecord } from "@/lib/consent";
import { stopAnalytics, trackPageView } from "@/lib/analytics";
import { leadinfoWasStarted, marketingWasStarted, startMarketing } from "@/lib/marketing";
import { trackEvent } from "@/lib/tracking";

const emptySnapshot = () => "";
const serverReady = () => false;
const clientReady = () => true;
const noopSubscribe = () => () => {};
function consentSnapshot() { const record = readConsent(); return record ? JSON.stringify(record) : ""; }
function subscribeConsent(listener: () => void) {
  const storage = (event: StorageEvent) => { if (!event.key || event.key === CONSENT_STORAGE_KEY) listener(); };
  window.addEventListener(CONSENT_CHANGED_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(CONSENT_CHANGED_EVENT, listener); window.removeEventListener("storage", storage); };
}

/** Local banner; no CMP, Google, marketing or other remote asset is needed to show it. */
export default function ConsentManager() {
  const pathname = usePathname();
  const ready = useSyncExternalStore(noopSubscribe, clientReady, serverReady);
  const rawConsent = useSyncExternalStore(subscribeConsent, consentSnapshot, emptySnapshot);
  const consent: ConsentRecord | null = rawConsent ? JSON.parse(rawConsent) : null;
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState("");
  const previousConsent = useRef<ConsentRecord | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const reopenButton = useRef<HTMLButtonElement>(null);
  const show = ready && (open || !consent);

  function openSettings() {
    const current = readConsent();
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    setError("");
    setOpen(true);
  }

  useEffect(() => {
    const openEvent = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setError("");
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, openEvent);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, openEvent);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const current = readConsent();
    const previous = previousConsent.current;
    previousConsent.current = current;
    const revoked = (previous?.analytics && !current?.analytics) || (previous?.marketing && !current?.marketing);
    if (revoked) {
      stopAnalytics();
      clearOptionalCookies();
      // A removed script element cannot stop an already-running third-party SDK.
      // A new document is the hard boundary for withdrawal, including other tabs.
      reloadAfterConsentWithdrawal();
      return;
    }
    if (leadinfoWasStarted() && isLeadinfoExcluded(window.location.pathname)) {
      window.location.reload();
      return;
    }
    if (canMeasure("analytics")) trackPageView();
    if (canMeasure("marketing")) startMarketing();
    if (!current) return;
    // Browser timers have a ~24 day maximum, so long consent lifetimes are rechecked daily.
    let timer: number;
    const checkExpiry = () => {
      if (!readConsent()) { window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT)); return; }
      timer = window.setTimeout(checkExpiry, Math.min(current.expiresAt - Date.now() + 1, 24 * 60 * 60 * 1000));
    };
    timer = window.setTimeout(checkExpiry, Math.min(current.expiresAt - Date.now() + 1, 24 * 60 * 60 * 1000));
    return () => window.clearTimeout(timer);
  }, [rawConsent, pathname, ready]);

  useEffect(() => {
    if (!show) return;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.focus();
    return () => { if (focused?.isConnected) focused.focus(); };
  }, [show]);

  useEffect(() => {
    // Preserve /ausschreibung's Leadinfo exclusion across Next client navigations.
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null;
      if (!anchor || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      // A CTA is an expression of interest, never a confirmed appointment.
      if (url.origin === window.location.origin) {
        if (url.hash === "#termin") trackEvent("demo_cta_click");
        if (url.pathname.replace(/\/$/, "") === "/preisrechner") trackEvent("calculator_open");
      }
      if (!leadinfoWasStarted() || anchor.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (url.origin === window.location.origin && isLeadinfoExcluded(url.pathname)) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(url.href);
      }
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, []);

  function choose(choices: { analytics: boolean; marketing: boolean }) {
    const before = readConsent();
    const saved = saveConsent(choices);
    if (!saved) {
      stopAnalytics();
      clearOptionalCookies();
      if (marketingWasStarted()) { reloadAfterConsentWithdrawal(); return; }
      setError("Die Auswahl konnte nicht gespeichert werden. Optionale Messung bleibt ausgeschaltet. Bitte prüfe die Speichereinstellungen deines Browsers.");
      return;
    }
    setOpen(false);
    if ((before?.analytics && !saved.analytics) || (before?.marketing && !saved.marketing)) {
      stopAnalytics();
      clearOptionalCookies();
      reloadAfterConsentWithdrawal();
      return;
    }
    reopenButton.current?.focus();
  }

  const buttonStyle = { border: "1px solid #075d38", color: "#075d38", background: "#fff", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer" };
  return <>
    <button ref={reopenButton} type="button" onClick={openSettings} aria-haspopup="dialog" className="fixed left-3 bottom-24 z-50 rounded-full border border-emerald-800 bg-white px-3 py-2 text-xs text-emerald-900 shadow-sm">Datenschutz-Einstellungen</button>
    {show && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-3 sm:items-center" onKeyDown={(event) => {
      if (event.key === "Escape" && consent) setOpen(false);
      if (event.key !== "Tab") return;
      const elements = dialog.current?.querySelectorAll<HTMLElement>('button, input, a[href]');
      if (!elements?.length) return;
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="mk-consent-title" aria-describedby="mk-consent-description" tabIndex={-1} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-xl sm:p-7">
        <h2 id="mk-consent-title" className="text-xl font-semibold">Deine Datenschutz-Einstellungen</h2>
        <p id="mk-consent-description" className="mt-3 text-sm leading-relaxed">Du kannst MerKalku auch ohne optionale Messung nutzen. Du entscheidest getrennt über Statistik und Marketing. Eine Ablehnung hat keinen Einfluss auf Rechner, Anfragen oder Terminbuchung.</p>
        <div className="mt-4 space-y-4 text-sm">
          <label className="flex items-start gap-3"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-800" /><span><strong>Statistik</strong><br />Google Analytics und unsere Funnel-Auswertung helfen uns, die Nutzung zu verstehen. Wir übertragen keine Kontaktangaben oder einzelnen Rechnerantworten.</span></label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-800" /><span><strong>Marketing</strong><br />OpenAI Ads misst Anzeigenkontakte und Anfragen. Leadinfo erkennt Unternehmensbesuche; auf der Ausschreibungs-Landingpage wird Leadinfo nicht eingesetzt.</span></label>
        </div>
        <p className="mt-4 text-xs leading-relaxed">Deine Auswahl speichern wir für 180 Tage auf diesem Gerät. Du kannst sie jederzeit über „Datenschutz-Einstellungen“ ändern oder widerrufen. Weitere Informationen zu Anbietern und Datenverarbeitung findest du in der <a className="underline" href="/datenschutz">Datenschutzerklärung</a>.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" style={buttonStyle} onClick={() => choose({ analytics: false, marketing: false })}>Alle ablehnen</button>
          <button type="button" style={buttonStyle} onClick={() => choose({ analytics: true, marketing: true })}>Alle akzeptieren</button>
          <button type="button" style={buttonStyle} className="sm:col-span-2" onClick={() => choose({ analytics, marketing })}>Auswahl speichern</button>
          {consent && <button type="button" onClick={() => setOpen(false)} className="text-sm underline sm:col-span-2">Schließen</button>}
        </div>
      </div>
    </div>}
  </>;
}
