import { describe,expect,it } from "vitest";
import { summarize } from "@/modules/opening/calculations";
import type { OpeningEntry } from "@/modules/opening/types";
const entry=(type:OpeningEntry["type"],total:number):OpeningEntry=>({id:crypto.randomUUID(),date:"2026-07-01",description:type,category:"",type,taxMode:"exempt",taxRate:0,net:total,tax:0,total,estimated:false,status:"active",updatedAt:new Date().toISOString()});
describe("resumen de apertura",()=>{it("reproduce el caso inicial de KUMERA",()=>{const value=summarize([entry("initial_capital",5123000),entry("expense",675000),entry("deposit",675000)]);expect(value.balance).toBe(3773000);expect(value.expenses).toBe(675000);expect(value.deposits).toBe(675000);});it("ignora registros anulados",()=>{const cancelled={...entry("expense",1000),status:"void" as const};expect(summarize([entry("initial_capital",5000),cancelled]).balance).toBe(5000);});});
