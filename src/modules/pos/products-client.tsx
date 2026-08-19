"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ImageIcon, PackageCheck, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatClp } from "@/shared/money";
import {
  CollectionToolbar,
  useCollectionView,
} from "@/shared/ui/collection-controls";
import {
  deleteProductAction,
  saveProductAction,
  toggleProductAction,
} from "./actions";
import type { Product } from "./types";
export function ProductsClient({ products }: { products: Product[] }) {
  const [section, setSection] = useState<"products" | "families">("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [formCategory, setFormCategory] = useState("Otros");
  const [customCategory, setCustomCategory] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useCollectionView("products");
  const sectionProducts = products.filter((product) =>
    section === "families" ? product.isSalesFamily : !product.isSalesFamily,
  );
  const isFamilyForm =
    editing?.isSalesFamily || (!editing && section === "families");
  const categories = [
    "Todos",
    ...new Set(sectionProducts.map((product) => product.category)),
  ];
  const formCategories = [
    ...new Set([
      "Bollería",
      "Empanadas",
      "Pan",
      "Pan envasado",
      "Bebidas",
      "Otros",
      ...products.map((product) => product.category),
    ]),
  ];
  const visibleProducts = sectionProducts.filter(
    (product) =>
      (category === "Todos" || product.category === category) &&
      `${product.name} ${product.description || ""}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            Catálogo
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Productos de venta
          </h1>
          <p className="mt-2 text-sm text-[#747970]">
            {section === "products"
              ? "Crea primero cada producto o variedad con su receta y costo."
              : "Agrupa productos existentes bajo un único producto de venta en caja."}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormCategory("Otros");
            setCustomCategory("");
            setOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={17} />
          {section === "products" ? "Producto" : "Familia"}
        </button>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-[#ecece3] p-1.5">
        {(
          [
            ["products", "Productos individuales"],
            ["families", "Familias de productos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setSection(value);
              setCategory("Todos");
              setSearch("");
            }}
            className={`rounded-xl px-3 py-3 text-xs font-black sm:text-sm ${section === value ? "bg-[#235b45] text-white shadow-sm" : "text-[#656b63]"}`}
          >
            {label}{" "}
            <span className="opacity-70">
              {value === "products"
                ? products.filter((p) => !p.isSalesFamily).length
                : products.filter((p) => p.isSalesFamily).length}
            </span>
          </button>
        ))}
      </div>
      {sectionProducts.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => {
            const count =
              item === "Todos"
                ? sectionProducts.length
                : sectionProducts.filter((product) => product.category === item)
                    .length;
            return (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${category === item ? "bg-[#235b45] text-white" : "border border-[#deddd4] bg-[#fffef9] text-[#62675f]"}`}
              >
                {item} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}
      {sectionProducts.length > 0 && (
        <CollectionToolbar
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar producto..."
        />
      )}
      {sectionProducts.length ? (
        visibleProducts.length ? (
          <div
            className={
              view === "cards"
                ? "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                : "card mt-5 overflow-x-auto"
            }
          >
            {view === "list" && (
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="border-b border-[#deddd4] bg-[#f4f4ec] text-[11px] uppercase text-[#747970]">
                  <tr>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Venta</th>
                    <th className="px-4 py-3">Disponibilidad</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ecebe3]">
                  {visibleProducts.map((product) => (
                    <tr
                      key={product.id}
                      className={
                        !product.active ? "opacity-55" : "hover:bg-[#fafaf4]"
                      }
                    >
                      <td className="px-4 py-3 font-black">{product.name}</td>
                      <td className="px-4 py-3 text-[#70756d]">
                        {product.category}
                      </td>
                      <td className="money px-4 py-3 font-black text-[#235b45]">
                        {formatClp(product.price)}
                      </td>
                      <td className="px-4 py-3">
                        {product.saleUnit === "kg" ? "Por kg" : "Por unidad"}
                      </td>
                      <td className="px-4 py-3">
                        {product.trackDailyAvailability
                          ? "Diaria"
                          : "Sin control"}
                      </td>
                      <td className="px-4 py-3">
                        {section === "families"
                          ? `${products.filter((item) => item.familyProductId === product.id).length} variedades`
                          : product.familyProductId
                            ? "Variedad interna"
                            : product.active
                              ? "Activo"
                              : "Oculto"}
                      </td>
                      <td className="px-4 py-3">
                        <ProductActions
                          product={product}
                          onEdit={() => {
                            setEditing(product);
                            setFormCategory(product.category);
                            setCustomCategory("");
                            setOpen(true);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {view === "cards" &&
              visibleProducts.map((p) => (
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
                        <p className="mt-1 text-xs text-[#7c8078]">
                          {p.category}
                        </p>
                      </div>
                      <p className="money font-black text-[#235b45]">
                        {formatClp(p.price)}{" "}
                        {p.saleUnit === "kg" ? "/ kg" : "/ un."}
                      </p>
                    </div>
                    {p.description && (
                      <p className="mt-3 text-xs text-[#747970]">
                        {p.description}
                      </p>
                    )}
                    {p.trackDailyAvailability && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#235b45]">
                        <PackageCheck size={14} /> Disponibilidad diaria activa
                      </p>
                    )}
                    {p.isSalesFamily && (
                      <div className="mt-3 rounded-xl bg-[#edf4e9] p-3 text-xs text-[#235b45]">
                        <b className="block">
                          {
                            products.filter(
                              (item) => item.familyProductId === p.id,
                            ).length
                          }{" "}
                          variedades vinculadas
                        </b>
                        <span className="mt-1 block leading-5">
                          {products
                            .filter((item) => item.familyProductId === p.id)
                            .map((item) => item.name)
                            .join(", ") || "Aún sin variedades"}
                        </span>
                      </div>
                    )}
                    {p.familyProductId && (
                      <p className="mt-3 text-xs font-bold text-[#7a650e]">
                        Variedad interna de una familia
                      </p>
                    )}
                    <ProductActions
                      product={p}
                      onEdit={() => {
                        setEditing(p);
                        setFormCategory(p.category);
                        setCustomCategory("");
                        setOpen(true);
                      }}
                    />
                  </div>
                </article>
              ))}
          </div>
        ) : (
          <div className="card mt-5 p-10 text-center">
            <p className="font-bold">
              No hay {section === "products" ? "productos" : "familias"} en{" "}
              {category}
            </p>
            <button
              onClick={() => setCategory("Todos")}
              className="mt-2 text-sm font-bold text-[#235b45] underline"
            >
              Ver todos los productos
            </button>
          </div>
        )
      ) : (
        <div className="card mt-7 p-12 text-center">
          <p className="font-bold">
            Aún no hay {section === "products" ? "productos" : "familias"}
          </p>
          <p className="mt-2 text-sm text-[#777]">
            {section === "products"
              ? "Crea el primero antes de formar familias."
              : "Crea una familia y selecciona los productos que la componen."}
          </p>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 md:place-items-center">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
                  {editing ? "Editar" : "Nuevo"}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {editing
                    ? isFamilyForm
                      ? "Editar familia"
                      : "Editar producto"
                    : isFamilyForm
                      ? "Agregar familia"
                      : "Agregar producto"}
                </h2>
              </div>
              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <form action={submit} className="mt-6 space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              {isFamilyForm && (
                <input type="hidden" name="isSalesFamily" value="on" />
              )}
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
                <input
                  type="hidden"
                  name="category"
                  value={
                    formCategory === "__new__" ? customCategory : formCategory
                  }
                />
                <select
                  className="input"
                  value={formCategory}
                  onChange={(event) => setFormCategory(event.target.value)}
                >
                  {formCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value="__new__">＋ Crear nueva categoría…</option>
                </select>
              </Field>
              {formCategory === "__new__" && (
                <Field label="Nombre de la nueva categoría *">
                  <input
                    autoFocus
                    required
                    maxLength={60}
                    value={customCategory}
                    onChange={(event) => setCustomCategory(event.target.value)}
                    className="input"
                    placeholder="Ej: Sándwiches"
                  />
                </Field>
              )}
              <Field label="Descripción opcional">
                <textarea
                  name="description"
                  maxLength={300}
                  defaultValue={editing?.description}
                  className="input min-h-20 py-3"
                />
              </Field>
              {!isFamilyForm && (
                <label className="flex items-start gap-3 rounded-xl border border-[#dfe4da] bg-[#f3f6ef] p-4 text-sm">
                  <input
                    name="trackDailyAvailability"
                    type="checkbox"
                    defaultChecked={editing?.trackDailyAvailability}
                    className="mt-0.5 size-4 accent-[#235b45]"
                  />
                  <span>
                    <b className="block text-[#235b45]">
                      Controlar disponibilidad diaria
                    </b>
                    <span className="mt-1 block text-xs font-normal leading-5 text-[#6f756d]">
                      Para productos vendidos por unidad, como empanadas. La
                      cantidad se solicitará al abrir caja y bajará con cada
                      venta.
                    </span>
                  </span>
                </label>
              )}
              {isFamilyForm && (
                <fieldset className="rounded-xl border border-[#dfe4da] p-4">
                  <legend className="px-2 text-xs font-black text-[#235b45]">
                    Productos que pertenecen a esta familia
                  </legend>
                  <p className="mb-3 text-[11px] leading-5 text-[#777]">
                    Selecciona productos individuales ya creados. Conservarán
                    sus recetas y costos, pero se venderán en caja bajo esta
                    familia.
                  </p>
                  <div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">
                    {products
                      .filter((product) => !product.isSalesFamily)
                      .map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-2 rounded-lg bg-[#f5f5ee] p-2 text-xs font-bold"
                        >
                          <input
                            type="checkbox"
                            name="familyMembers"
                            value={product.id}
                            defaultChecked={
                              product.familyProductId === editing?.id
                            }
                            className="accent-[#235b45]"
                          />
                          <span className="truncate">{product.name}</span>
                        </label>
                      ))}
                  </div>
                </fieldset>
              )}
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
                    : isFamilyForm
                      ? "Guardar familia"
                      : "Guardar producto"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
function ProductActions({
  product,
  onEdit,
}: {
  product: Product;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-[#ebeae2] pt-3 text-xs font-bold">
      <button
        onClick={onEdit}
        className="flex items-center gap-1 rounded-lg bg-[#edf1e8] px-3 py-2 text-[#235b45]"
      >
        <Pencil size={13} /> Editar
      </button>
      <button
        onClick={async () => {
          await toggleProductAction(product.id, !product.active);
          location.reload();
        }}
        className="rounded-lg px-3 py-2 text-[#62675f] hover:bg-[#eee]"
      >
        {product.active ? "Ocultar" : "Activar"}
      </button>
      <button
        onClick={async () => {
          if (
            !confirm(
              `¿Archivar ${product.name}? Podrás recuperarlo creando nuevamente un producto con el mismo nombre.`,
            )
          )
            return;
          try {
            await deleteProductAction(product.id);
            location.reload();
          } catch (error) {
            alert(
              error instanceof Error
                ? error.message
                : "No se pudo archivar el producto",
            );
          }
        }}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-[#a24628] hover:bg-[#f7e8e2]"
      >
        <Trash2 size={13} /> Archivar
      </button>
    </div>
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
