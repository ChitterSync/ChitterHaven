"use client";

import { useEffect } from "react";

export default function DeprecatedRoot() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("https://ch.chittersync.com");
    }
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      Redirecting to ChitterHaven...
    </div>
  );
}
