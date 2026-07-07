import { useState, useEffect, useRef } from 'react';

class AlarmSoundPlayer {
  constructor() {
    this.ctx = null;
    this.intervalId = null;
  }

  start(soundEnabled) {
    if (this.intervalId || !soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      const playBeep = () => {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const time = this.ctx.currentTime;
        const freq = Math.floor(time) % 2 === 0 ? 880 : 660;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.05);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.25);
        gain.gain.linearRampToValueAtTime(0, time + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(time + 0.3);
      };

      playBeep();
      this.intervalId = window.setInterval(playBeep, 600);
    } catch (e) {
      console.error("Failed to start alarm sound:", e);
    }
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }
}

/**
 * Custom hook to encapsulate high-frequency localized timer and stopwatch ticks.
 * Keeps these ticking states isolated from global context to avoid re-rendering KDS columns.
 */
export default function useKitchenTimers(soundEnabled) {
  const alarmPlayerRef = useRef(new AlarmSoundPlayer());

  const [timerDigits, setTimerDigits] = useState(() => {
    return localStorage.getItem('kitchen_timer_digits') || '1530';
  });
  
  const [initialDuration, setInitialDuration] = useState(() => {
    const saved = localStorage.getItem('kitchen_timer_duration');
    return saved ? parseInt(saved, 10) : 930;
  });

  const [timerRemaining, setTimerRemaining] = useState(() => {
    const saved = localStorage.getItem('kitchen_timer_duration');
    return saved ? parseInt(saved, 10) : 930;
  });

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  // Sync values to local storage for persistence
  useEffect(() => {
    localStorage.setItem('kitchen_timer_digits', timerDigits);
  }, [timerDigits]);

  useEffect(() => {
    localStorage.setItem('kitchen_timer_duration', String(initialDuration));
  }, [initialDuration]);

  // Timer Tick effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerRemaining > 0) {
      interval = window.setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsAlarmActive(true);
            alarmPlayerRef.current.start(soundEnabled);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isTimerRunning, timerRemaining, soundEnabled]);

  // Stopwatch Tick effect
  useEffect(() => {
    let interval = null;
    if (isStopwatchRunning) {
      interval = window.setInterval(() => {
        setStopwatchTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isStopwatchRunning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      alarmPlayerRef.current.stop();
    };
  }, []);

  const handleNumpadPress = (val) => {
    if (val === '00') {
      if (timerDigits.length >= 5) return;
      setTimerDigits((prev) => (prev + '00').slice(0, 6));
    } else {
      if (timerDigits.length >= 6) return;
      setTimerDigits((prev) => prev + val);
    }
  };

  const handleNumpadClear = () => {
    setTimerDigits('');
  };

  const handleNumpadBackspace = () => {
    setTimerDigits((prev) => prev.slice(0, -1));
  };

  const handleStartTimer = () => {
    const padded = timerDigits.padStart(6, '0');
    const hh = parseInt(padded.slice(0, 2), 10);
    const mm = parseInt(padded.slice(2, 4), 10);
    const ss = parseInt(padded.slice(4, 6), 10);
    const totalSecs = hh * 3600 + mm * 60 + ss;
    if (totalSecs <= 0) return;

    setInitialDuration(totalSecs);
    setTimerRemaining(totalSecs);
    setIsTimerRunning(true);
    setIsAlarmActive(false);
  };

  const handleResetTimer = () => {
    setTimerRemaining(initialDuration);
    setIsTimerRunning(false);
    setIsAlarmActive(false);
    alarmPlayerRef.current.stop();
  };

  const handleStopAlarm = () => {
    setIsAlarmActive(false);
    alarmPlayerRef.current.stop();
    setTimerRemaining(initialDuration);
    setIsTimerRunning(false);
  };

  return {
    timerDigits,
    initialDuration,
    timerRemaining,
    isTimerRunning,
    isAlarmActive,
    setIsTimerRunning,
    stopwatchTime,
    isStopwatchRunning,
    setIsStopwatchRunning,
    setStopwatchTime,
    handleNumpadPress,
    handleNumpadClear,
    handleNumpadBackspace,
    handleStartTimer,
    handleResetTimer,
    handleStopAlarm
  };
}
