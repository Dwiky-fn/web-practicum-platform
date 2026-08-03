import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

export default function TopProgressBar() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Show top progress bar ONLY on initial page load and route navigation
    setVisible(true)
    setProgress(30)

    const timer1 = setTimeout(() => setProgress(75), 120)
    const timer2 = setTimeout(() => setProgress(100), 280)
    const timer3 = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 550)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [location.pathname])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999] pointer-events-none">
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-out shadow-[0_0_8px_#2563eb]"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
