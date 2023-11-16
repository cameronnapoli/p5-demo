'use client';

import dynamic from 'next/dynamic';

const DynamicBackground = dynamic(() => import('@/components/BackgroundP5'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="w-screen h-screen">
      <DynamicBackground />
    </main>
  )
}
