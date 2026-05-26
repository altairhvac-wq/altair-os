type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="admin-card border-dashed p-8 sm:p-10">
      <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}
