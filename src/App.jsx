import { useState, useEffect, useRef } from "react";
import FlipClock from "./FlipClock";
import confetti from "canvas-confetti";
import useSound from 'use-sound';

import "./App.css";

function getBannerDisplay(periodName) {
  switch (periodName) {
    case "Long Pomodoro":
      return { image: "/20.png", label: "" };
    case "Short Break":
      return { image: "/21.png", label: "" };
    case "Long Break":
      return { image: "/22.png", label: "" };
    default:
      return { image: "/scroll2.png", label: periodName };
  }
}



function App() {

  const alarmRef = useRef(new Audio("/alarm.mp3"));
  const celebrationRef = useRef(new Audio("/final-party.mp3")); // replace with your sound
  const [showFinalPopup, setShowFinalPopup] = useState(false);
  
  const hoverSound = '/assets/hover.mp3';
  const startSound = "/assets/start.mp3";

  const [playHover] = useSound(hoverSound, { volume: 0.5 });
  const [letsGo] = useSound(startSound, { volume: 0.5 });

  
  // Core UI states
  const [isBlurring, setIsBlurring] = useState(false);
  const [isStarted, setIsStarted] = useState(false); // true when timer type is shown or timer started
  const [isCleared, setIsCleared] = useState(false); // true when a timer type has been chosen (popup or balloons are visible)
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [lastValidPeriod, setLastValidPeriod] = useState(null);

  // Timer inputs and saved timers
  const [timers, setTimers] = useState([
    { id: Date.now(), name: "Period", hours: "00", minutes: "00", seconds: "00" }
  ]);
  
  const [timerName, setTimerName] = useState("");
  const [savedTimers, setSavedTimers] = useState(() => {
    const stored = localStorage.getItem("savedTimers");
    return stored ? JSON.parse(stored) : [];
  });
  useEffect(() => {
    localStorage.setItem("savedTimers", JSON.stringify(savedTimers));
  }, [savedTimers]);

  const [isFloatingVisible, setIsFloatingVisible] = useState(false);

  // Balloon selection states
  const [selectedBalloon, setSelectedBalloon] = useState(null);
  const [isBalloonVisible, setIsBalloonVisible] = useState(true);
  const [isBalloonHighlighted, setIsBalloonHighlighted] = useState(false);

  // New state for cycling periods
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(0);

  // Timer countdown target (milliseconds timestamp)
  const [targetTime, setTargetTime] = useState(null);

  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null); // milliseconds left

  const [showNoTimersPopup, setShowNoTimersPopup] = useState(false);


  const handleStart = () => {
    // 🔇 Stop celebration music if still playing
    const celebration = celebrationRef.current;
    celebration.pause();
    celebration.currentTime = 0;
    if (confetti.reset) confetti.reset();

    if (!isBlurring && !isStarted && !isCleared) {
      // INITIAL PHASE: Blur background and show timer type buttons
      setIsBlurring(true);
      setTimeout(() => {
        setIsStarted(true);
      }, 500);
    } else if (isCleared && !isStarted && isBalloonHighlighted) {
      // FINAL PHASE: Finalize selection, hide balloons, and start the timer for the current period
      setIsStarted(true);
      setIsCleared(true);
      setIsBalloonVisible(false);
      setIsBlurring(false); 
      startSelectedTimer();
    }
  };

  const goToNextPeriod = () => {
  // 🔇 Stop any audio
  alarmRef.current.pause();
  alarmRef.current.currentTime = 0;
  celebrationRef.current.pause();
  celebrationRef.current.currentTime = 0;

  // 🧠 Check if this is the final period
  let isLastPeriod = false;

  if (selectedBalloon === -1) {
    isLastPeriod = currentPeriodIndex === standardPomodoroPeriods.length - 1;
  } else {
    const selected = savedTimers.find((t) => t.id === selectedBalloon);
    if (selected && selected.periods) {
      isLastPeriod = currentPeriodIndex === selected.periods.length - 1;
    }
  }

  if (isLastPeriod) {
    // 🎉 Trigger celebration manually!
    confetti({
      particleCount: 300,
      spread: 120,
      origin: { y: 0.6 }
    });

    const alarm = alarmRef.current;
    const celebration = celebrationRef.current;
    const bark = barkRef.current;
  
    [alarm, bark].forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
   
    celebration.play().catch(err =>
      console.warn("Final audio blocked (manual skip):", err)
    );

  
    setDroppedChihuahuas([]);
    setCurrentPeriodIndex(0);
    setLastValidPeriod(null);
  
    // 🔁 THESE are key to returning to the original selection screen:
    setSelectedBalloon(null);       // Reset Pomodoro/Custom mode
    setIsStarted(false);            // Return to intro/start screen
    setIsCleared(false);            // Show the balloons/options again
  

    setShowFinalPopup(true);

    setTargetTime(null); // stop the clock just in case
    setRemainingTime(null);
    setIsPaused(false);
  } else {
    // Just go to next period normally
    setCurrentPeriodIndex((prev) => prev + 1);
  }
};

  
  const startTimerOver = () => {
    // 🔇 Stop all sounds
    const alarm = alarmRef.current;
    const celebration = celebrationRef.current;
    const bark = barkRef.current;
  
    [alarm, celebration, bark].forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
  
    // 🧼 Reset all app state
    setTargetTime(null);
    setRemainingTime(null);
    setIsPaused(false);
    setDroppedChihuahuas([]);
    setShowFinalPopup(false);
    setCurrentPeriodIndex(0);
    setLastValidPeriod(null);
  
    // 🔁 THESE are key to returning to the original selection screen:
    setSelectedBalloon(null);       // Reset Pomodoro/Custom mode
    setIsStarted(false);            // Return to intro/start screen
    setIsCleared(false);            // Show the balloons/options again
  };
  
 
  
 /* useEffect(() => {
    const stored = localStorage.getItem("savedTimers");
    if (stored) {
      setSavedTimers(JSON.parse(stored));
    }
  }, []);
  */

  



  useEffect(() => {
    console.log("Balloon highlighted:", isBalloonHighlighted);
  }, [isBalloonHighlighted]);

  // Call startSelectedTimer when currentPeriodIndex changes
  useEffect(() => {
    const period = getCurrentPeriod();
    if (period) startSelectedTimer();
  }, [currentPeriodIndex]);
  
  useEffect(() => {
    if (isCleared && savedTimers.length > 0 && !isStarted) {
      setIsBalloonVisible(true);
    } else {
      setIsBalloonVisible(false);
    }
  }, [isCleared, savedTimers, isStarted]);

  useEffect(() => {
    if (selectedBalloon === -1 && isCleared && isStarted) {
      startSelectedTimer();
    }
  }, [selectedBalloon, isCleared, isStarted]);
  
  useEffect(() => {
    if (!targetTime || isPaused) return;
  
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
  
      if (diff <= 0) {
        clearInterval(interval); // Stop the timer
        setRemainingTime(0);     // Visually reset
  
        let isLastPeriod = false;
        if (selectedBalloon === -1) {
          isLastPeriod = currentPeriodIndex === standardPomodoroPeriods.length - 1;
        } else {
          const selected = savedTimers.find((t) => t.id === selectedBalloon);
          if (selected && selected.periods) {
            isLastPeriod = currentPeriodIndex === selected.periods.length - 1;
          }
        }
  
        if (isLastPeriod) {
          confetti({
            particleCount: 300,
            spread: 120,
            origin: { y: 0.6 }
          });
  
          const celebration = celebrationRef.current;
          celebration.currentTime = 0;
          celebration.play().catch(err => console.warn("Final audio blocked:", err));
  
          setShowFinalPopup(true); // 🎉 Trigger popup
        } else {
          const audio = alarmRef.current;
          audio.currentTime = 0;
          audio.play();
  
          audio.onended = () => {
            goToNextPeriod();
          };
        }
  
        console.log("⏰ Alarm triggered!");
      }
  
      setRemainingTime(diff);
    }, 1000);
  
    return () => {
      clearInterval(interval);
      alarmRef.current.onended = null;
    };
  }, [targetTime, isPaused]);
  
  const deleteTimer = (id) => {
    setTimers((prev) => prev.filter((timer) => timer.id !== id));
  };
  
  const togglePause = () => {
    if (isPaused) {
      // ▶️ RESUME
      if (remainingTime > 0) {
        const newTarget = Date.now() + remainingTime;
        console.log("▶️ Resuming. New target:", new Date(newTarget).toLocaleTimeString());
        setTargetTime(newTarget);
        setIsPaused(false);
      }
    } else {
      // ⏸️ PAUSE — calculate immediately
      const now = Date.now();
      const diff = targetTime - now;
      setRemainingTime(diff > 0 ? diff : 0);
      setIsPaused(true);
      console.log("⏸️ Paused at:", diff);
    }
  };
  
  
  
  
  const getCurrentPeriod = () => {
    let selectedTimer;
  
    if (selectedBalloon === -1) {
      selectedTimer = { periods: standardPomodoroPeriods };
    } else if (selectedBalloon !== null) {
      selectedTimer = savedTimers.find((t) => t.id === selectedBalloon);
      if (!selectedTimer) {
        console.error("Timer not found!");
        return null;
      }
    } else {
      return null;
    }
  
    const currentPeriod = selectedTimer.periods[currentPeriodIndex];
    console.log("⏱ currentPeriod:", currentPeriod);

    if (!currentPeriod) {
      console.error("Current period not found!");
      return null;
    }
  
    return currentPeriod;
  };

  const [droppedChihuahuas, setDroppedChihuahuas] = useState([]);


  const chihuahuaXY = [
    { image: "/princesa.png", x: 926.65, y: 380.94 },
    { image: "/Chiquita.png", x: 965.61, y: 666.91 },
    { image: "/Lola.png", x: 813.19, y: 571.18 },
    { image: "/Chuy.png", x: 706.61, y: 562.99 },
    { image: "/Canela.png", x: 143.44, y: 612.70 },
    { image: "/Blanquita.png", x: 291.36, y: 582.88 },
    { image: "/Chispa.png", x: 5.43, y: 550.7 },
    { image: "/Nacho.png", x: 559.67, y: 609.18 }
  ];
  
  
  const chihuahuaDrops = chihuahuaXY.map(({ image, x, y }) => ({
    image,
    left: `${((x / 1154.67) * 100).toFixed(2)}%`,
    top: `${((y / 897.33) * 100).toFixed(2)}%`
  }));
  

  useEffect(() => {
    const bark = barkRef.current;
    bark.currentTime = 0;
    bark.play().catch((err) => console.warn("Bark blocked on auto-period:", err));
  }, [currentPeriodIndex]);
  
  
  const barkRef = useRef(new Audio("/bark.mp3"));

  const startSelectedTimer = () => {
    const bark = barkRef.current;

    if (bark.readyState >= 2) {
      bark.currentTime = 0;
      bark.play().catch((err) => console.warn("First bark blocked:", err));
    } else {
      bark.addEventListener(
        "canplaythrough",
        () => {
          bark.currentTime = 0;
          bark.play().catch((err) => console.warn("Delayed bark blocked:", err));
        },
        { once: true }
      );
      bark.load(); // preload it if not already
    }
    const currentPeriod = getCurrentPeriod(); // ✅ use your helper
    if (!currentPeriod) return;
  
    setLastValidPeriod(currentPeriod);
  
    const totalSeconds =
      (parseInt(currentPeriod.hours, 10) || 0) * 3600 +
      (parseInt(currentPeriod.minutes, 10) || 0) * 60 +
      (parseInt(currentPeriod.seconds, 10) || 0);
  
    if (totalSeconds <= 0) {
      console.warn("Timer must have positive time!");
      return;
    }
    let isLastPeriod = false;

    if (selectedBalloon === -1) {
      isLastPeriod = currentPeriodIndex === standardPomodoroPeriods.length - 1;
    } else {
      const selected = savedTimers.find((t) => t.id === selectedBalloon);
      if (selected && selected.periods) {
        isLastPeriod = currentPeriodIndex === selected.periods.length - 1;
      }
    }

    let dropConfig;
    if (isLastPeriod) {
      dropConfig = chihuahuaDrops.find(c => c.image.includes("Nacho")) || chihuahuaDrops[0];
    } else {
      const dropIndex = currentPeriodIndex % chihuahuaDrops.length;
      dropConfig = chihuahuaDrops[dropIndex];
    }

    setDroppedChihuahuas(prev => [...prev, { ...dropConfig, id: Date.now() }]);


    console.log(`▶️ Starting timer for ${currentPeriod.name}: ${totalSeconds} seconds`);
    setTargetTime(Date.now() + totalSeconds * 1000);
  };
  
  
  const selectedSavedTimer = savedTimers.find((t) => t.id === selectedBalloon);
  const currentPeriod = selectedSavedTimer?.periods?.[currentPeriodIndex] || null;
  const displayedPeriod = currentPeriod || lastValidPeriod;
  // When a timer type (Custom/Pomodoro) is chosen:
  const handleClearScreen = () => {
    setIsCleared(true);
    setTimeout(() => {
      setIsPopupOpen(true);
    }, 300);
  };

  /*const closePopup = () => {
    setIsPopupOpen(false);
    setIsBlurring(false);
  
    if (savedTimers.length > 0) {
      setIsFloatingVisible(true);
      setIsBalloonVisible(true); // ✅ Show the balloon options again!
    } else {
      setIsStarted(false);
      setIsCleared(false);
      setSelectedBalloon(null);
  
      // 👇 show the no-timers warning!
      setShowNoTimersPopup(true);
  
      // auto-close after 3 seconds
      setTimeout(() => setShowNoTimersPopup(false), 3000);
    }
  };
  */

  const closePopup = () => {
    setIsPopupOpen(false);
  
    // 🧼 Reset timer inputs
    setTimers([
      { id: 1, name: "Period", hours: "00", minutes: "00", seconds: "00" }
    ]);
  
    if (savedTimers.length === 0) {
      // 🪂 Float user into first-timer creation
      setIsStarted(false);
      setIsCleared(false);
      setSelectedBalloon(null);
      setIsBlurring(false);
      setShowNoTimersPopup(true);
  
      setTimeout(() => {
        setShowNoTimersPopup(false);
        setSelectedBalloon(null);
        setIsBalloonHighlighted(false);
        setIsCleared(true);
        setIsStarted(true);
        setIsPopupOpen(true);
      }, 3000);
    } else {
      // ✅ Restore proper state to re-enable balloon selection
      setIsStarted(false);
      setIsCleared(true);
      setIsBlurring(true);
      setIsBalloonVisible(true);
      setSelectedBalloon(null);
      setIsBalloonHighlighted(false);
    }
  };
  
  


