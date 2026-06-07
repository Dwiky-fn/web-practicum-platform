import { useEffect, useState } from "react"
import { subscribeToFetch } from "../../services/api"

export default function TopProgressBar() {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let interval: any = null
    let hideTimeout: any = null

    const unsubscribe = subscribeToFetch((activeCount) => {
      if (activeCount > 0) {
        if (hideTimeout) clearTimeout(hideTimeout)
        setVisible(true)
        setProgress((prev) => {
          return prev > 0 ? prev : 30
        })

        if (!interval) {
          interval = setInterval(() => {
            setProgress((prev) => {
              if (prev < 90) {
                return prev + (90 - prev) * 0.1
              }
              return prev
            })
          }, 200)
        }
      } else {
        if (interval) {
          clearInterval(interval)
          interval = null
        }
        setProgress(100)

        hideTimeout = setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 300)
      }
    })

    return () => {
      unsubscribe()
      if (interval) clearInterval(interval)
      if (hideTimeout) clearTimeout(hideTimeout)
    }
  }, [])

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
