import { Tooltip, Badge } from 'antd';
import { SignalFilled } from '@ant-design/icons';

interface DataStreamIndicatorProps {
  hasRecentData?: boolean;
  lastDataTime?: number;
  size?: 'small' | 'default';
}

/**
 * DataStreamIndicator Component
 * 
 * Shows whether a device has recent real-time data available
 * This is SEPARATE from device status (online/offline)
 * 
 * Use cases:
 * - Device can be "online" in Firestore but no recent RTDB data
 * - Device can be "offline" in Firestore but RTDB still has cached data
 * 
 * @param hasRecentData - Whether recent sensor data exists (< 5 minutes)
 * @param lastDataTime - Timestamp of last data received
 * @param size - Size of the indicator
 */
export const DataStreamIndicator = ({ 
  hasRecentData = false, 
  lastDataTime,
  size = 'default' 
}: DataStreamIndicatorProps) => {
  const getDataStatus = () => {
    if (!lastDataTime) {
      return {
        status: 'default' as const,
        text: 'No data received',
        color: '#d9d9d9'
      };
    }

    const minutesAgo = Math.floor((Date.now() - lastDataTime) / 60000);
    
    if (hasRecentData || minutesAgo < 5) {
      return {
        status: 'processing' as const,
        text: `Live data (${minutesAgo}m ago)`,
        color: '#52c41a'
      };
    } else if (minutesAgo < 15) {
      return {
        status: 'warning' as const,
        text: `Stale data (${minutesAgo}m ago)`,
        color: '#faad14'
      };
    } else {
      return {
        status: 'default' as const,
        text: `No recent data (${minutesAgo}m ago)`,
        color: '#d9d9d9'
      };
    }
  };

  const dataStatus = getDataStatus();

  return (
    <Tooltip title={dataStatus.text}>
      <Badge 
        status={dataStatus.status} 
        text={size === 'small' ? '' : <SignalFilled style={{ fontSize: 12, color: dataStatus.color }} />}
      />
    </Tooltip>
  );
};
