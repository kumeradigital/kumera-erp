const DEFAULT_VAT_RATE = 19;

export function grossVat(gross: number, vatRate = DEFAULT_VAT_RATE) {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return Math.round((gross * vatRate) / (100 + vatRate));
}

export function calculateTaxReserve({
  grossSales,
  purchaseTaxCredit,
  cardFeeTaxCredit,
}: {
  grossSales: number;
  purchaseTaxCredit: number;
  cardFeeTaxCredit: number;
}) {
  const salesTaxDebit = grossVat(grossSales);
  const recoverableTaxCredit = Math.max(
    0,
    Math.round(purchaseTaxCredit) + Math.round(cardFeeTaxCredit),
  );

  return {
    salesTaxDebit,
    recoverableTaxCredit,
    estimatedVatPayable: Math.max(0, salesTaxDebit - recoverableTaxCredit),
  };
}
