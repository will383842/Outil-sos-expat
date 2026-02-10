// Password strength evaluation

export interface PasswordStrengthResult {
  percent: number;
  color: string;       // Tailwind bg color class
  darkColor: string;   // Dark-theme compatible bg color class
  label: string;       // i18n key suffix: weak | fair | good | strong
}

export const evaluatePasswordStrength = (pw: string): PasswordStrengthResult => {
  if (!pw) return { percent: 0, color: 'bg-gray-300', darkColor: 'bg-gray-700', label: 'weak' };

  let score = 0;
  if (pw.length >= 6) score += 30;
  if (pw.length >= 8) score += 20;
  if (pw.length >= 10) score += 15;
  if (pw.length >= 12) score += 15;
  if (/[a-z]/.test(pw)) score += 5;
  if (/[A-Z]/.test(pw)) score += 5;
  if (/\d/.test(pw)) score += 5;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 5;

  const clamp = Math.min(100, score);

  if (pw.length < 8) {
    return { percent: clamp, color: 'bg-red-500', darkColor: 'bg-red-500', label: 'weak' };
  }
  if (clamp < 40) {
    return { percent: clamp, color: 'bg-orange-500', darkColor: 'bg-orange-500', label: 'fair' };
  }
  if (clamp < 55) {
    return { percent: clamp, color: 'bg-yellow-500', darkColor: 'bg-yellow-500', label: 'good' };
  }
  if (clamp < 70) {
    return { percent: clamp, color: 'bg-blue-500', darkColor: 'bg-blue-500', label: 'strong' };
  }
  return { percent: clamp, color: 'bg-green-500', darkColor: 'bg-green-500', label: 'strong' };
};
