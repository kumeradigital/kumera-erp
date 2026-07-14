import { describe,expect,it } from "vitest";
import { calculateTax } from "@/shared/money";
describe("cálculo de IVA",()=>{it("extrae el IVA incluido",()=>{expect(calculateTax(119000,"included")).toEqual({net:100000,tax:19000,total:119000});});it("agrega IVA a un neto",()=>{expect(calculateTax(100000,"added")).toEqual({net:100000,tax:19000,total:119000});});it("respeta montos exentos",()=>{expect(calculateTax(675000,"exempt")).toEqual({net:675000,tax:0,total:675000});});});
