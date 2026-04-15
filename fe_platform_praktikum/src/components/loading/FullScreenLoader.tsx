interface FullScreenLoaderProps {
  text?: string
}

export default function FullScreenLoader({
  text = "Memuat aplikasi..."
}: FullScreenLoaderProps) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-999">
      
      {/* Spinner */}
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />

      {/* Text */}
      <p className="text-sm text-gray-600">{text}</p>

    </div>
  )
}
