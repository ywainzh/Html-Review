interface IconProps {
  name: 'code' | 'play' | 'back';
  className?: string;
}

const paths: Record<IconProps['name'], string> = {
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  play: 'm8 5 11 7-11 7V5Z',
  back: 'm14 6-6 6 6 6',
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
