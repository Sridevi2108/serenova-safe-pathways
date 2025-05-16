import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, PhoneOutgoing } from 'lucide-react';
// Assuming Tone.js is available globally via CDN or imported via npm/yarn
// import * as Tone from 'tone'; // Example import if using npm/yarn

// ... (other parts of the component) ...

const DummyCallUI: React.FC<DummyCallUIProps> = ({ numberToCall, onEndCall }) => {
  // ... (state variables: callPhase, callDuration) ...
  const toneSynth = useRef<any>(null); // To hold the synthesizer instance
  const toneLoop = useRef<any>(null);  // To hold the looping event
  // ... (other refs: timerIntervalRef, ringTimeoutRef) ...

  // --- Sound Effect Logic ---
  const startRingingSound = async () => {
    // 1. Ensure Tone.js AudioContext is running (needs user interaction first)
    if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
        try {
            await Tone.start(); // Attempt to start the audio context
            console.log('Tone.js context started.');
        } catch (e) {
            console.error('Could not start Tone.js context:', e);
        }
    }

    // 2. Proceed only if Tone is available and context is running
    if (typeof Tone !== 'undefined' && Tone.context.state === 'running') {
        // 3. Create a Synthesizer if it doesn't exist
        if (!toneSynth.current) {
            toneSynth.current = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
            }).toDestination(); // Connect synth output to speakers
        }

        // 4. Stop any previous loop to avoid overlap
        if (toneLoop.current) {
            toneLoop.current.stop(0);
            toneLoop.current.dispose();
        }

        // 5. Create the Ringing Loop
        toneLoop.current = new Tone.Loop(time => {
            // Schedule the synth to play notes within the loop
            toneSynth.current?.triggerAttackRelease('G5', '8n', time); // Note G5, 1/8th note duration
            // Play again shortly after for a double-ring effect
            toneSynth.current?.triggerAttackRelease('G5', '8n', time + Tone.Time('8n').toSeconds() + 0.05);
        }, '2s'); // Loop repeats every 2 seconds

        // 6. Start the loop and the main Tone.js timer (Transport)
        toneLoop.current.start(0);
        Tone.Transport.start();
        console.log('Ringing sound started.');
    } else {
        console.log('Tone.js not available or context not running, skipping sound.');
    }
  };

  const stopRingingSound = () => {
    // 7. Stop the loop and the Transport when needed
    if (toneLoop.current) {
      toneLoop.current.stop(0);
      console.log('Ringing sound stopped.');
    }
     if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
    }
  };

  // --- Call State and Timer Logic ---
  useEffect(() => {
    const cleanup = () => {
        // ... (clear timers) ...
        stopRingingSound(); // Make sure sound stops on cleanup
        setCallPhase('idle');
    };

    if (numberToCall !== null) {
      setCallPhase('ringing');
      setCallDuration(0);
      startRingingSound(); // Start sound when ringing phase begins

      // Simulate ringing duration
      ringTimeoutRef.current = setTimeout(() => {
        stopRingingSound(); // Stop sound when "answered"
        setCallPhase('answered');
        // ... (start duration timer) ...
      }, 5000); // Ring for 5 seconds

    } else {
      cleanup();
    }
    return cleanup;
  }, [numberToCall]);

  // ... (rest of the component: handleHangUp, formatDuration, render logic) ...

};

export default DummyCallUI;
