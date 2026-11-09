import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const makeFileName = () => `rapport-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.pdf`;

const isCancel = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return (e as { name?: string })?.name === "AbortError" || /cancel/i.test(msg);
};

async function writeToCache(blob: Blob, fileName: string): Promise<string> {
  const res = await Filesystem.writeFile({
    path: `shm-share/${fileName}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  return res.uri;
}

export async function downloadPdf(blob: Blob): Promise<string> {
  const fileName = makeFileName();

  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: `SHM-Rapports/${fileName}`,
        data: await blobToBase64(blob),
        directory: Directory.Documents,
        recursive: true,
      });
      return `✓ تم حفظ الملف في: Documents/SHM-Rapports/${fileName}`;
    } catch {
      const uri = await writeToCache(blob, fileName);
      try {
        await Share.share({ files: [uri], dialogTitle: "حفظ التقرير" });
      } catch (e) {
        if (!isCancel(e)) throw e;
      }
      return "اختر «حفظ في الملفات» من القائمة لتخزين التقرير.";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "✓ تم تحميل الملف";
}

export async function sharePdf(blob: Blob, title: string): Promise<void> {
  const fileName = makeFileName();
  try {
    if (Capacitor.isNativePlatform()) {
      const uri = await writeToCache(blob, fileName);
      await Share.share({ title, files: [uri], dialogTitle: "مشاركة التقرير" });
      return;
    }
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return;
    }
    await downloadPdf(blob);
  } catch (e) {
    if (!isCancel(e)) throw e;
  }
}
