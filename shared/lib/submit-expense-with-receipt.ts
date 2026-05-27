import { createClient } from "@/lib/supabase/client";
import {
  createExpenseAction,
  prepareExpenseReceiptUploadAction,
} from "@/app/actions/expenses";
import { COMPANY_FILES_BUCKET } from "@/lib/storage/company-files";
import type { ExpenseFormData } from "@/shared/types/expense";

export type SubmitExpenseWithReceiptResult = {
  error?: string;
};

export async function submitExpenseWithReceipt(input: {
  data: ExpenseFormData;
  receiptFile?: File | null;
}): Promise<SubmitExpenseWithReceiptResult> {
  const expenseId = crypto.randomUUID();
  let receiptFileName: string | undefined;
  let receiptStoragePath: string | undefined;
  let receiptMimeType: string | undefined;
  let receiptFileSize: number | undefined;

  if (input.receiptFile) {
    const target = await prepareExpenseReceiptUploadAction({
      expenseId,
      fileName: input.receiptFile.name,
      forCreate: true,
    });

    if (target.error || !target.storagePath) {
      return { error: target.error ?? "Could not prepare receipt upload." };
    }

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(COMPANY_FILES_BUCKET)
      .upload(target.storagePath, input.receiptFile, {
        upsert: false,
        contentType: input.receiptFile.type,
      });

    if (uploadError) {
      return { error: uploadError.message || "Receipt upload failed." };
    }

    receiptFileName = input.receiptFile.name;
    receiptStoragePath = target.storagePath;
    receiptMimeType = input.receiptFile.type;
    receiptFileSize = input.receiptFile.size;
  }

  const result = await createExpenseAction({
    data: input.data,
    expenseId,
    receiptFileName,
    receiptStoragePath,
    receiptMimeType,
    receiptFileSize,
  });

  if (result.error) {
    if (receiptStoragePath) {
      const supabase = createClient();
      await supabase.storage
        .from(COMPANY_FILES_BUCKET)
        .remove([receiptStoragePath]);
    }
    return { error: result.error };
  }

  return {};
}
