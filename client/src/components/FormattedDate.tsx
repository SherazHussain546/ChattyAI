import { format } from 'date-fns';

interface FormattedDateProps {
  date: string | Date;
  includeTime?: boolean;
}

export function FormattedDate({ date, includeTime = true }: FormattedDateProps) {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  // Format the date
  const formatStr = includeTime ? 'PPpp' : 'PP';
  
  try {
    return <time dateTime={dateObj.toISOString()}>{format(dateObj, formatStr)}</time>;
  } catch (error) {
    console.error('Error formatting date:', error);
    return <span>Invalid date</span>;
  }
}