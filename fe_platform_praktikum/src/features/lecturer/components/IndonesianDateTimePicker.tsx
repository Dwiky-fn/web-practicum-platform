import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

export function IndonesianDateTimePicker({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const parts = value ? value.split("T") : ["", ""]
  const dateVal = parts[0] || ""
  const timeVal = parts[1] || "00:00"
  const [hourVal = "00", minuteVal = "00"] = timeVal.split(":")

  const handleDateChange = (newDate: string) => {
    if (!newDate) {
      onChange("")
      return
    }
    const h = hourVal || "00"
    const m = minuteVal || "00"
    onChange(`${newDate}T${h.padStart(2, "0")}:${m.padStart(2, "0")}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        value={dateVal}
        min={new Date().toISOString().slice(0, 10)}
        disabled={disabled}
        onChange={(e) => handleDateChange(e.target.value)}
        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
      />
      <div className="flex items-center gap-2">
        <CustomTimePicker
          hour={hourVal.padStart(2, "0")}
          minute={minuteVal.padStart(2, "0")}
          disabled={disabled}
          onChange={(newHour, newMinute) => {
            const d = dateVal || new Date().toISOString().slice(0, 10)
            onChange(`${d}T${newHour}:${newMinute}`)
          }}
        />
      </div>
    </div>
  )
}

function CustomTimePicker({
  hour,
  minute,
  disabled,
  onChange,
}: {
  hour: string
  minute: string
  disabled?: boolean
  onChange: (h: string, m: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({ top: rect.bottom + 4, left: rect.left })
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // The popup is rendered in a portal, so we need to check if the click is outside both the button and the popup.
      // Easiest is to check if the target has a specific class or we can just rely on the portal event bubbling if we attach it there.
      // But standard click outside might close it since the popup is in the portal.
      // Let's add an id to the popup to check.
      const popup = document.getElementById("custom-time-picker-popup")
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target as Node) &&
        (!popup || !popup.contains(e.target as Node))
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener("scroll", updateCoords, true)
      window.addEventListener("resize", updateCoords)
      return () => {
        window.removeEventListener("scroll", updateCoords, true)
        window.removeEventListener("resize", updateCoords)
      }
    }
  }, [isOpen])

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

  const hourScrollRef = useRef<HTMLDivElement>(null)
  const minuteScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const activeHour = hourScrollRef.current?.querySelector('[data-active="true"]') as HTMLElement
        if (activeHour && hourScrollRef.current) {
          hourScrollRef.current.scrollTop = activeHour.offsetTop - hourScrollRef.current.offsetHeight / 2 + activeHour.offsetHeight / 2
        }
        const activeMinute = minuteScrollRef.current?.querySelector('[data-active="true"]') as HTMLElement
        if (activeMinute && minuteScrollRef.current) {
          minuteScrollRef.current.scrollTop = activeMinute.offsetTop - minuteScrollRef.current.offsetHeight / 2 + activeMinute.offsetHeight / 2
        }
      }, 10)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 hover:bg-gray-50 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
      >
        {hour}:{minute}
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div 
          id="custom-time-picker-popup"
          className="fixed z-[99999] flex h-56 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="flex w-1/2 flex-col overflow-y-auto border-r border-gray-100 p-1" ref={hourScrollRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            {hours.map((h) => (
              <button
                key={`h-${h}`}
                type="button"
                data-active={hour === h}
                onClick={() => onChange(h, minute)}
                className={`flex w-full shrink-0 items-center justify-center rounded py-2 text-sm font-medium transition-colors ${
                  hour === h ? "bg-blue-100 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="flex w-1/2 flex-col overflow-y-auto p-1" ref={minuteScrollRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {minutes.map((m) => (
              <button
                key={`m-${m}`}
                type="button"
                data-active={minute === m}
                onClick={() => onChange(hour, m)}
                className={`flex w-full shrink-0 items-center justify-center rounded py-2 text-sm font-medium transition-colors ${
                  minute === m ? "bg-blue-100 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
