import type { Metadata } from "next";
import Rechner from "./rechner";

export const metadata: Metadata = {
  title: "Preisrechner: Was kosten euch Ausschreibungen?",
  description:
    "In 60 Sekunden ausrechnen, wie viel Zeit und Geld Ihr Betrieb bei Ausschreibungen sparen kann. Mit Rechenweg.",
  alternates: { canonical: "/preisrechner" },
};

export default function PreisrechnerPage() {
  return <Rechner />;
}
