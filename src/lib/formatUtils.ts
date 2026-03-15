
export function formatCurrency(value: number, currencySymbol: string = '$'): string {
  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${currencySymbol}${formattedValue}`;
}
