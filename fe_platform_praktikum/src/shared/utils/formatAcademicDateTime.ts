const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDONESIAN_SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

export interface AcademicDateTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

export const parseAcademicDateTime = (str: string | Date | null | undefined): AcademicDateTimeParts | null => {
  if (!str) return null;
  
  let s = String(str).trim();
  s = s.replace('T', ' ');

  if (str instanceof Date || s.includes('Z') || s.match(/[+-]\d{2}:?\d{2}$/)) {
    const dObj = str instanceof Date ? str : new Date(s);
    if (!isNaN(dObj.getTime())) {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(dObj);
      const getPart = (type: string) => (parts.find(p => p.type === type)?.value || '00');
      let hour = getPart('hour');
      if (hour === '24') hour = '00';
      return {
        year: getPart('year'),
        month: getPart('month'),
        day: getPart('day'),
        hour: hour,
        minute: getPart('minute'),
        second: getPart('second'),
      };
    }
  }

  const parts = s.split(' ');
  const datePart = parts[0] || '';
  const timePart = parts[1] || '';

  const dateSub = datePart.split('-');
  if (dateSub.length !== 3) return null;
  const year = dateSub[0].padStart(4, '0');
  const month = dateSub[1].padStart(2, '0');
  const day = dateSub[2].padStart(2, '0');

  const timeSub = timePart.split(':');
  const hour = (timeSub[0] || '00').padStart(2, '0');
  const minute = (timeSub[1] || '00').padStart(2, '0');
  const second = (timeSub[2] || '00').split('.')[0].padStart(2, '0');

  return { year, month, day, hour, minute, second };
};

export const parseAcademicDateInput = (input: string): string => {
  // DD/MM/YYYY -> YYYY-MM-DD
  const parts = input.split('/');
  if (parts.length !== 3) return '';
  const d = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  const y = parts[2].padStart(4, '0');
  return `${y}-${m}-${d}`;
};

export const parseAcademicTimeInput = (input: string): string => {
  // HH:mm -> HH:mm:00
  const parts = input.split(':');
  if (parts.length < 2) return '';
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}:00`;
};

export const combineAcademicDateAndTime = (date: string, time: string): string => {
  const formattedDate = date.includes('/') ? parseAcademicDateInput(date) : date;
  let formattedTime = time;
  if (!time.includes(':')) {
    formattedTime = '00:00:00';
  } else if (time.split(':').length === 2) {
    formattedTime = parseAcademicTimeInput(time);
  }
  return `${formattedDate} ${formattedTime}`;
};

export const formatAcademicDateInput = (date: string): string => {
  const parts = date.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return '';
  return `${day}/${month}/${year}`;
};

export const isValidAcademicDateInput = (date: string): boolean => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return false;
  const [day, month, year] = date.split('/').map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
};

export const isValidAcademicTimeInput = (time: string): boolean => {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hour, minute] = time.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

export const compareAcademicDateTime = (left: string, right: string): number => {
  const normalize = (value: string) => value.replace(/[-: ]/g, '');
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  if (normalizedLeft === normalizedRight) return 0;
  return normalizedLeft > normalizedRight ? 1 : -1;
};

export const formatAcademicDate = (date: string | Date | null | undefined): string => {
  const parts = parseAcademicDateTime(date);
  if (!parts) return '-';
  const mIdx = parseInt(parts.month, 10) - 1;
  const monthName = INDONESIAN_MONTHS[mIdx] || parts.month;
  return `${parseInt(parts.day, 10)} ${monthName} ${parts.year}`;
};

export const formatAcademicTime = (date: string | Date | null | undefined): string => {
  const parts = parseAcademicDateTime(date);
  if (!parts) return '-';
  return `${parts.hour}.${parts.minute}`;
};

export const formatAcademicDateTime = (date: string | Date | null | undefined): string => {
  const parts = parseAcademicDateTime(date);
  if (!parts) return '-';
  const mIdx = parseInt(parts.month, 10) - 1;
  const monthName = INDONESIAN_MONTHS[mIdx] || parts.month;
  return `${parseInt(parts.day, 10)} ${monthName} ${parts.year} pukul ${parts.hour}.${parts.minute}`;
};

export const formatAcademicTableDateTime = (date: string | Date | null | undefined): string => {
  const parts = parseAcademicDateTime(date);
  if (!parts) return '-';
  const mIdx = parseInt(parts.month, 10) - 1;
  const monthName = INDONESIAN_SHORT_MONTHS[mIdx] || parts.month;
  return `${parseInt(parts.day, 10)} ${monthName} ${parts.year}, ${parts.hour}.${parts.minute}`;
};
