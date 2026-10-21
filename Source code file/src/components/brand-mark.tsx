import NextImage from "next/image";

/** The Grant Thornton pinwheel mark — transparent background, safe on any surface. */
export function BrandMark({
  size = 28,
  priority = false,
}: {
  size?: number;
  priority?: boolean;
}) {
  return (
    <NextImage
      src="/brand/grant-thornton-mark.png"
      alt="Grant Thornton"
      width={size}
      height={size}
      priority={priority}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

/** The full Grant Thornton lockup (mark + wordmark) — has dark text baked in, so only use on guaranteed-light surfaces. */
export function BrandLogo({
  width = 140,
  priority = false,
}: {
  width?: number;
  priority?: boolean;
}) {
  const height = Math.round(width * (73 / 248));
  return (
    <NextImage
      src="/brand/grant-thornton-logo.png"
      alt="Grant Thornton"
      width={width}
      height={height}
      priority={priority}
      style={{ width, height, objectFit: "contain" }}
    />
  );
}
