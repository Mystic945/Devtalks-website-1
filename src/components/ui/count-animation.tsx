"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

interface CountAnimationProps {
  number: number;
  className?: string;
  duration?: number;
  suffix?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "b" | "div";
}

function CountAnimation({
  number,
  className,
  duration = 2,
  suffix = "",
  as = "h1",
}: CountAnimationProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => `${Math.round(latest)}${suffix}`);

  useEffect(() => {
    if (isInView) {
      const animation = animate(count, number, {
        duration,
        ease: "easeOut",
      });

      return animation.stop;
    }
  }, [isInView, count, number, duration]);

  const Component = (motion[as] ?? motion.h1) as typeof motion.h1;

  return (
    <Component ref={ref as React.Ref<HTMLHeadingElement>} className={cn(className)}>
      {rounded}
    </Component>
  );
}

export { CountAnimation };
