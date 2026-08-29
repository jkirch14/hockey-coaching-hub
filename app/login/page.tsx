import { signIn } from "@/lib/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl ?? "/dashboard";

  async function doLogin() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #ddd",
          borderRadius: 16,
          background: "white",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 22 }}>Hockey Coaching Hub</div>
        <div style={{ marginTop: 6, opacity: 0.75 }}>
          Plan. Develop. Analyze. Coach better.
        </div>

        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
          <div style={{ fontWeight: 800 }}>Sign in to continue</div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
            Access is invite-only.
          </div>

          <form action={doLogin} style={{ marginTop: 12 }}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #ccc",
                cursor: "pointer",
                fontWeight: 900,
                background: "white",
              }}
            >
              Continue with Google
            </button>
          </form>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
          By signing in you agree to share your name/email with the app.
        </div>
      </div>
    </main>
  );
}
