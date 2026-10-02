import { canMeasure, isLeadinfoExcluded } from "./consent";

type TrackerQueue = ((...args: unknown[]) => void) & { q: unknown[][]; t?: string };
declare global {
  interface Window { leadinfo?: TrackerQueue; GlobalLeadinfoNamespace?: string[]; oaiq?: TrackerQueue; }
}
let started = false;
let leadinfoStarted = false;

function appendScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function marketingWasStarted() { return started; }
export function leadinfoWasStarted() { return leadinfoStarted; }

export function startMarketing() {
  if (!canMeasure("marketing")) return;
  if (!window.oaiq) {
    const queue: TrackerQueue = Object.assign((...args: unknown[]) => { queue.q.push(args); }, { q: [] as unknown[][] });
    window.oaiq = queue;
    queue("init", { pixelId: "5AqDj4XKxG9a38E7EVMjyN" });
    appendScript("mk-openai-ads", "https://bzrcdn.openai.com/sdk/oaiq.min.js");
    started = true;
  }
  if (!isLeadinfoExcluded(window.location.pathname) && !window.leadinfo) {
    const queue: TrackerQueue = Object.assign((...args: unknown[]) => { queue.q.push(args); }, { q: [] as unknown[][], t: "LI-6A8EC9B923EA8" });
    window.GlobalLeadinfoNamespace = window.GlobalLeadinfoNamespace || [];
    window.GlobalLeadinfoNamespace.push("leadinfo");
    window.leadinfo = queue;
    appendScript("mk-leadinfo", "https://cdn.leadinfo.eu/ping.js");
    started = true;
    leadinfoStarted = true;
  }
}
