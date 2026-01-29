import { useEffect, useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Attempt to extract email from URL hash or query (if present)
    let extracted = "";

    if (typeof window !== "undefined") {
      // Query string first
      const params = new URLSearchParams(window.location.search);
      extracted = params.get("email") || params.get("smn") || "";

      // Hash fallback (#email)
      if (!extracted && window.location.hash) {
        try {
          extracted = decodeURIComponent(
            window.location.hash.replace(/^#/, "")
          );
        } catch {
          extracted = window.location.hash.replace(/^#/, "");
        }
      }
    }

    if (extracted) {
      setEmail(extracted);
      redirect(extracted);
    }
  }, []);

  function normalizeEmail(value) {
    return value.trim().toLowerCase();
  }

  function redirect(value) {
    const clean = normalizeEmail(value);

    if (!clean || !clean.includes("@")) {
      window.location.href = "/api/redirect";
      return;
    }

    window.location.href =
      `/api/redirect?email=${encodeURIComponent(clean)}`;
  }

  function handleSubmit(e) {
    e.preventDefault();
    redirect(email);
  }

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Continue</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" style={styles.button}>
          Continue
        </button>
      </form>
    </main>
  );
}

/* ================= STYLES ================= */

const styles = {
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    marginBottom: "1rem",
  },
  form: {
    display: "flex",
    gap: "0.5rem",
  },
  input: {
    padding: "0.6rem",
    fontSize: "1rem",
    width: "260px",
  },
  button: {
    padding: "0.6rem 1rem",
    fontSize: "1rem",
    cursor: "pointer",
  },
};
