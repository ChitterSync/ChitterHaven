"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faCheck, faCommentDots, faHashtag, faServer, faUserGear } from "@fortawesome/free-solid-svg-icons";

const NAVIGATION_GUIDE_KEY = "ch_navigation_guide_complete_v1";

const guideSteps = [
  {
    icon: faServer,
    eyebrow: "Your communities",
    title: "Start with a Haven",
    body: "Havens are the communities you belong to. Select a Haven from the left side to see its conversations and members.",
    hint: "On a phone, use the Havens tab in the bottom navigation.",
  },
  {
    icon: faHashtag,
    eyebrow: "Find a conversation",
    title: "Choose a channel or DM",
    body: "Channels organize Haven conversations by topic. Direct Messages are private conversations and live in the DMs area.",
    hint: "The currently selected conversation appears in the main panel.",
  },
  {
    icon: faCommentDots,
    eyebrow: "Join in",
    title: "Read and send messages",
    body: "Messages appear in the center. Use the box at the bottom to write, mention people, attach files, create polls, and send replies.",
    hint: "Press Enter to send. Use Shift + Enter for a new line.",
  },
  {
    icon: faUserGear,
    eyebrow: "Make it yours",
    title: "Profile and settings",
    body: "Open your profile or the gear button to update your status, appearance, notifications, privacy, and account preferences.",
    hint: "You can change these choices whenever you like.",
  },
];

export default function NavigationGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(NAVIGATION_GUIDE_KEY) !== "true") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const restart = () => { setStep(0); setOpen(true); };
    window.addEventListener("ch_restart_navigation_guide", restart);
    return () => window.removeEventListener("ch_restart_navigation_guide", restart);
  }, []);

  const closeGuide = () => {
    try { window.localStorage.setItem(NAVIGATION_GUIDE_KEY, "true"); } catch {}
    setOpen(false);
  };

  if (!open) return null;
  const current = guideSteps[step];
  const isLast = step === guideSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="navigation-guide-title">
      <section className="glass ch-setup-panel w-full max-w-md overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
        <div className="flex gap-1.5 px-6 pt-6" aria-label={`Guide step ${step + 1} of ${guideSteps.length}`}>
          {guideSteps.map((item, index) => (
            <span key={item.title} className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? "bg-indigo-400" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="p-6 sm:p-8">
          <div key={step} className="ch-setup-step">
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-indigo-300/30 bg-indigo-500/15 text-xl text-indigo-200">
              <FontAwesomeIcon icon={current.icon} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{current.eyebrow}</div>
            <h2 id="navigation-guide-title" className="mt-2 text-2xl font-semibold text-white">{current.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">{current.body}</p>
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 text-xs leading-5 text-gray-400">{current.hint}</div>
          </div>
          <div className="mt-7 flex items-center justify-between gap-3">
            <button type="button" className="text-sm text-gray-400 underline-offset-4 hover:text-white hover:underline" onClick={closeGuide}>Skip guide</button>
            <div className="flex gap-2">
              {step > 0 && (
                <button type="button" className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm" onClick={() => setStep((value) => value - 1)}>
                  <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
              )}
              <button type="button" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm" onClick={() => isLast ? closeGuide() : setStep((value) => value + 1)}>
                {isLast ? <><FontAwesomeIcon icon={faCheck} /> Finish</> : <>Next <FontAwesomeIcon icon={faArrowRight} /></>}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
