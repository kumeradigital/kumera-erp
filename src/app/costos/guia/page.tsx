import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Lightbulb,
  Scale,
  Target,
} from "lucide-react";
import { PosShell } from "@/modules/pos/pos-shell";

const sections = [
  ["metodo", "Método recomendado"],
  ["costos", "Qué costos considerar"],
  ["receta", "Costo de una receta"],
  ["margen", "Margen de contribución"],
  ["equilibrio", "Punto de equilibrio"],
  ["precio", "Cómo definir el precio"],
  ["escenarios", "Escenarios de venta"],
  ["errores", "Errores que debes evitar"],
] as const;

export default function CostingGuidePage() {
  return (
    <PosShell active="costs">
      <main className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
        <Link
          href="/costos"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#235b45] hover:underline"
        >
          <ArrowLeft size={16} /> Volver al módulo de costos
        </Link>

        <header className="mt-5 rounded-[24px] bg-[#235b45] p-6 text-white md:p-10">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#d8f070] text-[#235b45]">
            <BookOpenCheck size={25} />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#d8f070]">
            Guía práctica ERP KUMERA
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
            Cómo costear productos y tomar decisiones de precio
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#e5eee9] md:text-base">
            Una metodología sencilla y rigurosa para pan, empanadas y bollería.
            Úsala cada vez que cambie una receta, un precio de compra o una meta
            de utilidad.
          </p>
        </header>

        <div className="mt-7 grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit lg:sticky lg:top-6">
            <nav className="card p-3" aria-label="Contenido de la guía">
              <p className="px-3 py-2 text-xs font-black uppercase tracking-wider text-[#777]">
                En esta guía
              </p>
              {sections.map(([id, label], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#5f655e] hover:bg-[#edf3ea] hover:text-[#235b45]"
                >
                  <span className="text-[#98a097]">{index + 1}</span>
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 space-y-6">
            <GuideSection
              id="metodo"
              eyebrow="El orden importa"
              title="Método recomendado"
              icon={<CheckCircle2 size={22} />}
            >
              <p>
                Un precio confiable no comienza mirando a la competencia.
                Primero debes conocer cuánto cuesta producir, cuánto deja cada
                venta y cuántas ventas necesitas para sostener el negocio.
              </p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "1",
                    "Registrar compras",
                    "Formato, cantidad, precio, fecha y proveedor reales.",
                  ],
                  [
                    "2",
                    "Construir la receta",
                    "Ingredientes, cantidades y rendimiento real del lote.",
                  ],
                  [
                    "3",
                    "Agregar merma",
                    "Pérdidas normales de preparación, cocción o manipulación.",
                  ],
                  [
                    "4",
                    "Registrar costos fijos",
                    "Arriendo, sueldos, servicios y administración.",
                  ],
                  [
                    "5",
                    "Revisar la contribución",
                    "Lo que cada venta aporta para cubrir estructura y utilidad.",
                  ],
                  [
                    "6",
                    "Probar precio y volumen",
                    "Validar una combinación comercial alcanzable.",
                  ],
                ].map(([number, title, text]) => (
                  <li key={number} className="rounded-2xl bg-[#f7f6ee] p-4">
                    <div className="flex gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#d8f070] text-sm font-black text-[#235b45]">
                        {number}
                      </span>
                      <div>
                        <h3 className="font-black">{title}</h3>
                        <p className="mt-1 text-sm text-[#6f756d]">{text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <Callout>
                Actualiza el costeo cuando cambie de forma relevante un precio
                de compra, la receta, el rendimiento, la merma o la comisión del
                medio de pago. No necesitas crear una receta nueva por cada
                compra.
              </Callout>
            </GuideSection>

            <GuideSection
              id="costos"
              eyebrow="La base del análisis"
              title="Qué costos debes considerar"
              icon={<Scale size={22} />}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Concept
                  title="Variables directos"
                  text="Cambian con cada producto vendido: ingredientes, envase, merma y comisión del medio de pago. Van al costo del producto."
                  examples="Harina, queso, bolsa, servilleta, comisión de débito."
                />
                <Concept
                  title="Fijos"
                  text="Existen aunque vendas poco o nada durante el mes. Se cubren con el margen generado por todas las ventas."
                  examples="Arriendo, sueldo fijo, contabilidad, internet, patente."
                />
                <Concept
                  title="Mixtos o indirectos"
                  text="Tienen una parte base y otra relacionada con la producción. Al comenzar puedes tratarlos como costo fijo mensual estimado."
                  examples="Electricidad, agua y gas cuando no puedes medir cada lote."
                />
              </div>
              <div className="mt-5 rounded-2xl border border-[#ead7a4] bg-[#fff8df] p-5">
                <h3 className="flex items-center gap-2 font-black text-[#73591a]">
                  <AlertTriangle size={19} /> No cuentes un costo dos veces
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#6e6240]">
                  Si registras todo el gas como costo fijo, no vuelvas a agregar
                  ese mismo consumo dentro de las recetas. Más adelante podrás
                  separar una parte productiva usando horas de horno o lotes,
                  pero debes retirar esa parte del costo fijo.
                </p>
              </div>
            </GuideSection>

            <GuideSection
              id="receta"
              eyebrow="De la compra al producto"
              title="Cómo se obtiene el costo de una receta"
              icon={<Calculator size={22} />}
            >
              <p>
                ERP KUMERA convierte cada compra a una unidad comparable —gramo,
                mililitro o unidad— y usa el precio más reciente. Después
                multiplica ese costo por la cantidad utilizada en la receta.
              </p>
              <Formula>
                Costo del ingrediente = cantidad utilizada × costo por gramo, ml
                o unidad
              </Formula>
              <Formula>
                Costo unitario de la receta = costo total del lote ÷ rendimiento
                real
              </Formula>
              <Example title="Ejemplo: masa para 40 empanadas">
                Si todos los ingredientes del lote cuestan $18.000 y el
                rendimiento real es 40 unidades, la masa y relleno cuestan $450
                por empanada antes de merma, envase y comisión.
              </Example>
              <h3 className="mt-6 font-black">El rendimiento debe ser real</h3>
              <p className="mt-2">
                Pesa o cuenta lo que efectivamente puedes vender. Si una masa
                teórica rinde 45 unidades, pero normalmente obtienes 40,
                registra 40. Un rendimiento optimista abarata artificialmente el
                producto.
              </p>
              <h3 className="mt-6 font-black">IVA en las compras</h3>
              <p className="mt-2">
                El motor usa el valor neto de insumos afectos cuando el IVA se
                considera crédito fiscal. Si tu régimen o documento no permite
                recuperar ese IVA, el tratamiento económico cambia: confírmalo
                con tu contador antes de usar el resultado para decidir precios.
                No marques una compra como exenta sólo para forzar un cálculo.
              </p>
            </GuideSection>

            <GuideSection
              id="margen"
              eyebrow="Lo que aporta cada venta"
              title="Qué es el margen de contribución"
              icon={<CircleDollarSign size={22} />}
            >
              <p>
                Es el dinero que queda de una venta después de descontar IVA y
                costos variables. Ese dinero todavía no es utilidad: primero
                debe pagar arriendo, sueldos y los demás costos fijos.
              </p>
              <Formula>
                Margen unitario = venta neta − costos variables del producto
              </Formula>
              <Formula>Margen % = margen unitario ÷ venta neta × 100</Formula>
              <Example title="Ejemplo simplificado">
                Precio público $2.000; venta neta $1.681; ingredientes, merma,
                envase y comisión $850. El margen de contribución es $831, o
                49,4% de la venta neta. Cada unidad aporta $831 para cubrir
                costos fijos y luego generar utilidad.
              </Example>
              <Callout>
                Margen no significa recargo. Si algo cuesta $1.000 y lo vendes
                en $1.500, aplicaste 50% de recargo sobre el costo, pero el
                margen sobre la venta es 33,3%. ERP KUMERA trabaja con margen
                sobre venta neta.
              </Callout>
            </GuideSection>

            <GuideSection
              id="equilibrio"
              eyebrow="El mínimo para no perder"
              title="Qué es el punto de equilibrio"
              icon={<Target size={22} />}
            >
              <p>
                Es el nivel de ventas en el que el margen de contribución total
                cubre exactamente los costos fijos. En ese punto el resultado es
                cero: no hay pérdida, pero tampoco utilidad.
              </p>
              <Formula>
                Punto de equilibrio en ventas netas = costos fijos ÷ margen de
                contribución porcentual promedio
              </Formula>
              <Example title="Ejemplo mensual">
                Con $4.000.000 de costos fijos y un margen promedio de 50%,
                necesitas $8.000.000 de ventas netas mensuales para llegar al
                equilibrio. Si abres 26 días, son aproximadamente $307.700 netos
                por día.
              </Example>
              <p className="mt-5">
                Como KUMERA venderá productos distintos, no existe una única
                cantidad de unidades. El resultado depende de la mezcla: 30
                empanadas y 30 kg de pan pueden aportar más o menos que otra
                combinación con la misma venta total. Por eso la proyección usa
                el margen individual de cada producto.
              </p>
            </GuideSection>

            <GuideSection
              id="precio"
              eyebrow="Una decisión, no una adivinanza"
              title="Cómo definir el precio de un producto"
              icon={<Lightbulb size={22} />}
            >
              <p>
                El precio sugerido del ERP es un punto de partida matemático.
                Incluye costo físico, merma, IVA, comisión esperada y margen
                objetivo. La decisión final también debe superar una prueba
                comercial.
              </p>
              <div className="mt-5 grid gap-3">
                {[
                  [
                    "1. Piso económico",
                    "El precio debe dejar contribución positiva después de todos los costos variables.",
                  ],
                  [
                    "2. Margen objetivo",
                    "Define cuánto de la venta neta debe quedar para pagar estructura y utilidad.",
                  ],
                  [
                    "3. Volumen necesario",
                    "Comprueba cuántas unidades o kilos debes vender para cubrir el mes.",
                  ],
                  [
                    "4. Mercado y propuesta",
                    "Compara tamaños, calidad, ubicación, experiencia y precios realmente equivalentes.",
                  ],
                  [
                    "5. Prueba de sensibilidad",
                    "Simula alzas de ingredientes, menor venta y cambios en la mezcla.",
                  ],
                  [
                    "6. Revisión periódica",
                    "Contrasta lo proyectado con ventas y compras reales; ajusta con evidencia.",
                  ],
                ].map(([title, text]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-[#e4e4da] p-4"
                  >
                    <h3 className="font-black text-[#235b45]">{title}</h3>
                    <p className="mt-1 text-sm text-[#6f756d]">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-[#edf3ea] p-5">
                <h3 className="font-black text-[#235b45]">Regla de decisión</h3>
                <p className="mt-2 text-sm leading-6">
                  Si el mercado no acepta el precio necesario, no escondas el
                  problema bajando el margen sin analizarlo. Revisa porción,
                  receta, merma, proveedor, proceso, propuesta de valor o mezcla
                  de ventas. Un producto puede tener margen menor si atrae
                  clientes, pero esa decisión debe compensarse conscientemente
                  con otros productos.
                </p>
              </div>
            </GuideSection>

            <GuideSection
              id="escenarios"
              eyebrow="Decidir antes de gastar"
              title="Cómo usar las proyecciones"
              icon={<Calculator size={22} />}
            >
              <p>
                Una proyección no predice el futuro; responde qué ocurriría si
                se cumplen ciertos supuestos. Crea al menos tres escenarios y
                anota la lógica detrás de cada volumen.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Concept
                  title="Conservador"
                  text="Menor tráfico, venta lenta y costos algo mayores."
                  examples="Sirve para medir cuánto puedes resistir."
                />
                <Concept
                  title="Esperado"
                  text="Volumen razonable basado en capacidad y primeras ventas."
                  examples="Debe guiar compras y operación cotidiana."
                />
                <Concept
                  title="Exigente"
                  text="Mayor volumen sin superar capacidad, personal u horno."
                  examples="Sirve como meta, no como promesa."
                />
              </div>
              <Callout>
                La combinación sugerida por el ERP escala tu mezcla de
                referencia; no garantiza demanda. Debes validar que sea posible
                producirla y que existan suficientes clientes para comprarla.
              </Callout>
            </GuideSection>

            <GuideSection
              id="errores"
              eyebrow="Lista de control"
              title="Errores que debes evitar"
              icon={<AlertTriangle size={22} />}
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "Usar rendimientos teóricos en lugar de medir el lote real.",
                  "Olvidar merma, envases o comisiones de pago.",
                  "Confundir margen de contribución con utilidad final.",
                  "Duplicar luz, gas o agua como costo fijo y costo de receta.",
                  "Fijar precios solamente copiando a la competencia.",
                  "Bajar precios sin calcular el volumen adicional necesario.",
                  "Tomar una proyección como garantía de ventas.",
                  "Mantener precios de compra antiguos cuando el mercado cambió.",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-2xl bg-[#fff5ef] p-4 text-sm"
                  >
                    <AlertTriangle
                      className="mt-0.5 shrink-0 text-[#b65331]"
                      size={17}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </GuideSection>

            <section className="card p-6 md:p-8">
              <h2 className="text-xl font-black">Fuentes y alcance</h2>
              <p className="mt-3 text-sm leading-6 text-[#6f756d]">
                Esta guía aplica principios de contabilidad de gestión para
                tomar decisiones internas. No reemplaza la contabilidad
                tributaria ni el criterio de un contador respecto de tu régimen
                particular.
              </p>
              <ul className="mt-4 space-y-2 text-sm font-bold text-[#235b45]">
                <li>
                  <a
                    className="hover:underline"
                    href="https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Servicio de Impuestos Internos: tasa general de IVA de 19%
                  </a>
                </li>
                <li>
                  <a
                    className="hover:underline"
                    href="https://www.sii.cl/ayudas/ayudas_por_servicios/4669-i.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Servicio de Impuestos Internos: IVA, débito y crédito fiscal
                  </a>
                </li>
                <li>
                  <a
                    className="hover:underline"
                    href="https://capacitacion.sercotec.cl/portal/curso-sincronico/definicion-de-precios-analisis-de-costos-estrategia-y-rentabilidad/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Sercotec: precios, costos, margen y punto de equilibrio
                  </a>
                </li>
              </ul>
              <p className="mt-5 text-xs text-[#858a82]">
                Última revisión de esta guía: agosto de 2026.
              </p>
            </section>
          </article>
        </div>
      </main>
    </PosShell>
  );
}

function GuideSection({
  id,
  eyebrow,
  title,
  icon,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card scroll-mt-6 p-6 md:p-8">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3ea] text-[#235b45]">
          {icon}
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#7b8179]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="mt-5 text-[15px] leading-7 text-[#555b54]">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border-l-4 border-[#d8f070] bg-[#f7f6ee] px-4 py-3 font-mono text-sm font-bold text-[#34453d]">
      {children}
    </div>
  );
}

function Example({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-[#d7e4d9] bg-[#f1f7f0] p-5">
      <h3 className="font-black text-[#235b45]">{title}</h3>
      <p className="mt-2 text-sm leading-6">{children}</p>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex gap-3 rounded-2xl bg-[#f7f6ee] p-5 text-sm leading-6">
      <Lightbulb className="mt-0.5 shrink-0 text-[#235b45]" size={19} />
      <p>{children}</p>
    </div>
  );
}

function Concept({
  title,
  text,
  examples,
}: {
  title: string;
  text: string;
  examples: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e4e4da] p-5">
      <h3 className="font-black text-[#235b45]">{title}</h3>
      <p className="mt-2 text-sm leading-6">{text}</p>
      <p className="mt-3 text-xs text-[#81867e]">Ejemplos: {examples}</p>
    </div>
  );
}
