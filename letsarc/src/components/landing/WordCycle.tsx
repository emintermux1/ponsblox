"use client";

import { useEffect, useState } from "react";

const WORDS = ["launch", "mint", "live"];

export function WordCycle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return <span className="cycle">{WORDS[index]}</span>;
}
