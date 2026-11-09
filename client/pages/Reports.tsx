import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Download, Share2, FileText, CalendarDays } from "lucide-react";
import { offlineStorage } from "@/lib/storage/offlineStorage";

interface LocalReport {
  id: string;
  localId: string;
  title: string;
  content: string;
  date: string;
  pdfBase64?: string;
  syncStatus: "pending" | "synced" | "failed";
  createdAt: string;
  details: Record<string, unknown>;
}

interface LocalSession {
  id: string;
  localId: string;
  title: string;
  description: string;
  date: string;
  syncStatus: "pending" | "synced" | "failed";
  createdAt: string;
  details: Record<string, unknown>;
}

function parseDetails(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function textValue(value: unknown, fallback = "—"): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function pdfBlobFromBase64(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: "application/pdf" });
}

function safeFileName(title: string): string {
  return (title.replace(/[^a-z0-9\u0600-\u06FF_-]+/gi, "_").slice(0, 60) || "document") + ".pdf";
}

function downloadLocalPdf(base64: string, title: string): void {
  const blob = pdfBlobFromBase64(base64);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeFileName(title);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function shareLocalPdf(base64: string, title: string): Promise<void> {
  const file = new File([pdfBlobFromBase64(base64)], safeFileName(title), { type: "application/pdf" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({ title, files: [file] });
    return;
  }
  downloadLocalPdf(base64, title);
  window.alert("Le partage de fichier n'est pas disponible sur cet appareil. Le PDF a été téléchargé pour être partagé manuellement.");
}

export default function Reports() {
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "sessions">("reports");

  useEffect(() => {
    let cancelled = false;
    const loadLocalDocuments = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        await offlineStorage.init();
        const [storedReports, storedSessions] = await Promise.all([
          offlineStorage.getAllReports(),
          offlineStorage.getAllSessions(),
        ]);
        if (cancelled) return;
        setReports(storedReports.map((item) => ({
          ...item,
          details: parseDetails(item.content),
        })));
        setSessions(storedSessions.map((item) => ({
          ...item,
          details: parseDetails(item.description),
        })));
      } catch (error) {
        console.error("Local documents loading failed:", error);
        if (!cancelled) setLoadError("تعذر تحميل الوثائق المخزنة على هذا الجهاز.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLocalDocuments();
    return () => { cancelled = true; };
  }, []);

  const statusLabel = (status: LocalReport["syncStatus"]) => {
    if (status === "synced") return "تمت المزامنة";
    if (status === "failed") return "تعذرت المزامنة";
    return "بانتظار المزامنة";
  };

  return (
    <Layout>
      <div className="mb-12 animate-in fade-in duration-700">
        <h1 className="text-4xl font-black shm-text-gradient mb-4 uppercase tracking-wider">إدارة الوثائق</h1>
        <div className="w-20 h-1.5 shm-gradient rounded-full"></div>
        <p className="mt-4 text-sm font-bold text-gray-400">الوثائق المحفوظة على هذا الجهاز — متاحة دون اتصال بالإنترنت</p>
      </div>

      <div className="flex bg-gray-50 p-2 rounded-2xl mb-10 w-fit">
        <button onClick={() => setActiveTab("reports")} className={`px-8 py-3 font-black uppercase tracking-widest text-sm rounded-xl ${activeTab === "reports" ? "bg-white text-primary shadow-sm" : "text-gray-400"}`}>التقارير</button>
        <button onClick={() => setActiveTab("sessions")} className={`px-8 py-3 font-black uppercase tracking-widest text-sm rounded-xl ${activeTab === "sessions" ? "bg-white text-secondary shadow-sm" : "text-gray-400"}`}>الحصص</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-14 w-14 border-b-4 border-primary"></div></div>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-red-700">{loadError}</div>
      ) : activeTab === "reports" ? (
        reports.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reports.map((report) => (
              <div key={report.id} className="shm-card group">
                <div className="w-12 h-12 shm-gradient text-white rounded-xl flex items-center justify-center mb-6"><FileText size={22} /></div>
                <h3 className="font-black text-xl mb-3 text-gray-800 line-clamp-2 min-h-[3.5rem]">{report.title}</h3>
                <div className="text-sm text-gray-400 font-bold space-y-2 mb-5 border-t border-gray-50 pt-4">
                  <p>📍 {textValue(report.details.location)}</p>
                  <p>📅 {new Date(report.date || report.createdAt).toLocaleDateString("ar-MA")}</p>
                  <p className="text-xs">{statusLabel(report.syncStatus)}</p>
                </div>
                {report.pdfBase64 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => downloadLocalPdf(report.pdfBase64!, report.title)} className="gap-2 rounded-xl text-xs font-black"><Download size={16} /> تنزيل</Button>
                    <Button onClick={() => shareLocalPdf(report.pdfBase64!, report.title).catch((error) => {
                      if (!(error instanceof Error && error.name === "AbortError")) window.alert("تعذرت مشاركة الملف. يمكنك تنزيله بدلاً من ذلك.");
                    })} variant="outline" className="gap-2 rounded-xl text-xs font-black"><Share2 size={16} /> مشاركة</Button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-100 px-4 py-3 text-center text-xs font-black text-gray-400">PDF غير محفوظ محلياً</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-full text-center py-24 bg-white border-2 border-dashed border-gray-100 rounded-[3rem]"><p className="text-gray-300 font-black">لا توجد تقارير محفوظة على هذا الجهاز</p></div>
        )
      ) : (
        sessions.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessions.map((session) => (
              <div key={session.id} className="shm-card group">
                <div className="w-12 h-12 shm-gradient text-white rounded-xl flex items-center justify-center mb-6"><CalendarDays size={22} /></div>
                <h3 className="font-black text-xl mb-3 text-gray-800 line-clamp-2">{session.title}</h3>
                <div className="text-sm text-gray-400 font-bold space-y-2 mb-5 border-t border-gray-50 pt-4">
                  <p>📅 {session.date ? new Date(session.date).toLocaleString("ar-MA") : new Date(session.createdAt).toLocaleDateString("ar-MA")}</p>
                  <p>📍 {textValue(session.details.location)}</p>
                  <p className="text-xs">{statusLabel(session.syncStatus)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <p className="text-xs font-bold text-blue-700 text-right">
                    <span className="block font-black mb-2">📋 التفاصيل</span>
                    <span className="block text-[10px] text-blue-600 mb-3">الهدف: {textValue(session.details.objective)}</span>
                    <span className="block text-[10px] text-blue-600">الفئة المستهدفة: {textValue(session.details.targetAudience)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white border-2 border-dashed border-gray-100 rounded-[3rem]"><p className="text-gray-300 font-black">لا توجد حصص محفوظة على هذا الجهاز</p></div>
        )
      )}
    </Layout>
  );
}
