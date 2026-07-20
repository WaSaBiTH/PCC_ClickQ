"use client";

import React, { useState } from "react";
import Link, { LinkProps } from "next/link";

interface ClientLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  loaderClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function ClientLink({ children, className = "", loaderClassName = "w-4 h-4 mr-2 animate-spin", onClick, ...props }: ClientLinkProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    // If it's a real navigation to a different URL (not an anchor link)
    if (typeof props.href === 'string' && props.href.startsWith('/') && !props.href.startsWith('/#')) {
      setIsNavigating(true);
    }
  };

  return (
    <Link {...props} onClick={handleClick} className={`${className} ${isNavigating ? 'opacity-70 pointer-events-none justify-center' : ''}`}>
      {isNavigating ? (
        <svg className={loaderClassName.replace('mr-2', '')} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      ) : (
        children
      )}
    </Link>
  );
}
