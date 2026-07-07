import React, { useState, useEffect } from 'react';

/**
 * Isolated local digital clock component.
 * Limits the 1-second interval ticks to this component only, preventing unnecessary re-renders of the KDS columns.
 */
export default function KitchenClock() {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (timestamp) => {
        const d = new Date(timestamp);
        let hrs = d.getHours();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12;
        hrs = hrs ? hrs : 12;
        const hrsStr = String(hrs).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const secs = String(d.getSeconds()).padStart(2, '0');
        return `${hrsStr}:${mins}:${secs} ${ampm}`;
    };

    const formatDate = (timestamp) => {
        const d = new Date(timestamp);
        const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
        const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    };

    return (
        <div className="flex flex-col text-center select-none justify-center items-center w-full">
            <span className="text-xl md:text-4xl font-black tracking-tight text-[var(--primary)] font-sans leading-none">
                {formatTime(currentTime)}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase mt-1">
                {formatDate(currentTime)}
            </span>
        </div>
    );
}
