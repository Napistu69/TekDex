type WordmarkProps = {
  className?: string;
};

/**
 * Split brand wordmark. The visible halves are hidden from assistive tech
 * so the name is announced as the single word "TekDex".
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={className ? `wordmark ${className}` : 'wordmark'}>
      <span className="visually-hidden">TekDex</span>
      <span aria-hidden="true">
        <span className="wordmark-tek">Tek</span>
        <span className="wordmark-dex">Dex</span>
      </span>
    </span>
  );
}
