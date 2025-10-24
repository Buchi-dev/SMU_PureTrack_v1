import { Button, Switch, Space, Typography, Divider } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';

const { Text } = Typography;

interface ThemeSwitcherProps {
  themeMode: 'light' | 'dark' | 'compact';
  onThemeChange: (mode: 'light' | 'dark' | 'compact') => void;
}

/**
 * Theme Switcher Component
 * Allows users to switch between light and dark themes
 */
export const ThemeSwitcher = ({ themeMode, onThemeChange }: ThemeSwitcherProps) => {
  const isDark = themeMode === 'dark';

  const handleToggle = (checked: boolean) => {
    onThemeChange(checked ? 'dark' : 'light');
  };

  return (
    <Space align="center">
      {isDark ? <BulbFilled /> : <BulbOutlined />}
      <Switch
        checked={isDark}
        onChange={handleToggle}
        checkedChildren="Dark"
        unCheckedChildren="Light"
      />
    </Space>
  );
};

/**
 * Advanced Theme Controls Component
 * Provides full theme mode selection
 */
export const ThemeControls = ({ themeMode, onThemeChange }: ThemeSwitcherProps) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Text strong>Theme Mode</Text>
      <Space>
        <Button
          type={themeMode === 'light' ? 'primary' : 'default'}
          onClick={() => onThemeChange('light')}
        >
          Light
        </Button>
        <Button
          type={themeMode === 'dark' ? 'primary' : 'default'}
          onClick={() => onThemeChange('dark')}
        >
          Dark
        </Button>
        <Button
          type={themeMode === 'compact' ? 'primary' : 'default'}
          onClick={() => onThemeChange('compact')}
        >
          Compact
        </Button>
      </Space>
      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        Current theme: <Text code>{themeMode}</Text>
      </Text>
    </Space>
  );
};
