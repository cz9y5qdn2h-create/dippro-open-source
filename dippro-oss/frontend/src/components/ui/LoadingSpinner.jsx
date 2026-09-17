export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} border-2 border-gold/20 border-t-gold rounded-full animate-spin`}
      />
    </div>
  );
}
