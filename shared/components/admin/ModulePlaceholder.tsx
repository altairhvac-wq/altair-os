type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-xl text-slate-600">{description}</p>
    </div>
  );
}
