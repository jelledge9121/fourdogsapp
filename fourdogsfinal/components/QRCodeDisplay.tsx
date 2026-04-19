"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QRCodeDisplay() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/checkin`;

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl">
      <QRCodeSVG
        value={url || "https://example.com/checkin"}
        size={160}
        bgColor="#ffffff"
        fgColor="#0a0a0f"
        level="M"
      />
      <span className="text-brand-black font-body text-xs font-semibold tracking-wide">
        SCAN TO CHECK IN
      </span>
    </div>
  );
}
