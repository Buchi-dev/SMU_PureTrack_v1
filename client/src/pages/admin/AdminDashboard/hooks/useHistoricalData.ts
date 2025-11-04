import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import type { SensorReading } from '../../../../schemas';

/**
 * Custom hook to fetch historical data for a selected device
 */
export const useHistoricalData = (selectedDevice: string) => {
  const [historicalData, setHistoricalData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const rtdb = getDatabase();

  useEffect(() => {
    if (selectedDevice === 'all' || !selectedDevice) {
      setHistoricalData([]);
      return;
    }

    setLoading(true);
    const historyRef = ref(rtdb, `sensorReadings/${selectedDevice}/history`);
    
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings = Object.values(data) as SensorReading[];
        const sortedReadings = readings
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50)
          .reverse();
        setHistoricalData(sortedReadings);
      } else {
        setHistoricalData([]);
      }
      setLoading(false);
    });

    return () => {
      off(historyRef);
      unsubscribe();
    };
  }, [selectedDevice, rtdb]);

  return { historicalData, loading };
};
