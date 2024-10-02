'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';

const SuccessPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main page after 5 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => clearTimeout(timer); // Cleanup the timer on unmount
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <h1 className="text-4xl font-bold mb-4">Thank You!</h1>
      <p className="text-lg mb-4">Your payment was successful. You will be redirected shortly.</p>
      <p className="text-sm">If you are not redirected, click <a href="/" className="text-blue-400">here</a>.</p>
    </div>
  );
};

export default SuccessPage;
