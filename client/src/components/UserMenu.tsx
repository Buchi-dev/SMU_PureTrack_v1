/**
 * User Menu Component
 * Displays user info and provides logout functionality
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown, Avatar, Space, Typography, Badge, message } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts";
import { authService } from "../services/auth.Service";

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
// --- End inlined section ---

const { Text } = Typography;

export default function UserMenu() {
  const { user: userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      message.success("Signed out successfully");
      navigate("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      message.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <IdcardOutlined />,
      label: (
        <Space direction="vertical" size={0} style={{ padding: "8px 0" }}>
          <Text strong>{getUserDisplayName(userProfile)}</Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {userProfile?.email}
          </Text>
          <Space size={4} style={{ marginTop: 4 }}>
            <Badge
              status={getStatusColor(userProfile?.status || "pending") as "success" | "processing" | "default" | "error" | "warning"}
              text={userProfile?.status}
            />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              • {userProfile?.role}
            </Text>
          </Space>
        </Space>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => navigate("/admin/settings"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: loading ? "Signing out..." : "Sign Out",
      danger: true,
      onClick: handleLogout,
      disabled: loading,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={["click"]}
      arrow
    >
      <Space style={{ cursor: "pointer", padding: "8px 12px", borderRadius: "8px" }}>
        <Avatar
          style={{
            backgroundColor: isAdmin ? "#1890ff" : "#52c41a",
            cursor: "pointer",
          }}
          icon={<UserOutlined />}
        >
          {getUserInitials(userProfile)}
        </Avatar>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Text strong style={{ fontSize: "14px" }}>
            {getUserDisplayName(userProfile)}
          </Text>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {userProfile?.role}
          </Text>
        </div>
      </Space>
    </Dropdown>
  );
}
