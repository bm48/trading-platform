import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'AUD') {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
  }).format(numericAmount);
}

export function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

export function formatDateShort(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

export function generateCaseNumber() {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `TG-${year}-${timestamp}`;
}

export function getIssueTypeLabel(issueType: string) {
  const labels: Record<string, string> = {
    unpaid: 'Unpaid Work',
    variations: 'Variation Disputes',
    termination: 'Termination/Removal',
    defects: 'Defect Claims',
    contract: 'Contract Issues',
    other: 'Other Issue',
  };
  return labels[issueType] || issueType;
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning border-warning/20',
    approved: 'bg-success/10 text-success border-success/20',
    rejected: 'bg-error/10 text-error border-error/20',
    active: 'bg-primary/10 text-primary border-primary/20',
    resolved: 'bg-neutral-light text-neutral-dark border-neutral-medium/20',
    on_hold: 'bg-warning/10 text-warning border-warning/20',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low',
  };
  return colors[priority] || 'priority-medium';
}

export function calculateProgress(caseData: any) {
  if (!caseData?.strategyPack?.stepByStepPlan) return 0;
  
  const steps = caseData.strategyPack.stepByStepPlan;
  const totalSteps = steps.length;
  
  // For demo purposes, calculate progress based on case age
  const createdAt = new Date(caseData.createdAt);
  const now = new Date();
  const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Assume 1 step per week on average
  const completedSteps = Math.min(Math.floor(daysSinceCreated / 7), totalSteps);
  
  return Math.round((completedSteps / totalSteps) * 100);
}

export function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return 'fas fa-file-pdf';
  if (fileType.includes('word') || fileType.includes('doc')) return 'fas fa-file-word';
  if (fileType.includes('image')) return 'fas fa-file-image';
  if (fileType.includes('excel') || fileType.includes('sheet')) return 'fas fa-file-excel';
  return 'fas fa-file-alt';
}

export function scrollToElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}
