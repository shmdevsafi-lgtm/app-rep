import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Download, Home, Share2 } from "lucide-react";
import { offlineStorage } from "@/lib/storage/offlineStorage";

type Logo = string;

type ReportState = {
  title?: string;
  logos?: Logo[];
  report?: Record<string, unknown>;
  supabaseId?: string;
};

const valueOf = (report: Record<string, unknown> | undefined, key: string, fallback = "غير محدد") => {
  const value = report?.[key];
  return value === undefined || value === null || value === "" ? fallback : String(value);
};

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }
  return String(error);
}

export default function ReportSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const state = (location.state as ReportState) || {};
  const report = state.report || {};
  const title = state.title || valueOf(report, "title");
  const logos = state.logos || [];

  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!reportRef.current) return null;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
      width: reportRef.current.scrollWidth < 794 ? undefined : 794,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    return pdf.output("blob");
  };

  const prepareLocalPdf = async () => {
    setIsExporting(true);
    setDebugError(null);
    try {
      // Keep the existing A4 PDF rendering pipeline unchanged.
      const blob = await generatePdfBlob();
      if (!blob) throw new Error("Impossible de capturer le contenu du rapport.");

      const localId = typeof report.localId === "string" ? report.localId : undefined;
      if (!localId) throw new Error("Identifiant local du rapport introuvable.");

      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(reader.error || new Error("Lecture du PDF impossible"));
        reader.onload = () => {
          const result = String(reader.result || "");
          const separator = result.indexOf(",");
          if (separator < 0) reject(new Error("Format PDF local invalide"));
          else resolve(result.slice(separator + 1));
        };
        reader.readAsDataURL(blob);
      });

      await offlineStorage.updateReportPdf(localId, pdfBase64);
      setPdfBlob(blob);
    } catch (error) {
      console.error("Erreur préparation PDF local:", error);
      setDebugError(describeError(error));
    } finally {
      setIsExporting(false);
    }
  };

  const getPdfFileName = () => {
    const safeTitle = title.replace(/[^a-z0-9\u0600-\u06FF_-]+/gi, "_").slice(0, 60) || "rapport";
    return `${safeTitle}.pdf`;
  };

  const downloadPdf = () => {
    if (!pdfBlob) return;
    const objectUrl = URL.createObjectURL(pdfBlob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = getPdfFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  };

  const sharePdf = async () => {
    if (!pdfBlob) return;
    const file = new File([pdfBlob], getPdfFileName(), { type: "application/pdf" });
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title, files: [file] });
        return;
      }
      downloadPdf();
      setDebugError("Le partage de fichier n'est pas disponible sur cet appareil. Le PDF a été téléchargé pour être partagé manuellement.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setDebugError("Le partage a échoué. Le PDF reste disponible localement : utilisez Télécharger.");
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8b1e3f] text-white shadow-lg shadow-rose-200">
                <CheckCircle2 size={30} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#8b1e3f]">تم حفظ التقرير بنجاح</p>
                <h1 className="text-2xl font-black text-slate-900">{title}</h1>
              </div>
            </div>
            {!pdfBlob ? (
              <Button onClick={prepareLocalPdf} disabled={isExporting} className="gap-2 rounded-xl px-6 py-6 font-black">
                <Download size={18} />
                {isExporting ? "جاري تجهيز PDF..." : "تحضير PDF محلياً"}
              </Button>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={downloadPdf} className="gap-2 rounded-xl px-6 py-6 font-black">
                  <Download size={18} /> تنزيل PDF
                </Button>
                <Button onClick={sharePdf} variant="outline" className="gap-2 rounded-xl px-6 py-6 font-black">
                  <Share2 size={18} /> مشاركة PDF
                </Button>
              </div>
            )}
          </div>

          {pdfBlob && (
            <p className="mt-4 text-sm font-bold text-emerald-700">تم حفظ ملف PDF محلياً. يمكنك تنزيله أو مشاركته دون اتصال بالإنترنت.</p>
          )}
        </div>

        {debugError && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-right" dir="ltr">
            <p className="mb-2 font-black text-red-700">DEBUG ERROR:</p>
            <p className="break-all font-mono text-xs text-red-600">{debugError}</p>
          </div>
        )}

        <div ref={reportRef} dir="rtl" className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-8">
          <article className="mx-auto max-w-4xl overflow-hidden bg-white" style={{ pageBreakInside: "avoid" }}>
            <header className="px-6 py-6 text-center text-slate-900 sm:px-12">
              <div className="mb-5 h-1 bg-[#8B0000]" />
              <div className="flex items-center justify-center gap-5">
                {logos[0] ? <img src={logos[0]} alt="الشعار الأيمن" className="h-20 w-20 object-contain" /> : <div className="h-20 w-20" />}
                <div className="min-w-0 flex-1 text-center leading-8">
                  <p className="text-xl font-black">الكشفية الحسنية المغربية</p>
                  <p className="text-base">فرع آسفي مجموعة الأمل</p>
                  <p className="text-base">فوج عمر الفاروق</p>
                </div>
                {logos[1] ? <img src={logos[1]} alt="الشعار الأيسر" className="h-20 w-20 object-contain" /> : <div className="h-20 w-20" />}
              </div>
              <div className="mt-5 h-1 bg-[#8B0000]" />
              <h2 className="mt-7 text-2xl font-black">تقرير حول: {title}</h2>
            </header>

            <div className="px-6 pb-8 sm:px-12">
              <div className="overflow-hidden border border-[#d8c9a9]" style={{ pageBreakInside: "avoid" }}>
                <table className="w-full table-auto border-collapse text-right">
                  <tbody>
                    <TableRow label="الفئة المستهدفة" value={valueOf(report, "beneficiary")} />
                    <TableRow label="المكان" value={valueOf(report, "location")} />
                    <TableRow label="الزمان" value={valueOf(report, "time")} />
                    <TableRow label="الجهة المنظمة" value={valueOf(report, "category")} />
                    <TableRow label="عدد المشاركين" value={`${valueOf(report, "participants_boys", "0")} ذكور | ${valueOf(report, "participants_girls", "0")} إناث | ${valueOf(report, "leaders_count", "0")} قادة`} />
                    <TableRow label="الهدف من النشاط" value={valueOf(report, "objective")} />
                    <TableRow label="سير النشاط" value={valueOf(report, "description")} />
                    <TableRow label="النقاط الإيجابية" value={valueOf(report, "evaluationPositive")} />
                    <TableRow label="النقاط السلبية" value={valueOf(report, "evaluationNegative")} />
                    <TableRow label="التوصيات" value={valueOf(report, "recommendations")} />
                  </tbody>
                </table>
              </div>
              <footer className="mt-6 border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-400" style={{ pageBreakInside: "avoid" }}>
                تم إنشاء هذا التقرير بواسطة نظام إدارة التقارير - الكشفية الحسنية المغربية
              </footer>
            </div>
          </article>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <button onClick={() => navigate("/dashboard")} className="flex items-center justify-center gap-2 font-black text-slate-400 transition hover:text-[#5b2a86]"><Home size={17} /> العودة إلى لوحة القيادة</button>
          <button onClick={() => navigate("/add-report")} className="flex items-center justify-center gap-2 font-black text-[#5b2a86] transition hover:text-[#8b1e3f]"><ArrowRight size={17} /> إنشاء تقرير آخر</button>
        </div>
      </div>
    </Layout>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-[#d8c9a9] last:border-b-0" style={{ pageBreakInside: "avoid" }}>
      <th className="whitespace-nowrap bg-[#f5e6c8] px-4 py-3 align-middle text-sm font-black text-[#5f4a2b]">{label}</th>
      <td className="whitespace-pre-wrap break-words bg-white px-4 py-3 text-center text-sm font-medium leading-7 text-slate-700" style={{ overflowWrap: "anywhere" }}>{value}</td>
    </tr>
  );
}
