import { useNavigate } from "react-router-dom"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center max-w-lg">

        {/* 404 dekoratif */}
        <div className="relative mb-8 select-none">
          <p className="text-[160px] font-black text-gray-100 leading-none tracking-tighter">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-md px-6 py-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-sm text-gray-400 font-mono">
                  /halaman-tidak-ditemukan
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-500 font-mono text-left">
                <span className="text-red-500">Error:</span> Page not found
              </p>
            </div>
          </div>
        </div>

        {/* Teks */}
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-gray-500 mb-10 leading-relaxed">
          Halaman yang kamu cari tidak tersedia, sudah dipindahkan,
          atau mungkin URL-nya salah ketik.
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-medium shadow-sm"
          >
            <Home size={16} />
            Ke Dashboard
          </button>
        </div>

      </div>
    </div>
  )
}