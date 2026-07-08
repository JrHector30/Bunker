import React from 'react';

const DeleteButton = ({ onClick, title = "Eliminar", className = "", ...props }) => {
    return (
        <button
            onClick={onClick}
            type="button"
            title={title}
            className={`group relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-red-800/60 bg-red-500/80 hover:bg-red-600 transition-all duration-300 shadow-md active:scale-95 cursor-pointer shrink-0 ${className}`}
            {...props}
        >
            {/* Elemento que cae (Desecho/Engranaje) */}
            <svg
                viewBox="0 0 1.625 1.625"
                className="absolute -top-7 fill-white delay-100 group-hover:top-3 group-hover:animate-[spin_1.4s] group-hover:duration-1000 transition-all"
                height={12}
                width={12}
            >
                <path d="M.471 1.024v-.52a.1.1 0 0 0-.098.098v.618c0 .054.044.098.098.098h.487a.1.1 0 0 0 .098-.099h-.39c-.107 0-.195 0-.195-.195" />
                <path d="M1.219.601h-.163A.1.1 0 0 1 .959.504V.341A.033.033 0 0 0 .926.309h-.26a.1.1 0 0 0-.098.098v.618c0 .054.044.098.098.098h.487a.1.1 0 0 0 .098-.099v-.39a.033.033 0 0 0-.032-.033" />
                <path d="m1.245.465-.15-.15a.02.02 0 0 0-.016-.006.023.023 0 0 0-.023.022v.108c0 .036.029.065.065.065h.107a.023.023 0 0 0 .023-.023.02.02 0 0 0-.007-.016" />
            </svg>

            {/* Tapa del tacho (Gira 90 grados) */}
            <svg
                width={14}
                fill="none"
                viewBox="0 0 39 7"
                className="origin-right duration-500 group-hover:rotate-90 relative z-10"
            >
                <line strokeWidth={4} stroke="white" y2={5} x2={39} y1={5} />
                <line strokeWidth={3} stroke="white" y2="1.5" x2="26.0357" y1="1.5" x1={12} />
            </svg>

            {/* Cuerpo del tacho de basura */}
            <svg
                width={14}
                fill="none"
                viewBox="0 0 33 39"
                className="mt-0.5 relative z-10"
            >
                <mask fill="white" id="path-tacho-inside">
                    <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" />
                </mask>
                <path mask="url(#path-tacho-inside)" fill="white" d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z" />
                <path strokeWidth={4} stroke="white" d="M12 6L12 29" />
                <path strokeWidth={4} stroke="white" d="M21 6V29" />
            </svg>
        </button>
    );
};

export { DeleteButton };
export default DeleteButton;