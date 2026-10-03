import Image from "next/image";
import Link from "next/link";
import { FIRMA } from "@/lib/firma";
import "./wissen.css";

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <div className="knowledge-site">
    <header className="knowledge-header knowledge-screen-only"><Link href="/" className="knowledge-brand" aria-label="MerKalku Startseite"><Image src="/logo.webp" width={32} height={32} alt="" /><span>MerKalku</span></Link><nav aria-label="Wissensbereich"><Link href="/wissen">Wissen</Link><Link href="/ausschreibungen">Finder</Link><Link href="/">Zur Software <span aria-hidden="true">↗</span></Link></nav></header>
    {children}
    <footer className="knowledge-footer knowledge-screen-only"><div><strong>{FIRMA.marke}</strong><p>Arbeitshilfen für die Angebotsarbeit in der Gebäudereinigung.</p></div><nav aria-label="Rechtliches"><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/agb">AGB</a></nav></footer>
  </div>;
}
