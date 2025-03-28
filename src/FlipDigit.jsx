import { useSpring, animated } from "@react-spring/web";
import { useEffect, useState } from "react";
import "./FlipClock.css";

export default function FlipDigit({ value }) {
  const [prevValue, setPrevValue] = useState(value);

  const shouldAnimate = prevValue !== value;

  const props = useSpring({
    from: { rotateX: shouldAnimate ? 180 : 0 },
    to: { rotateX: 0 },
    config: { tension: 170, friction: 20 },
    reset: shouldAnimate,
  });

  useEffect(() => {
    if (shouldAnimate) setPrevValue(value);
  }, [value, shouldAnimate]);

  return (
    <div className="fcc-digit-block">
      <animated.div className="fcc-digit-inner" style={props}>
        {value}
      </animated.div>
      <div className="fcc-divider" />
    </div>
  );
}
