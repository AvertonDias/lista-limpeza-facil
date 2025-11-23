import React from 'react';
import Image from 'next/image';

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <Image
      src="/images/placeholder-icon.png"
      alt="Logo Lista Fácil"
      width={100}
      height={100}
      priority
    />
  );
}
