/**
 * Mobile Logout Button Component
 * Displays at the bottom of mobile drawer navigation
 */

import { Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { authService } from "../services/auth.Service";

interface MobileLogoutButtonProps {
  onLogout?: () => void;
}

export const MobileLogoutButton = ({ onLogout }: MobileLogoutButtonProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      message.success("Signed out successfully");
      if (onLogout) onLogout();
      navigate("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      message.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '16px 24px',
        borderTop: '1px solid #f0f0f0',
        background: '#fff',
      }}
    >
      <Button
        type="default"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        loading={loading}
        block
        danger
        size="large"
        style={{
          height: '48px',
          fontWeight: 500,
        }}
      >
        {loading ? "Signing out..." : "Sign Out"}
      </Button>
    </div>
  );
};
