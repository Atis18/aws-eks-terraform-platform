const EmptyState = ({ title, description }) => (
  <div className="border border-info-subtle bg-info-subtle rounded-3 p-4 text-center my-3" role="status">
    <svg
      aria-hidden="true"
      className="text-info-emphasis mb-2"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </svg>
    <h2 className="h5 fw-semibold mb-1">{title}</h2>
    <p className="mb-0 text-body-secondary">{description}</p>
  </div>
);

export default EmptyState;
