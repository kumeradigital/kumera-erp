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
