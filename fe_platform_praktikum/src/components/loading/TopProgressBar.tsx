import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

export default function TopProgressBar() {
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true)
    setProgress(30)

    const step1 = setTimeout(() => setProgress(70), 150)
    const step2 = setTimeout(() => setProgress(100), 300)
    const done = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 450)

    return () => {
      clearTimeout(step1)
      clearTimeout(step2)
      clearTimeout(done)
    }
  }, [location.pathname])

  if (!visible) return null

  return (
    <div className="w-full h-1">
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
