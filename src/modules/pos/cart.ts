export type PricedQuantity = {
  price: number;
  quantity: number;
};

export function calculateLineTotal(item: PricedQuantity) {
  const quantityInThousandths = Math.round(item.quantity * 1000);
  return Math.round((item.price * quantityInThousandths) / 1000);
}

export function calculateCartTotal(items: PricedQuantity[]) {
  return items.reduce((total, item) => total + calculateLineTotal(item), 0);
}

export function calculateCashPayable(total: number) {
  const lastDigit = ((total % 10) + 10) % 10;
  if (lastDigit === 0) return total;
  return lastDigit <= 5 ? total - lastDigit : total + (10 - lastDigit);
}

export function calculateCashRounding(total: number) {
  return calculateCashPayable(total) - total;
}
