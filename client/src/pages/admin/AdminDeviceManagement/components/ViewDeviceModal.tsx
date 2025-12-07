import type { ReactNode } from 'react';
import { useState, useCallback } from 'react';
import {
  Modal,
  Descriptions,
  Tag,
  Space,
  Card,
  Button,
  Typography,
  Alert,
  message,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  WifiOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  DashboardOutlined,
  ReloadOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { DeviceWithReadings, DeviceStatus, DeviceUIStatus, CommandResult } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';
import { useThemeToken } from '../../../../theme';
import { useResponsive } from '../../../../hooks';
import { devicesService } from '../../../../services/devices.Service';
import { formatLastSeen } from '../../../../utils/deviceStatus.util';
import {
  DEVICE_COMMANDS,
  COMMAND_LABELS,
  COMMAND_DESCRIPTIONS,
} from '../../../../constants/deviceCommand.constants';
import { MobileDeviceInfo } from './MobileDeviceInfo';

const { Text } = Typography;

interface ViewDeviceModalProps {
  visible: boolean;
  device: DeviceWithReadings | null;
  onClose: () => void;
  // onRefetch removed - WebSocket provides instant updates, no need to manually refetch
}

// ✅ UI Status color mapping (uses centralized deviceStatus.util uiStatus)
const uiStatusConfig: Record<DeviceUIStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
  warning: { color: 'warning', icon: <WarningOutlined /> },
};

// Legacy status config for devices without uiStatus (fallback only)
const legacyStatusConfig: Record<DeviceStatus, { color: string; icon: ReactNode }> = {
  online: { color: 'success', icon: <CheckCircleOutlined /> },
  offline: { color: 'default', icon: <CloseCircleOutlined /> },
};