const addTimer = () => {
  const newTimer = {
    id: Date.now(), // ✅ Use unique ID!
    name: "",
    hours: "",
    minutes: "",
    seconds: ""
  };
  setTimers([...timers, newTimer]);
};


  const saveTimer = () => {
    if (timerName.trim() === "") return;
    const lastTimer = timers[timers.length - 1];
    const hours = parseInt(lastTimer.hours, 10) || 0;
    const minutes = parseInt(lastTimer.minutes, 10) || 0;
    const seconds = parseInt(lastTimer.seconds, 10) || 0;
    if (hours === 0 && minutes === 0 && seconds === 0) {
      console.warn("Timer must have positive time!");
      return;
    }
    // Instead of storing just one period, store all "timers" as an array of periods.
    const newSavedTimer = {
      id: savedTimers.length + 1,
      name: timerName, // Overall timer set name
      periods: JSON.parse(JSON.stringify(timers))  // Array of period objects
    };
    setSavedTimers((prev) => [...prev, newSavedTimer]);
    setTimerName("");
    setIsPopupOpen(false);
    setIsFloatingVisible(true);
    setIsStarted(false);
  };

  const handleInputChange = (id, field, value) => {
    const updatedTimers = timers.map((timer) =>
      timer.id === id ? { ...timer, [field]: value } : timer
    );
    setTimers(updatedTimers);
  };

  // Get the currently selected saved timer and current period.
 
  const standardPomodoroPeriods = [
    { id: 1, name: "Long Pomodoro", hours: "00", minutes: "25", seconds: "00" },
    { id: 2, name: "Short Break",   hours: "00", minutes: "05", seconds: "00" },
    { id: 3, name: "Long Pomodoro", hours: "00", minutes: "25", seconds: "00" },
    { id: 4, name: "Short Break",   hours: "00", minutes: "05", seconds: "00" },
    { id: 5, name: "Long Pomodoro", hours: "00", minutes: "25", seconds: "00" },
    { id: 6, name: "Short Break",   hours: "00", minutes: "05", seconds: "00" },
    { id: 7, name: "Long Pomodoro", hours: "00", minutes: "25", seconds: "00" },
    { id: 8, name: "Long Break",    hours: "00", minutes: "15", seconds: "00" }
  ];
  
  /*const handlePomodoroSelect = () => {
    setTimers(standardPomodoroPeriods);
    setIsCleared(true);
   
    //setTimeout(() => {
    //  setIsPopupOpen(true);
    //}, 300);

  
      setIsStarted(true);
      setIsBalloonVisible(false);
      setIsBlurring(false); 
      startSelectedTimer();
    
  };*/

  const handlePomodoroSelect = () => {
    setTimers(standardPomodoroPeriods);
    setSelectedBalloon(-1);              // Mark as Pomodoro mode
    setIsCleared(true);
    setIsStarted(true);
    setIsBalloonVisible(false);
    setIsBlurring(false); 
    // ❌ Don't call startSelectedTimer() here!
  };
  
  const getTimeString = () => {
    const baseTime = isPaused ? remainingTime : targetTime - Date.now();
    const totalSeconds = Math.max(0, Math.floor(baseTime / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  

  
  return (
    <div className="page-container">
      {/* Background */}
      <div className={`background-container ${isBlurring ? "blurred" : ""}`}>
        <div className="app-container">
          {!(isStarted && isCleared) && (
            <div className="start-content">
              <h1 className="title">
                <span className="pomodoro">POMODORO</span>
                <br />
                <span className="puppies">PUPPIES</span>
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* Single Start Button */}
      {!isStarted && !isPopupOpen && (
        <div className="start-button-container">
          <img
            src="/animated-button.gif"
            alt="Start"
            className="start-button"
            onClick={() => {
              handleStart();
              letsGo();
            }}
          />
        </div>
      )}

      {/* Flip Clock Countdown */}
      {targetTime && (
        <>
          <div className="flip-section">
          <div className="flip-clock-container">
            <div className="flip-clock">
             <FlipClock timeString={getTimeString()} />

            </div>
          </div>

          <div className="timer-controls">
            <button className="button-style period-options" onClick={togglePause}>
              {isPaused ? "▶️ PLAY" : "⏸️ PAUSE"}
            </button>

            <button className="button-style period-options"  onClick={ startSelectedTimer}>RESTART PERIOD</button>
            <button className="button-style period-options" onClick={ startTimerOver}>NEW TIMER</button>
            <button className="button-style period-options" onClick={goToNextPeriod}>
                SKIP
              </button>
          </div>
        </div>

        </>
      )}


      {isStarted && displayedPeriod && (() => {
        const banner = getBannerDisplay(displayedPeriod.name);
        return (
          <div className="session-name-container">
            <div className="scroll-banner">
              <img src={banner.image} alt={banner.label} className="pp-img" />
              {banner.label && <span className="scroll-text-banner">{banner.label}</span>}
            </div>
          </div>
        );
      })()}



      {/* Timer type buttons */}
      {isStarted && !isCleared && (
        <>
          <div className="header-container">
            <img
              src="/scroll-banner.png"
              alt="Pick a Party!!"
              className="header-image"
            />
          </div>
          <div className="new-buttons">
            <div className="button-container">
              <div className="button-title">Custom</div>
              <img
                src="/3.png"
                alt="Custom"
                className="image-button"
                onClick={handleClearScreen}
                onMouseEnter={playHover}
              />
            </div>
            <div className="new-button1">
              <div className="button-title pomodoro-title">Pomodoro</div>
              <img
                src="/4.png"
                alt="Pomodoro"
                className="image-button"
                onClick={handlePomodoroSelect}
                onMouseEnter={playHover}
              />
            </div>

          </div>
        </>
      )}

      {/* Popup Menu */}
      {isPopupOpen && (
    <div className="popup-menu active">
          <div className="add-exit-container">
            <input
              type="text"
              className="input-field timer-name-input"
              placeholder="Timer Name"
              value={timerName}
              onChange={(e) => setTimerName(e.target.value)}
            />
            <button className="add-timer-btn" onClick={addTimer}>
              <img src="/add.png" alt="Add Timer" />
            </button>
            <button className="close-btn" onClick={closePopup}>
              <img src="/close.png" alt="Close" />
            </button>
          </div>
          
          {timers.map((timer) => (
            <div className="timer-row-wrapper" key={timer.id}>
              <div className="timer-inputs">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Period Name"
                  value={timer.name}
                  onChange={(e) => handleInputChange(timer.id, "name", e.target.value)}
                />
                <input
                  type="text"
                  className="timer-input"
                  placeholder="HH"
                  value={timer.hours}
                  onChange={(e) => handleInputChange(timer.id, "hours", e.target.value)}
                />
                <input
                  type="text"
                  className="timer-input"
                  placeholder="MM"
                  value={timer.minutes}
                  onChange={(e) => handleInputChange(timer.id, "minutes", e.target.value)}
                />
                <input
                  type="text"
                  className="timer-input"
                  placeholder="SS"
                  value={timer.seconds}
                  onChange={(e) => handleInputChange(timer.id, "seconds", e.target.value)}
                />
                <button className="delete-timer-btn" onClick={() => deleteTimer(timer.id)}>
                  <img src="/delete-icon.png" alt="Delete" />
                </button>

              </div>
            </div>
          ))}

          
          <button className="save-button" onClick={saveTimer}>
            <img src="/save-button.png" alt="Save" />
          </button>
        </div>
      )}

      { (isPopupOpen || (isBalloonVisible && selectedBalloon !== -1)) && (
        <button
          className="floating-add-btn visible"
          onClick={() => setIsPopupOpen(true)}
        >
          <img src="/add.png" alt="Add Timer" />
          <span>Add Timer</span>
        </button>
      )}


      

      {/* Balloon Selection */}
      
      {isCleared && savedTimers.length > 0 && ! isStarted && (
       
       <div className="balloon-container">
        {savedTimers.map((timer) => (
            <div
              key={timer.id}
              className={`balloon 
                ${selectedBalloon === timer.id ? "selected floating" : ""}`}
              onClick={() => {  
                setSelectedBalloon(timer.id);
                setIsBalloonHighlighted(true);
                setIsBlurring(true);
                console.log("Selected Balloon:", timer);
              }}
            >
        
              {/* 1) A wrapper for the scroll image and text, absolutely positioned above the balloon */}
              <div className="balloon-label-wrapper">
                {/* 2) The label container is relative */}
                <div className="balloon-label">
                  <img src="/scroll.png" alt="Scroll" className="scroll-img" />
                  <span className="scroll-text">{timer.name}</span>
                </div>
              </div>
              
              {/* The balloon itself */}
              <img src="/balloon.png" alt={timer.name} className="balloon-image" />
            </div>
          ))}
        </div>

      )}

    <div className="chihuahua-zone">
        {droppedChihuahuas.map(({ id, image, left, top }) => (
          <img
            key={id}
            src={image}
            className="chihuahua"
            style={{ left, top }}
            alt={`chihuahua-${id}`}
          />
        ))}
    </div>

    {showFinalPopup && (
      <div className="final-popup">
        <div className="final-popup-content">
          <img src="/nacho-party.png" alt="Party Nacho" className="final-popup-img" />
          <h2>🎉 You did it! 🎉</h2>
          <p>All your sessions are complete. Time to celebrate!</p>
          <button onClick={() => setShowFinalPopup(false)} className="popup-close-btn">YAY!</button>
        </div>
      </div>
    )}
    {showNoTimersPopup && (
      <div className="no-timers-popup">
        <div className="no-timers-content">
          <img src="/sad-balloon.png" alt="No Timers Yet" className="no-timers-img" />
          <p>You don’t have any timers yet!</p>
          <p>(Now let's float you right on back...)</p>
          <p>(...Please wait...)</p>
        </div>
      </div>
    )}


  </div>
  );


}

export default App;
