"use client";

import Image from "next/image";
import { useState } from "react";

import { cn, hueFromString } from "@/lib/utils";

type ArticleImageProps = {
  src: string | null;
  alt: string;
  seed: string;
  className?: string;
  priority?: boolean;
};

/**
 * Article thumbnail with a deterministic gradient fallback.
 *
 * Publishers routinely return null images or URLs that 404, so the fallback is
 * the normal path rather than an edge case. v1 pointed a broken image at a
 * relative placeholder path, which itself broke on nested routes and could loop
 * if the placeholder failed too. Here the fallback is painted, not fetched.
 */
export function ArticleImage({
  src,
  alt,
  seed,
  className,
  priority = false,
}: ArticleImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  if (showFallback) {
    const hue = hueFromString(seed);
    return (
      <div
        aria-hidden="true"
        className={cn("flex size-full items-center justify-center", className)}
        style={{
          // Low chroma on purpose: the placeholder has to recede behind the
          // headline, not compete with it. Hue still varies per article so a
          // grid of them stays visually distinguishable.
          backgroundImage: `linear-gradient(135deg,
            oklch(0.78 0.055 ${hue}) 0%,
            oklch(0.63 0.07 ${(hue + 40) % 360}) 100%)`,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-10 opacity-25"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 9.5h6M7 13h10M7 16h10" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={cn("object-cover", className)}
      priority={priority}
      onError={() => setFailed(true)}
      unoptimized={src.startsWith("data:")}
    />
  );
}