export const ViewDeviceModal = ({ visible, device, onClose }: ViewDeviceModalProps) => {
  // Early return MUST come before any hooks to avoid "Rendered more hooks than during the previous render" error
  if (!device) return null;

  const token = useThemeToken();
  const { isMobile } = useResponsive();
  const [commandState, setCommandState] = useState<{
    status: 'idle' | 'sending' | 'queued' | 'acknowledged' | 'timeout' | 'failed';
    command: string | null;
    error: string | null;
    result: CommandResult | null;
  }>({
    status: 'idle',
    command: null,
    error: null,
    result: null,
  });

  // Check if device is likely offline
  const isDeviceOffline = device.uiStatus === 'offline' || device.status === 'offline';
  const isDeviceWarning = device.uiStatus === 'warning';
  const lastSeenText = device.lastSeenMs !== null && device.lastSeenMs !== undefined
    ? formatLastSeen(device.lastSeenMs)
    : 'Unknown';

  // Generic command handler with offline check and status tracking
  const handleSendCommand = useCallback(async (
    command: 'send_now' | 'restart' | 'go' | 'wait' | 'deregister' | 'calibrate'
  ) => {
    // Reset previous command state
    setCommandState({
      status: 'sending',
      command: COMMAND_LABELS[command as keyof typeof COMMAND_LABELS] || command,
      error: null,
      result: null,
    });

    try {
      // Send command with appropriate timeout
      const result = await devicesService.sendDeviceCommand(
        device.deviceId,
        command,
        { waitForAck: false } // Fire-and-forget for now
      );

      if (result.success && result.queued) {
        setCommandState({
          status: 'queued',
          command: COMMAND_LABELS[command as keyof typeof COMMAND_LABELS] || command,
          error: null,
          result,
        });
        
        message.success({
          content: (
            <span>
              {COMMAND_LABELS[command as keyof typeof COMMAND_LABELS]} queued successfully
              {isDeviceOffline && ' (device offline, will execute when online)'}
              {command === 'send_now' && !isDeviceOffline && ' - Data will appear instantly via WebSocket'}
            </span>
          ),
          duration: 4,
        });

        // ✅ NO REFETCH NEEDED - WebSocket pushes data instantly
        // onRefetch callback removed since WebSocket eliminates race condition

        // Auto-clear command state after 5 seconds
        setTimeout(() => {
          setCommandState(prev => prev.status === 'queued' ? { ...prev, status: 'idle' } : prev);
        }, 5000);
      } else {
        throw new Error(result.error || 'Command failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCommandState({
        status: 'failed',
        command: COMMAND_LABELS[command as keyof typeof COMMAND_LABELS] || command,
        error: errorMessage,
        result: null,
      });
      
      message.error({
        content: `Failed to send command: ${errorMessage}`,
        duration: 5,
      });

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setCommandState(prev => prev.status === 'failed' ? { ...prev, status: 'idle' } : prev);
      }, 5000);
    }
  }, [device.deviceId, isDeviceOffline]);

  // Command handlers
  const handleRestartDevice = () => handleSendCommand('restart');
  const handleSendNow = () => handleSendCommand('send_now');

  // Confirmation for offline devices
  const confirmOfflineCommand = (command: () => void) => {
    if (isDeviceOffline || isDeviceWarning) {
      Modal.confirm({
        title: 'Device May Be Offline',
        content: (
          <div>
            <p>
              <strong>{device.name}</strong> appears to be{' '}
              {isDeviceOffline ? 'offline' : 'experiencing issues'}.
            </p>
            <p style={{ marginTop: 8 }}>
              Last seen: <strong>{lastSeenText}</strong>
            </p>
            <p style={{ marginTop: 8 }}>
              The command will be queued but may not execute immediately.
              Do you want to continue?
            </p>
          </div>
        ),
        icon: <WarningOutlined style={{ color: token.colorWarning }} />,
        okText: 'Send Anyway',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: command,
      });
    } else {
      command();
    }
  };

  return (
    <Modal
      title={
        <Space direction={isMobile ? 'vertical' : 'horizontal'} size="small">
          <Space>
            <ApiOutlined style={{ color: token.colorPrimary }} />
            <span style={{ fontSize: isMobile ? '15px' : '16px' }}>
              {isMobile ? device.name : `Device Details - ${device.name}`}
            </span>
          </Space>
          {commandState.status === 'sending' && (
            <Tag icon={<LoadingOutlined />} color="processing" style={{ fontSize: '11px' }}>
              {isMobile ? 'Sending...' : 'Sending Command...'}
            </Tag>
          )}
          {commandState.status === 'queued' && (
            <Tag icon={<ClockCircleOutlined />} color="default" style={{ fontSize: '11px' }}>
              {isMobile ? 'Queued' : 'Command Queued'}
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={isMobile ? '100%' : 900}
      style={isMobile ? { top: 0, padding: 0, maxWidth: '100vw' } : {}}
      styles={isMobile ? { body: { maxHeight: 'calc(100vh - 130px)', overflowY: 'auto', padding: '16px' } } : {}}
      footer={
        isMobile ? (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button
              icon={<SendOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                confirmOfflineCommand(handleSendNow);
              }}
              disabled={commandState.status === 'sending'}
              loading={commandState.status === 'sending'}
              block
            >
              Send Now
            </Button>
            
            <Button
              icon={<ReloadOutlined />}
              danger
              onClick={(e) => {
                e.stopPropagation();
                confirmOfflineCommand(handleRestartDevice);
              }}
              disabled={commandState.status === 'sending'}
              loading={commandState.status === 'sending'}
              block
            >
              Restart Device
            </Button>

            <Button type="primary" onClick={onClose} block>
              Close
            </Button>
          </Space>
        ) : (
          [
            <Space key="commands">
              <Tooltip title={COMMAND_DESCRIPTIONS[DEVICE_COMMANDS.SEND_NOW]}>
                <Button
                  icon={<SendOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmOfflineCommand(handleSendNow);
                  }}
                  disabled={commandState.status === 'sending'}
                  loading={commandState.status === 'sending'}
                >
                  Send Now
                </Button>
              </Tooltip>
              
              <Tooltip title={COMMAND_DESCRIPTIONS[DEVICE_COMMANDS.RESTART]}>
                <Button
                  icon={<ReloadOutlined />}
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmOfflineCommand(handleRestartDevice);
                  }}
                  disabled={commandState.status === 'sending'}
                  loading={commandState.status === 'sending'}
                >
                  Restart
                </Button>
              </Tooltip>

              <Button key="close" type="primary" onClick={onClose}>
                Close
              </Button>
            </Space>,
          ]
        )
      }
    >
      <Space direction="vertical" size={isMobile ? 'middle' : 'large'} style={{ width: '100%' }}>
        {/* Command Status Display */}
        {commandState.status !== 'idle' && (
          <Alert
            message={
              commandState.status === 'sending'
                ? `Sending ${commandState.command}...`
                : commandState.status === 'queued'
                ? `${commandState.command} Queued`
                : commandState.status === 'failed'
                ? `${commandState.command} Failed`
                : `${commandState.command} Status`
            }
            description={
              commandState.status === 'sending'
                ? 'Command is being sent to the device via MQTT broker'
                : commandState.status === 'queued'
                ? `Command queued successfully. ${isDeviceOffline ? 'Device is offline - command will execute when device comes online.' : 'Device will execute command shortly.'}`
                : commandState.status === 'failed'
                ? commandState.error
                : null
            }
            type={
              commandState.status === 'sending'
                ? 'info'
                : commandState.status === 'queued'
                ? 'success'
                : 'error'
            }
            showIcon
            icon={
              commandState.status === 'sending'
                ? <LoadingOutlined />
                : commandState.status === 'queued'
                ? <CheckCircleOutlined />
                : <CloseCircleOutlined />
            }
            closable
            onClose={() => setCommandState({ status: 'idle', command: null, error: null, result: null })}
          />
        )}

        {/* Device Information */}
        <Card 
          title={
            <Space>
              <DashboardOutlined />
              <span style={{ fontSize: isMobile ? '14px' : '16px' }}>Device Information</span>
            </Space>
          } 
          size="small"
        >
          {isMobile ? (
            <MobileDeviceInfo device={device} />
          ) : (
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Device ID">
                <Text code strong>{device.deviceId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Name">
                <Text strong>{device.name}</Text>
              </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{device.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {/* ✅ Use centralized uiStatus from deviceStatus.util (computed in useDevices) */}
              {(() => {
                const status = device.uiStatus || device.status; // Fallback to backend status
                const config = device.uiStatus 
                  ? uiStatusConfig[device.uiStatus] 
                  : legacyStatusConfig[device.status];
                
                return (
                  <Tooltip title={device.statusReason || `Device is ${status}`}>
                    <Tag icon={config.icon} color={config.color}>
                      {status.toUpperCase()}
                    </Tag>
                  </Tooltip>
                );
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="MAC Address">
              <Text code>{device.macAddress}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="IP Address">
              <Space>
                <WifiOutlined />
                <Text code>{device.ipAddress}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Firmware Version">
              <Tag>{device.firmwareVersion}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Sensors">
              <Space wrap size="small">
                {device.sensors.map((sensor) => (
                  <Tag key={sensor} color="cyan">{sensor}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Registered At" span={2}>
              {device.registeredAt?.seconds
                ? new Date(device.registeredAt.seconds * 1000).toLocaleString()
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Seen" span={2}>
              {/* ✅ Use centralized lastSeenMs from deviceStatus.util */}
              {device.lastSeenMs !== undefined && device.lastSeenMs !== null
                ? formatLastSeen(device.lastSeenMs)
                : device.lastSeen?.seconds
                ? new Date(device.lastSeen.seconds * 1000).toLocaleString()
                : 'Never'}
            </Descriptions.Item>
          </Descriptions>
          )}
        </Card>

        {/* Location Information */}
        <Card 
          title={
            <Space direction={isMobile ? 'vertical' : 'horizontal'} size="small" style={{ width: '100%' }}>
              <Space>
                <EnvironmentOutlined />
                <span style={{ fontSize: isMobile ? '14px' : '16px' }}>Location</span>
              </Space>
              {isDeviceRegistered(device) ? (
                <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: '11px' }}>
                  REGISTERED
                </Tag>
              ) : (
                <Tag icon={<InfoCircleOutlined />} color="warning" style={{ fontSize: '11px' }}>
                  UNREGISTERED
                </Tag>
              )}
            </Space>
          } 
          size="small"
        >
          {device.metadata?.location ? (
            isMobile ? (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Building</Text>
                  <Text strong style={{ fontSize: '13px' }}>{device.metadata.location.building || 'Not set'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Floor</Text>
                  <Text strong style={{ fontSize: '13px' }}>{device.metadata.location.floor || 'Not set'}</Text>
                </div>
                {device.metadata.location.notes && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>Notes</Text>
                    <Text style={{ fontSize: '12px' }}>{device.metadata.location.notes}</Text>
                  </div>
                )}
              </Space>
            ) : (
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Building" span={2}>
                  <Text strong>{device.metadata.location.building || 'Not set'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Floor" span={2}>
                  <Text strong>{device.metadata.location.floor || 'Not set'}</Text>
                </Descriptions.Item>
                {device.metadata.location.notes && (
                  <Descriptions.Item label="Notes" span={2}>
                    <Text>{device.metadata.location.notes}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )
          ) : (
            <Alert
              message="No Location Set"
              description={isMobile ? "Device not assigned to a location" : "This device has not been assigned a location. Please edit the device to add location information for registration."}
              type="warning"
              showIcon
              icon={<EnvironmentOutlined />}
            />
          )}
        </Card>

        {/* Additional Metadata */}
        {device.metadata && (device.metadata.description || device.metadata.owner) && (
          <Card title="Additional Information" size="small">
            <Descriptions bordered column={2} size="small">
              {device.metadata.description && (
                <Descriptions.Item label="Description" span={2}>
                  {device.metadata.description}
                </Descriptions.Item>
              )}
              {device.metadata.owner && (
                <Descriptions.Item label="Owner" span={2}>
                  {device.metadata.owner}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        )}

        {/* Device Commands */}
        <Card title={<><SettingOutlined /> Device Commands</>} size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text strong>Available Commands:</Text>
            <Space wrap size="small">
              <Tag color="red">
                <ReloadOutlined /> Restart - Reboot the device
              </Tag>
            </Space>
            <Alert
              message="Command Execution"
              description="Commands are handled by backend API and forwarded to devices. Device must be online to receive commands."
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Space>
        </Card>

        {/* Status Messages - Use centralized uiStatus */}
        {(device.uiStatus === 'offline' || device.status === 'offline') && (
          <Alert
            message="Device Offline"
            description="This device is currently offline. Sensor data is not available."
            type="warning"
            showIcon
          />
        )}
        {device.uiStatus === 'warning' && device.statusReason && (
          <Alert
            message="Device Warning"
            description={device.statusReason}
            type="warning"
            showIcon
          />
        )}
      </Space>
    </Modal>
  );
};
