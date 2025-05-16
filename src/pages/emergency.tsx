import React, { useState } from 'react'; // Import useState
import EmergencyNums from './emergencynums'; // Adjust the path if needed
import Layout from '../components/Layout'; // Assuming you have a Layout component
import DummyCallUI from './DummyCallUI'; // Import the new component

const Emergency: React.FC = () => {
  // Define the list of emergency contacts and their numbers
  const emergencyNumbersList: [string, number][] = [
    ["Women Helpline", 1091],
    ["Senior Citizen Helpline", 14567],
    ["Child Abuse Helpline", 1098],
    ["Police", 100],
    ["Fire", 101],
    ["Ambulance", 102],
    ["Traffic Police", 103],
    ["Health", 104],
    ["Disaster Management", 108],
    ["Railway", 131],
    ["Domestic Abuse", 181],
    ["Anti-Corruption", 1031],
    ["Road Accident", 1073],
    ["Anti-Terror", 1090]
  ];

  // --- State for managing the dummy call UI ---
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [callingNumber, setCallingNumber] = useState<number | null>(null);
  // --- End State ---

  // --- Function called by EmergencyNums to START the dummy call ---
  const handleInitiateCall = (number: number) => {
    console.log(`Simulating call to: ${number}`);
    setCallingNumber(number);
    setIsCalling(true); // Show the dummy UI
  };
  // --- End Start Call Function ---

  // --- Function called by DummyCallUI to END the dummy call ---
  const handleEndCall = () => {
    console.log("Ending simulated call.");
    setIsCalling(false); // Hide the dummy UI
    setCallingNumber(null);
  };
  // --- End End Call Function ---

  return (
    <Layout showNavbar={true}>
      <div className="flex flex-col gap-6 md:gap-8 my-6 md:my-8 px-4 relative"> {/* Added relative positioning */}
        <h1 className="text-center text-2xl sm:text-3xl font-bold text-serenova-800">
          📞 EMERGENCY / HELPLINE NUMBERS 📞
        </h1>
        <div className="flex justify-center items-start p-2 sm:p-4">
          {/* Pass the handleInitiateCall function down as a prop */}
          <EmergencyNums nums={emergencyNumbersList} onInitiateCall={handleInitiateCall} />
        </div>

        {/* --- Conditionally render the Dummy Call UI --- */}
        {/* It will only be visible when isCalling is true */}
        <DummyCallUI numberToCall={callingNumber} onEndCall={handleEndCall} />
        {/* --- End Conditional Rendering --- */}

      </div>
    </Layout>
  );
};

export default Emergency;
