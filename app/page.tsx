import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import { site } from "../site.config";

// The landing page and the studio share one page: the markup is rendered on the
// server (good for SEO and fast first paint), and the engine in /public/atelier.js
// brings it to life in the browser. Images never leave the user's device.
const markup = fs
  .readFileSync(path.join(process.cwd(), "app", "markup.html"), "utf8")
  .replaceAll("{{REPO_URL}}", site.repoUrl);

export default function Home() {
  return (
    <>
      <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: markup }} />
      <Script src="/atelier.js" strategy="afterInteractive" />
    </>
  );
}
