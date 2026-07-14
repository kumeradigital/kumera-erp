import type { TaxMode } from "@/shared/money";
export type EntryType = "initial_capital"|"income"|"expense"|"asset"|"deposit"|"refund";
export interface OpeningEntry { id:string; date:string; description:string; category:string; type:EntryType; taxMode:TaxMode; taxRate:number; net:number; tax:number; total:number; note?:string; estimated:boolean; receipt?:string; status:"active"|"void"; updatedAt:string; }
export const entryLabels:Record<EntryType,string>={ initial_capital:"Capital inicial", income:"Ingreso / aporte", expense:"Gasto", asset:"Activo / equipo", deposit:"Depósito recuperable", refund:"Devolución" };
export const defaultCategories=["Arriendo","Garantía","Remodelación","Maquinaria","Equipamiento","Instalaciones","Permisos","Marketing","Insumos iniciales","Transporte","Servicios profesionales","Otros"];
