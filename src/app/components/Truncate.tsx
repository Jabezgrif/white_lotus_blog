"use client";

export default function Truncate({ text = "", maxLength = 50, className = "" }) {
  if (!text) return null;

  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  const shortenedText = text.slice(0, maxLength);

  return (
    <span title={text} className={className}>
      {shortenedText}…
    </span>
  );
}
