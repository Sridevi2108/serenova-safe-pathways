import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, PhoneOutgoing } from 'lucide-react';
// --- CORRECTED IMPORT ---
import * as Tone from 'tone';
// --- END CORRECTION ---

// Define the possible states of the simulated call
type CallPhase = 'idle' | 'ringing' | 'answered' | 'ended';

interface DummyCallUIProps {
  numberToCall: number | null; // The number being "called"
  onEndCall: () => void;      // Function to call when "Hang Up" is clicked
}

const DummyCallUI: React.FC<DummyCallUIProps> = ({ numberToCall, onEndCall }) => {
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [callDuration, setCallDuration] = useState(0);
  // Use specific Tone.js types if desired, or 'any' for simplicity if types cause issues
  const toneSynth = useRef<Tone.Synth | null>(null);
  const toneLoop = useRef<Tone.Loop | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Sound Effect Logic ---
  const startRingingSound = async () => {
    // Ensure Tone.js context is started by user interaction
    if (Tone.context.state !== 'running') {
        try {
            await Tone.start();
            console.log('Tone.js context started.');
        } catch (e) {
            console.error('Could not start Tone.js context:', e);
        }
    }

    // Proceed only if context is running
    if (Tone.context.state === 'running') {
        // Create a simple synth if it doesn't exist
        if (!toneSynth.current) {
            toneSynth.current = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
            }).toDestination();
        }

        // Stop any previous loop
        if (toneLoop.current) {
            toneLoop.current.stop(0);
            toneLoop.current.dispose();
            toneLoop.current = null;
        }

        // Create a ringing pattern loop
        toneLoop.current = new Tone.Loop(time => {
            if (toneSynth.current) {
                toneSynth.current.triggerAttackRelease('G5', '8n', time);
                toneSynth.current.triggerAttackRelease('G5', '8n', time + Tone.Time('8n').toSeconds() + 0.05);
            }
        }, '2s');

        toneLoop.current.start(0);
        Tone.Transport.start();
        console.log('Ringing sound started.');
    } else {
        console.log('Tone.js context not running, skipping sound.');
    }
  };

  const stopRingingSound = () => {
    if (toneLoop.current) {
      toneLoop.current.stop(0);
      toneLoop.current.dispose();
      toneLoop.current = null;
      console.log('Ringing sound stopped.');
    }
    if (Tone.Transport.state === 'started') {
        Tone.Transport.stop();
    }
    // Optional: Dispose synth
    // if (toneSynth.current) {
    //     toneSynth.current.dispose();
    //     toneSynth.current = null;
    // }
  };

  // --- Call State and Timer Logic ---
  useEffect(() => {
    const cleanup = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
        stopRingingSound();
        setCallPhase('idle');
    };

    if (numberToCall !== null) {
      setCallPhase('ringing');
      setCallDuration(0);
      startRingingSound();

      ringTimeoutRef.current = setTimeout(() => {
        stopRingingSound();
        setCallPhase('answered');

        timerIntervalRef.current = setInterval(() => {
          setCallDuration(prevDuration => prevDuration + 1);
        }, 1000);

      }, 5000); // Ring for 5 seconds

    } else {
      cleanup();
    }

    return cleanup;

  }, [numberToCall]);

  // --- Hang Up Logic ---
  const handleHangUp = () => {
    setCallPhase('ended');
    stopRingingSound();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    onEndCall();
  };

  // Format duration into MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Don't render if idle/ended
  if (callPhase === 'idle' || callPhase === 'ended' || numberToCall === null) {
    return null;
  }

  // --- Render the UI based on the current phase ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-700 via-gray-800 to-black p-6 sm:p-8 rounded-lg shadow-xl text-white text-center max-w-sm w-full">

        {/* Icon and Status Text */}
        {callPhase === 'ringing' && (
          <>
            <PhoneOutgoing className="h-10 w-10 text-blue-400 mx-auto mb-4 animate-pulse" />
            <p className="text-lg font-medium text-gray-300 mb-2">Ringing...</p>
          </>
        )}
        {callPhase === 'answered' && (
          <>
            <PhoneOutgoing className="h-10 w-10 text-green-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-green-400 mb-2">Connected</p>
          </>
        )}

        {/* Number being called */}
        <p className="text-3xl sm:text-4xl font-bold mb-4 tracking-wider">{numberToCall}</p>

        {/* Call duration timer (only show when answered) */}
        <p className={`text-lg text-gray-400 mb-8 ${callPhase !== 'answered' ? 'opacity-0' : ''}`}>
            {formatDuration(callDuration)}
        </p>

        {/* Hang Up Button */}
        <button
          onClick={handleHangUp}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors duration-200"
          aria-label="End Call"
        >
          <PhoneOff className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
};

export default DummyCallUI;
