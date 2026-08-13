"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faCheck, faImage, faLocationDot, faShieldHalved, faUpload, faUser, faXmark } from "@fortawesome/free-solid-svg-icons";

type AccountSetupModalProps = {
  username: string;
  onComplete: () => void;
  onCancel: () => void;
};

type SetupPhase = "hello" | "steps" | "enjoy";
type CropImage = { url: string; width: number; height: number; name: string };

const CROP_SIZE = 240;

export default function AccountSetupModal({ username, onComplete, onCancel }: AccountSetupModalProps) {
  const [phase, setPhase] = useState<SetupPhase>("hello");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cropImage, setCropImage] = useState<CropImage | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const [profile, setProfile] = useState({
    displayName: username,
    pronouns: "",
    avatarUrl: "",
    bio: "",
    location: "",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("steps"), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (cropImage) URL.revokeObjectURL(cropImage.url);
  }, [cropImage]);

  const updateProfile = (field: keyof typeof profile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const cropBounds = (image: CropImage, zoom: number) => {
    const baseScale = Math.max(CROP_SIZE / image.width, CROP_SIZE / image.height);
    const width = image.width * baseScale * zoom;
    const height = image.height * baseScale * zoom;
    return { width, height, maxX: Math.max(0, (width - CROP_SIZE) / 2), maxY: Math.max(0, (height - CROP_SIZE) / 2) };
  };

  const clampOffset = (next: { x: number; y: number }, image = cropImage, zoom = cropZoom) => {
    if (!image) return { x: 0, y: 0 };
    const bounds = cropBounds(image, zoom);
    return {
      x: Math.max(-bounds.maxX, Math.min(bounds.maxX, next.x)),
      y: Math.max(-bounds.maxY, Math.min(bounds.maxY, next.y)),
    };
  };

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file to continue.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Choose an image smaller than 12 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setCropImage({ url, width: image.naturalWidth, height: image.naturalHeight, name: file.name });
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That image could not be opened.");
    };
    image.src = url;
  };

  const uploadCroppedAvatar = async () => {
    if (!cropImage) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const outputSize = 512;
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not crop this image.");
      const source = new Image();
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve();
        source.onerror = () => reject(new Error("That image could not be opened."));
        source.src = cropImage.url;
      });
      const bounds = cropBounds(cropImage, cropZoom);
      const outputScale = outputSize / CROP_SIZE;
      context.drawImage(
        source,
        ((CROP_SIZE - bounds.width) / 2 + cropOffset.x) * outputScale,
        ((CROP_SIZE - bounds.height) / 2 + cropOffset.y) * outputScale,
        bounds.width * outputScale,
        bounds.height * outputScale,
      );
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
      if (!blob) throw new Error("Your browser could not crop this image.");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("The cropped image could not be read."));
        reader.readAsDataURL(blob);
      });
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cropImage.name.replace(/\.[^.]+$/, "") + "-avatar.webp", data, type: "image/webp" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || "The avatar upload failed.");
      updateProfile("avatarUrl", result.url);
      setCropImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The avatar upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const finishSetup = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "We could not save your profile.");
      }
      const completionResponse = await fetch("/api/complete-registration", { method: "POST" });
      if (!completionResponse.ok) {
        const completionData = await completionResponse.json().catch(() => ({}));
        throw new Error(completionData.error || "Account setup could not be completed.");
      }
      setPhase("enjoy");
      window.setTimeout(onComplete, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your profile.");
      setSaving(false);
    }
  };

  const cancelAccountCreation = async () => {
    setCancelling(true);
    setError("");
    try {
      const response = await fetch("/api/cancel-registration", { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The account could not be cancelled.");
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The account could not be cancelled.");
      setCancelling(false);
      setCancelConfirmOpen(false);
    }
  };

  const steps = [
    {
      title: "What should people call you?",
      description: "Your display name is shown in conversations. Your username stays @" + username + ".",
      icon: faUser,
      content: (
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-gray-200">
            Display name
            <input
              className="input-dark w-full px-3 py-2.5"
              value={profile.displayName}
              maxLength={50}
              autoFocus
              onChange={(event) => updateProfile("displayName", event.target.value)}
              placeholder={username}
            />
          </label>
          <label className="grid gap-1.5 text-sm text-gray-200">
            Pronouns <span className="text-xs text-gray-400">Optional</span>
            <input
              className="input-dark w-full px-3 py-2.5"
              value={profile.pronouns}
              maxLength={40}
              onChange={(event) => updateProfile("pronouns", event.target.value)}
              placeholder="e.g. they/them"
            />
          </label>
        </div>
      ),
    },
    {
      title: "Add a profile picture",
      description: "Upload a photo, then drag and zoom it until the crop looks just right.",
      icon: faImage,
      content: (
        <div className="grid justify-items-center gap-4">
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) => {
              chooseAvatar(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {cropImage ? (
            <div className="grid w-full justify-items-center gap-4">
              <div
                className="relative cursor-grab touch-none overflow-hidden rounded-full border-2 border-indigo-300/60 bg-slate-950 shadow-[0_0_0_999px_rgba(2,6,23,0.12)] active:cursor-grabbing"
                style={{ width: CROP_SIZE, height: CROP_SIZE }}
                aria-label="Avatar crop area. Drag the image to reposition it."
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: cropOffset.x, startY: cropOffset.y };
                }}
                onPointerMove={(event) => {
                  const drag = dragRef.current;
                  if (!drag || drag.pointerId !== event.pointerId) return;
                  setCropOffset(clampOffset({ x: drag.startX + event.clientX - drag.x, y: drag.startY + event.clientY - drag.y }));
                }}
                onPointerUp={() => { dragRef.current = null; }}
                onPointerCancel={() => { dragRef.current = null; }}
              >
                <img
                  src={cropImage.url}
                  alt="Avatar crop preview"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: cropBounds(cropImage, cropZoom).width,
                    height: cropBounds(cropImage, cropZoom).height,
                    transform: `translate(-50%, -50%) translate(${cropOffset.x}px, ${cropOffset.y}px)`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/30" />
              </div>
              <label className="grid w-full gap-2 text-sm text-gray-200">
                <span className="flex justify-between"><span>Zoom</span><span className="text-gray-400">{Math.round(cropZoom * 100)}%</span></span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={cropZoom}
                  className="w-full accent-indigo-400"
                  onChange={(event) => {
                    const zoom = Number(event.target.value);
                    setCropZoom(zoom);
                    setCropOffset((current) => clampOffset(current, cropImage, zoom));
                  }}
                />
              </label>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => fileInputRef.current?.click()}>Choose another</button>
                <button type="button" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-70" disabled={uploadingAvatar} onClick={uploadCroppedAvatar}>
                  <FontAwesomeIcon icon={faCheck} /> {uploadingAvatar ? "Uploading..." : "Use this crop"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid justify-items-center gap-4">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-indigo-300/40 bg-slate-900 text-3xl text-indigo-200 shadow-lg">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile preview" className="h-full w-full object-cover" /> : <FontAwesomeIcon icon={faUser} />}
              </div>
              <button type="button" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm" onClick={() => fileInputRef.current?.click()}>
                <FontAwesomeIcon icon={faUpload} /> {profile.avatarUrl ? "Change photo" : "Upload a photo"}
              </button>
              <span className="text-xs text-gray-400">Optional · JPG, PNG, GIF, or WebP · up to 12 MB</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Tell the community a little more",
      description: "A short bio helps people get to know you. Everything here is optional.",
      icon: faLocationDot,
      content: (
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm text-gray-200">
            Bio
            <textarea
              className="input-dark min-h-24 w-full resize-none px-3 py-2.5"
              value={profile.bio}
              maxLength={280}
              onChange={(event) => updateProfile("bio", event.target.value)}
              placeholder="What are you interested in?"
            />
            <span className="text-right text-xs text-gray-400">{profile.bio.length}/280</span>
          </label>
          <label className="grid gap-1.5 text-sm text-gray-200">
            Location
            <input
              className="input-dark w-full px-3 py-2.5"
              value={profile.location}
              maxLength={80}
              onChange={(event) => updateProfile("location", event.target.value)}
              placeholder="e.g. New York"
            />
          </label>
        </div>
      ),
    },
    {
      title: "Review and agree",
      description: "Here is a short summary of the data ChitterHaven uses to provide and protect your account.",
      icon: faShieldHalved,
      content: (
        <div className="grid gap-4">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-sm leading-5 text-gray-300">
            <div><strong className="text-gray-100">Account data:</strong> your username and a securely hashed version of your password.</div>
            <div><strong className="text-gray-100">Profile data:</strong> details you choose to add, such as your display name, avatar, pronouns, bio, and location.</div>
            <div><strong className="text-gray-100">Community activity:</strong> messages, reactions, friendships, haven memberships, and settings needed to provide the service.</div>
            <div><strong className="text-gray-100">Technical data:</strong> limited session, security, and rate-limit information used to keep accounts and the community safe.</div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-300/20 bg-indigo-500/10 p-3 text-sm text-gray-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-400"
              checked={agreementAccepted}
              onChange={(event) => setAgreementAccepted(event.target.checked)}
            />
            <span>I understand this data summary and agree to create and use my ChitterHaven account.</span>
          </label>
          <p className="text-xs leading-5 text-gray-400">Only add profile information you are comfortable sharing with other community members.</p>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const canContinue = step === 0
    ? profile.displayName.trim().length > 0
    : step === 1
      ? !cropImage && !uploadingAvatar
      : step === 3
        ? agreementAccepted
      : true;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Set up your account">
      {phase === "hello" || phase === "enjoy" ? (
        <div className="ch-setup-word text-center" role="status" aria-live="polite">
          <div className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
            {phase === "hello" ? "hello" : "enjoy"}
          </div>
          <div className="mt-3 text-sm text-indigo-200/80">
            {phase === "hello" ? `Welcome, @${username}` : "Your profile is ready"}
          </div>
        </div>
      ) : (
        <section className="glass ch-setup-panel w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-cyan-300 transition-[width] duration-500"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="p-6 sm:p-8">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-200"
                onClick={() => setCancelConfirmOpen(true)}
              >
                <FontAwesomeIcon icon={faXmark} /> Cancel account creation
              </button>
            </div>
            <div className="mb-6 flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-indigo-300/30 bg-indigo-500/15 text-indigo-200">
                <FontAwesomeIcon icon={currentStep.icon} />
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Step {step + 1} of {steps.length}</div>
                <h2 className="text-xl font-semibold text-white">{currentStep.title}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-400">{currentStep.description}</p>
              </div>
            </div>

            <div key={step} className="ch-setup-step">{currentStep.content}</div>
            {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm disabled:invisible"
                disabled={step === 0 || saving}
                onClick={() => setStep((current) => current - 1)}
              >
                <FontAwesomeIcon icon={faArrowLeft} /> Back
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canContinue}
                  onClick={() => setStep((current) => current + 1)}
                >
                  Continue <FontAwesomeIcon icon={faArrowRight} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm disabled:cursor-wait disabled:opacity-70"
                  disabled={saving || !canContinue}
                  onClick={finishSetup}
                >
                  <FontAwesomeIcon icon={faCheck} /> {saving ? "Saving..." : "Finish setup"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/75 p-4" role="alertdialog" aria-modal="true" aria-labelledby="cancel-account-title">
          <div className="glass w-full max-w-sm rounded-2xl border border-red-300/20 p-5 shadow-2xl">
            <h2 id="cancel-account-title" className="text-lg font-semibold text-white">Cancel account creation?</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">This deletes the new local account <strong>@{username}</strong> and discards the profile setup. This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-ghost px-3 py-2 text-sm" disabled={cancelling} onClick={() => setCancelConfirmOpen(false)}>Keep account</button>
              <button type="button" className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-500/25 disabled:opacity-60" disabled={cancelling} onClick={cancelAccountCreation}>
                {cancelling ? "Cancelling..." : "Delete new account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
