import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";
import { startOfflineSession } from "@/lib/auth/offlineSession";

const PBKDF2_ITERATIONS = 310_000;

function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error("Invalid verifier configuration");
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
}

async function verifyOfflineCredentials(values: {
  lastName: string;
  firstName: string;
  birthDate: string;
  pin: string;
  password: string;
}): Promise<boolean> {
  const saltHex = import.meta.env.VITE_OFFLINE_LOGIN_SALT;
  const expectedHash = import.meta.env.VITE_OFFLINE_LOGIN_HASH;
  if (!saltHex || !expectedHash) throw new Error("Offline login verifier is not configured");

  const credentialText = [
    values.lastName.trim(),
    values.firstName.trim(),
    values.birthDate.trim(),
    values.pin.trim(),
    values.password,
  ].join("|");

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(credentialText),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const actualHash = Array.from(new Uint8Array(derivedBits))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return actualHash === expectedHash.toLowerCase();
}

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ firstName: "", lastName: "", birthDate: "", pin: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setFieldErrors({});

    if (!formData.firstName || !formData.lastName || !formData.birthDate || !formData.pin || !formData.password) {
      setError("الرجاء ملء جميع الحقول.");
      return;
    }
    if (!/^\d+$/.test(formData.pin)) {
      setError("يجب أن يتكون رمز PIN من أرقام فقط.");
      setFieldErrors({ pin: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const valid = await verifyOfflineCredentials(formData);
      if (!valid) {
        setError("معلومات تسجيل الدخول غير صحيحة. يرجى التحقق من الحقول المميزة باللون الأحمر.");
        setFieldErrors({ lastName: true, firstName: true, birthDate: true, pin: true, password: true });
        return;
      }
      startOfflineSession();
      navigate("/dashboard");
    } catch (verificationError) {
      console.error("Offline login verification failed:", verificationError);
      setError("لم يتم إعداد التحقق المحلي بشكل صحيح. يرجى التواصل مع المسؤول.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]" dir="rtl">
      <Header />
      <div className="flex items-center justify-center px-4 py-8 md:py-16 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md bg-white border border-gray-100 p-10 rounded-3xl shadow-xl shadow-gray-200/50 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fd8cf247061ae4e73b8c8529275e40675%2F0b341ebd078c40328e112bce53368850?format=webp&width=800&height=1200" alt="Logo SHM" className="w-24 h-24 mx-auto mb-6 object-contain animate-bounce duration-&lsqb;3s&rsqb;" />
            <h1 className="text-3xl font-black shm-text-gradient mb-2">تسجيل الدخول</h1>
            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">بوابة الكشافة الحسنية</p>
          </div>
          {error && <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-4 duration-300"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className={cn("block text-xs font-black uppercase tracking-widest mr-1", fieldErrors.lastName ? "text-red-500" : "text-gray-500")}>الاسم العائلي</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="family-name" className={cn("w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold", fieldErrors.lastName ? "border-red-200 text-red-600 bg-red-50" : "border-transparent focus:bg-white focus:border-primary/20")} />
            </div>
            <div className="space-y-2">
              <label className={cn("block text-xs font-black uppercase tracking-widest mr-1", fieldErrors.firstName ? "text-red-500" : "text-gray-500")}>الاسم الشخصي</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} autoComplete="given-name" className={cn("w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold", fieldErrors.firstName ? "border-red-200 text-red-600 bg-red-50" : "border-transparent focus:bg-white focus:border-primary/20")} />
            </div>
            <div className="space-y-2">
              <label className={cn("block text-xs font-black uppercase tracking-widest mr-1", fieldErrors.birthDate ? "text-red-500" : "text-gray-500")}>تاريخ الازدياد</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} autoComplete="bday" className={cn("w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold", fieldErrors.birthDate ? "border-red-200 text-red-600 bg-red-50" : "border-transparent focus:bg-white focus:border-primary/20")} />
            </div>
            <div className="space-y-2">
              <label className={cn("block text-xs font-black uppercase tracking-widest mr-1", fieldErrors.pin ? "text-red-500" : "text-gray-500")}>رمز PIN</label>
              <input type="password" inputMode="numeric" autoComplete="off" name="pin" value={formData.pin} onChange={handleChange} className={cn("w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold", fieldErrors.pin ? "border-red-200 text-red-600 bg-red-50" : "border-transparent focus:bg-white focus:border-primary/20")} />
            </div>
            <div className="space-y-2">
              <label className={cn("block text-xs font-black uppercase tracking-widest mr-1", fieldErrors.password ? "text-red-500" : "text-gray-500")}>كلمة المرور</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} autoComplete="current-password" className={cn("w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold", fieldErrors.password ? "border-red-200 text-red-600 bg-red-50" : "border-transparent focus:bg-white focus:border-primary/20")} />
            </div>
            <div className="pt-6">
              <button type="submit" disabled={isSubmitting} className="w-full shm-gradient text-white font-black py-4 rounded-2xl transition-all shm-gradient-hover shadow-lg shadow-primary/20 uppercase tracking-widest disabled:opacity-60">{isSubmitting ? "جاري التحقق..." : "تسجيل الدخول"}</button>
            </div>
          </form>
          <div className="mt-8 text-center"><p className="text-[10px] text-gray-300 font-bold uppercase tracking-[0.2em]">Version 1.1.0 • SHM Digital</p></div>
        </div>
      </div>
    </div>
  );
}
