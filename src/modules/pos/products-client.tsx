"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatClp } from "@/shared/money";
import {
  deleteProductAction,
  saveProductAction,
  toggleProductAction,
} from "./actions";
import type { Product } from "./types";
export function ProductsClient({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true);
    try {
      await saveProductAction(form);
      location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-6xl p-5 md:p-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            Catálogo
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Productos de venta
          </h1>
          <p className="mt-2 text-sm text-[#747970]">
            Lo que aparecerá en la pantalla de caja.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={17} />
          Producto
        </button>
      </div>
      {products.length ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.id}
              className={`card overflow-hidden ${!p.active ? "opacity-55" : ""}`}
            >
              <div className="grid h-36 place-items-center bg-[#edece3]">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-[#a4a79f]" />
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-black">{p.name}</p>
                    <p className="mt-1 text-xs text-[#7c8078]">{p.category}</p>
                  </div>
                  <p className="money font-black text-[#235b45]">
                    {formatClp(p.price)}{" "}
                    {p.saleUnit === "kg" ? "/ kg" : "/ un."}
                  </p>
                </div>
                {p.description && (
                  <p className="mt-3 text-xs text-[#747970]">{p.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#ebeae2] pt-3">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#edf1e8] px-3 py-2 text-xs font-bold text-[#235b45]"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={async () => {
                      await toggleProductAction(p.id, !p.active);
                      location.reload();
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-[#62675f] hover:bg-[#eee]"
                  >
                    {p.active ? "Ocultar" : "Activar"}
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `¿Eliminar ${p.name}? Ya no aparecerá en el catálogo ni en caja.`,
                        )
                      )
                        return;
                      await deleteProductAction(p.id);
                      location.reload();
                    }}
                    className="ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-[#a24628] hover:bg-[#f7e8e2]"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card mt-7 p-12 text-center">
          <p className="font-bold">Aún no hay productos</p>
          <p className="mt-2 text-sm text-[#777]">
            Crea el primero para comenzar a vender.
          </p>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 md:place-items-center">
          <div className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
                  {editing ? "Editar" : "Nuevo"}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {editing ? "Editar producto" : "Agregar producto"}
                </h2>
              </div>
              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <form action={submit} className="mt-6 space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field label="Nombre *">
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={editing?.name}
                  className="input"
                  placeholder="Ej: Empanada de queso"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Forma de venta *">
                  <select
                    name="saleUnit"
                    className="input"
                    defaultValue={editing?.saleUnit || "unit"}
                  >
                    <option value="unit">Por unidad</option>
                    <option value="kg">Por kilogramo</option>
                  </select>
                </Field>
                <Field label="Precio final *">
                  <input
                    name="price"
                    required
                    inputMode="numeric"
                    defaultValue={editing?.price}
                    className="input"
                    placeholder="Por unidad o kilo"
                  />
                </Field>
              </div>
              <Field label="Categoría">
                <select
                  name="category"
                  className="input"
                  defaultValue={editing?.category || "Otros"}
                >
                  <option>Bollería</option>
                  <option>Empanadas</option>
                  <option>Pan</option>
                  <option>Pan envasado</option>
                  <option>Bebidas</option>
                  <option>Otros</option>
                </select>
              </Field>
              <Field label="Descripción opcional">
                <textarea
                  name="description"
                  maxLength={300}
                  defaultValue={editing?.description}
                  className="input min-h-20 py-3"
                />
              </Field>
              <Field label="Imagen opcional">
                <input
                  name="image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="block w-full text-xs"
                />
                {editing?.imageUrl && (
                  <span className="mt-1 block text-[11px] font-normal text-[#777]">
                    Déjalo vacío para conservar la imagen actual.
                  </span>
                )}
              </Field>
              <button
                disabled={busy}
                className="h-12 w-full rounded-xl bg-[#235b45] font-bold text-white disabled:opacity-50"
              >
                {busy
                  ? "Guardando..."
                  : editing
                    ? "Guardar cambios"
                    : "Guardar producto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold">
      {label}
      {children}
    </label>
  );
}
