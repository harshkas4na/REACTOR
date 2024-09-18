"use client";
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
});

const Mermaid = ({ chart }) => {
  const mermaidRef = useRef(null);

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.render('mermaid', chart, (svgCode) => {
        mermaidRef.current.innerHTML = svgCode;
      });
    }
  }, [chart]);

  return <div ref={mermaidRef} />;
};

export default Mermaid;