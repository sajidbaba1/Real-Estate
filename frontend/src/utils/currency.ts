export const formatPriceINR = (value: number | string | null | undefined, withSymbol: boolean = true) => {
  if (value === null || value === undefined || value === '') return withSymbol ? '₹0' : '0';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num as number)) return withSymbol ? '₹0' : '0';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num as number);
  } catch {
    // Fallback formatting
    return `${withSymbol ? '₹' : ''}${Math.round(num as number).toLocaleString('en-IN')}`;
  }
};
