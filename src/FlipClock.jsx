import FlipDigit from "./FlipDigit";

export default function FlipClock({ timeString }) {
  return (
    <div className="flip-clock">
      {timeString.split("").map((char, idx) =>
        char === ":" ? (
          <span key={idx} className="fcc-colon">:</span>
        ) : (
          <FlipDigit key={idx} value={char} />
        )
      )}
    </div>
  );
}
