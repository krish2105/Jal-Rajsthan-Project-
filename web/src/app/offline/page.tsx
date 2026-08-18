export const metadata = { title: "Offline · JAL" };

export default function Offline() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[color:var(--accent)]/15 text-3xl leading-[3.5rem]">💧</div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          You&rsquo;re offline · आप ऑफ़लाइन हैं
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-2)]">
          Pages you have already opened stay available from the device cache. Live forecasts, the
          copilot and the works ledger need a connection — they will resume on their own once you
          are back.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--text-3)]">
          पहले खोले गए पृष्ठ डिवाइस कैश से उपलब्ध रहते हैं। लाइव पूर्वानुमान, कोपायलट और कार्य पंजी
          के लिए कनेक्शन आवश्यक है।
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
            retrying from the offline shell must re-hit the network; a client-side
            Link transition would resolve from the same cache that served this page */}
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-[color:var(--on-accent)]"
        >
          Retry · पुनः प्रयास
        </a>
      </div>
    </main>
  );
}
