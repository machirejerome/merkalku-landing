import { pageMetadata } from "@/lib/seo";
import Rechner from "./rechner";

export const metadata = pageMetadata(
  "/preisrechner",
  "Preisrechner: Was kosten euch Ausschreibungen?",
  "In 60 Sekunden ausrechnen, wie viel Zeit und Geld Ihr Betrieb bei Ausschreibungen sparen kann. Mit Rechenweg.",
);

export default function PreisrechnerPage() {
  return <Rechner startHinweis="Fünf Fragen, keine Unterlagen. Dann siehst du, wie viele Stunden im Monat bei euch frei werden." />;
}
