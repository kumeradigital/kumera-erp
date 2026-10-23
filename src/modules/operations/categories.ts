export const OPERATION_CATEGORIES = [
  "Materias primas",
  "Envases y embalajes",
  "Aseo y limpieza",
  "Utensilios menores",
  "Equipamiento",
  "Combustible",
  "Estacionamiento y transporte",
  "Alimentación del personal",
  "Remuneraciones",
  "Cotizaciones previsionales",
  "Arriendo",
  "Servicios básicos",
  "Mantención y reparaciones",
  "Gastos administrativos",
  "Gastos extraordinarios",
  "Retiros personales",
  "Otros",
] as const;

export const OPERATION_CATEGORIES_BY_TYPE = {
  purchase: [
    "Materias primas",
    "Envases y embalajes",
    "Aseo y limpieza",
    "Utensilios menores",
  ],
  fixed_cost: [
    "Servicios básicos",
    "Arriendo",
    "Remuneraciones",
    "Cotizaciones previsionales",
    "Mantención y reparaciones",
    "Gastos administrativos",
  ],
  expense: [
    "Equipamiento",
    "Combustible",
    "Estacionamiento y transporte",
    "Alimentación del personal",
    "Aseo y limpieza",
    "Utensilios menores",
    "Mantención y reparaciones",
    "Gastos administrativos",
    "Gastos extraordinarios",
    "Otros",
  ],
  other_income: ["Otros"],
  owner_contribution: ["Otros"],
  owner_withdrawal: ["Retiros personales"],
} as const;

export const DEFAULT_OPERATION_CATEGORY = {
  purchase: "Materias primas",
  fixed_cost: "Servicios básicos",
  expense: "Otros",
  other_income: "Otros",
  owner_contribution: "Otros",
  owner_withdrawal: "Retiros personales",
} as const;

export function normalizeOperationCategory(
  category: string,
  type: keyof typeof OPERATION_CATEGORIES_BY_TYPE,
  description = "",
) {
  if (OPERATION_CATEGORIES.includes(category as never)) return category;

  const context = `${category} ${description}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

  if (/plaga|mantencion|reparacion/.test(context))
    return "Mantención y reparaciones";
  if (/\bgas\b|electric|\bluz\b|\bagua\b|internet|telefon/.test(context))
    return "Servicios básicos";
  if (/sueldo|remuneracion|pasteler|panader|cajer/.test(context))
    return "Remuneraciones";
  if (/cotizacion|prevision|previred/.test(context))
    return "Cotizaciones previsionales";
  if (/arriendo|alquiler/.test(context)) return "Arriendo";

  return DEFAULT_OPERATION_CATEGORY[type];
}

export const CASH_WITHDRAWAL_CATEGORIES = [
  "Compra menor del negocio",
  "Alimentación del personal",
  "Combustible",
  "Estacionamiento y transporte",
  "Aseo y limpieza",
  "Envases y embalajes",
  "Retiro personal",
  "Otros",
] as const;
