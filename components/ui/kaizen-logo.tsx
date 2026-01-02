export default function KaizenLogo({ className = "h-10 w-10" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Outer Circle - Teal */}
            <circle
                cx="50"
                cy="50"
                r="48"
                stroke="#5a9a9a"
                strokeWidth="2"
                fill="none"
            />

            {/* Network Graph - Navy Blue */}
            <g stroke="#1e3a5f" strokeWidth="1.5" fill="none">
                {/* Nodes */}
                <circle cx="30" cy="25" r="2.5" fill="#1e3a5f" />
                <circle cx="50" cy="20" r="2.5" fill="#1e3a5f" />
                <circle cx="70" cy="25" r="2.5" fill="#1e3a5f" />
                <circle cx="25" cy="45" r="2.5" fill="#1e3a5f" />
                <circle cx="50" cy="40" r="2.5" fill="#1e3a5f" />
                <circle cx="75" cy="45" r="2.5" fill="#1e3a5f" />

                {/* Connections */}
                <line x1="30" y1="25" x2="50" y2="20" />
                <line x1="50" y1="20" x2="70" y2="25" />
                <line x1="30" y1="25" x2="25" y2="45" />
                <line x1="50" y1="20" x2="50" y2="40" />
                <line x1="70" y1="25" x2="75" y2="45" />
                <line x1="25" y1="45" x2="50" y2="40" />
                <line x1="50" y1="40" x2="75" y2="45" />
            </g>

            {/* Analytics Bars - Orange */}
            <g fill="#f5a623">
                <rect x="30" y="70" width="6" height="15" rx="1" />
                <rect x="42" y="62" width="6" height="23" rx="1" />
                <rect x="54" y="55" width="6" height="30" rx="1" />
                <rect x="66" y="65" width="6" height="20" rx="1" />
            </g>

            {/* Growth Arrow - Teal */}
            <g stroke="#5a9a9a" strokeWidth="2.5" fill="none">
                <path d="M 20 75 L 45 55 L 60 65 L 80 45" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="70,45 80,45 80,55" fill="#5a9a9a" />
            </g>
        </svg>
    );
}
