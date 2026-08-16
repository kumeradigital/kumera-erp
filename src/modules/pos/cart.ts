export type PricedQuantity = {
  price: number;
  quantity: number;
};

export function calculateLineTotal(item: PricedQuantity) {
  return Math.round(item.price * item.quantity);
}

export function calculateCartTotal(items: PricedQuantity[]) {
  return items.reduce((total, item) => total + calculateLineTotal(item), 0);
}
