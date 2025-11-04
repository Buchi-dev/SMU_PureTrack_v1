import { useState, useEffect } from 'react';
import type { ReportHistory } from '../../../../schemas';

export const useReportHistory = () => {
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);

  const loadReportHistory = () => {
    try {
      // Load report history from localStorage
      const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      setReportHistory(history.map((item: any) => ({
        ...item,
        generatedAt: new Date(item.generatedAt)
      })));
    } catch (error) {
      console.warn('Failed to load report history:', error);
      setReportHistory([]);
    }
  };

  const addReportToHistory = (report: ReportHistory) => {
    try {
      // Store in localStorage for persistence
      const existingHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      const updatedHistory = [report, ...existingHistory].slice(0, 10); // Keep last 10 reports
      localStorage.setItem('reportHistory', JSON.stringify(updatedHistory));
      setReportHistory(updatedHistory);
    } catch (error) {
      console.warn('Failed to save report to history:', error);
    }
  };

  useEffect(() => {
    loadReportHistory();
  }, []);

  return {
    reportHistory,
    loadReportHistory,
    addReportToHistory,
  };
};
