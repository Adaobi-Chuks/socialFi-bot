// utils/truncate.ts
export function truncateMiddle(value, front = 4, back = 4, ellipsis = "...") {
  if (!value) return "";
  const str = String(value);
  if (str.length <= front + back) return str;
  return `${str.slice(0, front)}${ellipsis}${str.slice(-back)}`;
}

export const timeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  const intervals = [
    { label: "Yr", seconds: 31536000 },
    { label: "Mo", seconds: 2592000 },
    { label: "Week", seconds: 604800 },
    { label: "Day", seconds: 86400 },
    { label: "Hr", seconds: 3600 },
    { label: "Min", seconds: 60 },
    { label: "Sec", seconds: 1 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
};

export function formatTokenAmount(amount) {
  if (amount >= 1e9) return (amount / 1e9).toFixed(2) + "B";
  if (amount >= 1e6) return (amount / 1e6).toFixed(2) + "M";
  if (amount >= 1e3) return (amount / 1e3).toFixed(2) + "K";
  return amount.toFixed(2);
}

export function formatUsd(value) {
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(3);
  return value.toPrecision(2);
}

export const errorMsgs = (e) =>
  toast(e, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    type: "error",
    theme: "dark",
  });
export const successMsg = (e) =>
  toast(e, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
    progress: undefined,
    type: "success",
    theme: "dark",
  });
