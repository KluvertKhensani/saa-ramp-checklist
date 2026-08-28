import { createElement } from "react";

export default function AppLogo({
  className = "",
  alt = "South African Airways",
}) {
  const logoUrl =
    `${import.meta.env.BASE_URL}saa-logo.svg`;

  return createElement("img", {
    src: logoUrl,
    className,
    alt,
    loading: "eager",
    decoding: "async",
  });
}