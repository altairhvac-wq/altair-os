import { FileImage, Upload } from "lucide-react";

type ReceiptUploadBoxProps = {
  compact?: boolean;
};

export function ReceiptUploadBox({ compact = false }: ReceiptUploadBoxProps) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/30 ${
        compact ? "px-4 py-5" : "px-6 py-8"
      }`}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        <Upload className="h-5 w-5 text-cyan-600" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">
        Drop receipt here or click to browse
      </p>
      <p className="mt-1 text-xs text-slate-500">
        PNG, JPG, or PDF up to 10 MB
      </p>
      <button
        type="button"
        disabled
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
      >
        <FileImage className="h-3.5 w-3.5" />
        Upload mockup only
      </button>
      <p className="mt-2 text-[11px] text-slate-400">
        File upload and OCR coming soon
      </p>
    </div>
  );
}
