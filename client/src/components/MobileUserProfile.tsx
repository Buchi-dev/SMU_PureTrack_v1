/**
 * Mobile User Profile Component
 * Displays user info inside mobile drawer navigation
 */

import { Space, Avatar, Typography, Badge } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts";

const { Text } = Typography;

function getUserDisplayName(profile: { firstName?: string; lastName?: string; displayName?: string } | null): string {
  if (!profile) return "User";
  if (profile.displayName) return profile.displayName;
  const { firstName, lastName } = profile;
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || lastName || "User";
}

function getUserInitials(profile: { firstName?: string; lastName?: string } | null): string {
  if (!profile) return "U";
  const { firstName, lastName } = profile;
  const firstInitial = firstName?.charAt(0)?.toUpperCase() || "";
  const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";
  return `${firstInitial}${lastInitial}` || "U";
}

function getStatusColor(status: "active" | "pending" | "suspended"): string {
  switch (status) {
    case "active":
      return "green";
    case "pending":
      return "orange";
    case "suspended":
      return "red";
    default:
      return "default";
  }
}

export const MobileUserProfile = () => {
  const { user: userProfile, isAdmin } = useAuth();

  return (
    <div
      style={{
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* Avatar and Name */}
        <Space size="middle" align="center">
          <Avatar
            size={48}
            style={{
              backgroundColor: isAdmin ? "#1890ff" : "#52c41a",
            }}
            icon={<UserOutlined />}
          >
            {getUserInitials(userProfile)}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: "15px", display: 'block' }}>
              {getUserDisplayName(userProfile)}
            </Text>
            <Text type="secondary" style={{ fontSize: "12px", display: 'block' }}>
              {userProfile?.email}
            </Text>
            <Space size={4} style={{ marginTop: 4 }}>
              <Badge
                status={getStatusColor(userProfile?.status || "pending") as "success" | "processing" | "default" | "error" | "warning"}
                text={
                  <Text type="secondary" style={{ fontSize: "11px" }}>
                    {userProfile?.status}
                  </Text>
                }
              />
              <Text type="secondary" style={{ fontSize: "11px" }}>
                • {userProfile?.role}
              </Text>
            </Space>
          </div>
        </Space>
      </Space>
    </div>
  );
};
