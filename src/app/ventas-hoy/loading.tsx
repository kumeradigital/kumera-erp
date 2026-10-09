export default function TodaySalesLoading() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-start px-4 py-8 sm:items-center sm:py-10">
      <section className="card w-full animate-pulse p-6 text-center sm:p-9">
        <div className="mx-auto h-3 w-24 rounded bg-[#e4e7dc]" />
        <div className="mx-auto mt-5 h-14 w-52 rounded-xl bg-[#e4e7dc]" />
        <div className="mx-auto mt-4 h-4 w-36 rounded bg-[#eceee6]" />
        <div className="mt-7 h-12 rounded-2xl bg-[#e4e7dc]" />
      </section>
    </main>
  );
}
