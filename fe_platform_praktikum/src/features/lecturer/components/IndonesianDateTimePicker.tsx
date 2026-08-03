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

  const handleHourChange = (newHour: string) => {
    const d = dateVal || new Date().toISOString().slice(0, 10)
    const m = minuteVal || "00"
    onChange(`${d}T${newHour.padStart(2, "0")}:${m.padStart(2, "0")}`)
  }

  const handleMinuteChange = (newMinute: string) => {
    const d = dateVal || new Date().toISOString().slice(0, 10)
    const hVal = hourVal || "00"
    onChange(`${d}T${hVal.padStart(2, "0")}:${newMinute.padStart(2, "0")}`)
  }

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        value={dateVal}
        disabled={disabled}
        onChange={(e) => handleDateChange(e.target.value)}
        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
      />
      <div className="flex items-center gap-1">
        <select
          value={hourVal.padStart(2, "0")}
          disabled={disabled}
          onChange={(e) => handleHourChange(e.target.value)}
          className="h-8 rounded-lg border border-gray-300 bg-white px-1.5 text-xs font-bold text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
          title="Pilih Jam (00 - 23 WIB)"
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-xs font-bold text-gray-500">:</span>
        <select
          value={minuteVal.padStart(2, "0")}
          disabled={disabled}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="h-8 rounded-lg border border-gray-300 bg-white px-1.5 text-xs font-bold text-gray-800 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400 cursor-pointer"
          title="Pilih Menit (00 - 59)"
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
          24 Jam
        </span>
      </div>
    </div>
  )
}
