interface IconProps {
  name: 'code' | 'play' | 'trash';
  className?: string;
}

const paths: Record<IconProps['name'], string> = {
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  play: 'm8 5 11 7-11 7V5Z',
  trash:
    'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 4v6m4-6v6',
};

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
