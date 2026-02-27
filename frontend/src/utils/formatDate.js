export const formatToLocalTime = (utcDateString) => {
  if (!utcDateString) return "-";
  
  // Ensure JavaScript knows this is UTC by appending 'Z' if it's missing
  const dateString = utcDateString.endsWith("Z") ? utcDateString : `${utcDateString}Z`;
  const date = new Date(dateString);
  
  // Formats to DD/MM/YYYY HH:mm:ss in 24-hour format
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  });
};