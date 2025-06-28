import { format } from "date-fns";

/**
 * Formats a date string to "Jan 17th, 2024" format
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'Not set';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Get the day with ordinal suffix
    const day = date.getDate();
    const getOrdinalSuffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    const monthYear = format(date, 'MMM yyyy');
    const dayWithSuffix = `${day}${getOrdinalSuffix(day)}`;
    
    return `${format(date, 'MMM')} ${dayWithSuffix}, ${format(date, 'yyyy')}`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a date for datetime-local inputs (YYYY-MM-DDTHH:mm)
 */
export function formatDateTimeForInput(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

/**
 * Formats time only (HH:mm AM/PM)
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    return format(date, 'h:mm a');
  } catch {
    return '';
  }
}