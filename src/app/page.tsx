'use client';
import React, { useState } from 'react';
import HeroSection from './components/HeroSection';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleHeroSubmit = (goal: string) => {
    setIsNavigating(true);
    router.push(`/survey?goal=${encodeURIComponent(goal)}`);
  };

  return (
    <HeroSection onSubmit={handleHeroSubmit} isLoading={isNavigating} />
  );
}
