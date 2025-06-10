export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12.3c0-5.6 4.5-10.1 10.1-10.1" stroke="url(#gradient1)" strokeWidth="2.2" />
      <path d="M12.2 2.2c5.6 0 10.1 4.5 10.1 10.1" stroke="url(#gradient2)" strokeWidth="2.2" />
      <path d="M22.3 12.3c0 5.6-4.5 10.1-10.1 10.1" stroke="url(#gradient3)" strokeWidth="2.2" />
      <path d="M12.2 22.4c-5.6 0-10.1-4.5-10.1-10.1" stroke="url(#gradient4)" strokeWidth="2.2" />
      <path d="M7 10.7l-1.9 1.1v.9L7 13.8" stroke="#6366F1" strokeWidth="2" />
      <path d="M17 10.7l1.9 1.1v.9L17 13.8" stroke="#6366F1" strokeWidth="2" />
      <path d="M10 8l4 8" stroke="#6366F1" strokeWidth="2" />
      <defs>
        <linearGradient id="gradient1" x1="2" y1="7.3" x2="12.1" y2="7.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="gradient2" x1="12.2" y1="2.2" x2="22.3" y2="12.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="gradient3" x1="22.3" y1="12.3" x2="12.2" y2="22.4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="gradient4" x1="12.2" y1="22.4" x2="2.1" y2="12.3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
    </svg>
  )
}
