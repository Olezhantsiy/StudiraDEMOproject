import { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  FolderOpen,
  Person,
  Dashboard,
  ChevronLeft,
  ChevronRight,
  Logout,
  AccountCircle,
  Article,
  CalendarMonth,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { RoleLabels } from "../types";

const DRAWER_WIDTH = 220;
const DRAWER_COLLAPSED = 56;

const NAV_ITEMS_ALL = [
  { label: "Дашборд", icon: <Dashboard />, path: "/", roles: null },
  { label: "Проекты", icon: <FolderOpen />, path: "/projects", roles: null },
  { label: "Встречи", icon: <CalendarMonth />, path: "/meetings", roles: null },
  { label: "Шаблоны", icon: <Article />, path: "/templates", roles: ["SPV", "HOD"] },
  { label: "Профиль", icon: <Person />, path: "/profile", roles: null },
] as const;

export default function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const NAV_ITEMS = NAV_ITEMS_ALL.filter(
    (item) => !item.roles || (user?.role && item.roles.includes(user.role as "SPV" | "HOD"))
  );

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawerNav = (compact: boolean) => (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "space-between",
          px: compact ? 1 : 2,
          py: 1.5,
          minHeight: 56,
        }}
      >
        {!compact && (
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ color: "#fff", fontSize: 15, letterSpacing: 0.5 }}
          >
            Studira
          </Typography>
        )}
        {!isMobile && (
          <IconButton
            size="small"
            onClick={() => setCollapsed((p) => !p)}
            sx={{ color: "#fff", opacity: 0.8, "&:hover": { opacity: 1 } }}
          >
            {compact ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.15)" }} />

      <List sx={{ pt: 1, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding sx={{ display: "block" }}>
              <Tooltip title={compact ? item.label : ""} placement="right" arrow>
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    minHeight: 44,
                    px: compact ? 1.5 : 2.5,
                    justifyContent: compact ? "center" : "flex-start",
                    bgcolor: active ? "rgba(255,255,255,0.15)" : "transparent",
                    borderRadius: "0 20px 20px 0",
                    mr: 1,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: compact ? 0 : 36,
                      color: "#fff",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!compact && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: 14,
                        fontWeight: active ? 600 : 400,
                        color: "#fff",
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>
    </>
  );

  const drawerPaperSx = {
    boxSizing: "border-box" as const,
    bgcolor: "#0052CC",
    color: "#fff",
    overflowX: "hidden" as const,
    borderRight: "none",
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F4F5F7" }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              transition: "width 0.2s ease",
              ...drawerPaperSx,
            },
          }}
        >
          {drawerNav(collapsed)}
        </Drawer>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: DRAWER_WIDTH,
              ...drawerPaperSx,
            },
          }}
        >
          {drawerNav(false)}
        </Drawer>
      )}

      {/* Main area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{ bgcolor: "#fff", borderBottom: "1px solid #DFE1E6" }}
        >
          <Toolbar sx={{ minHeight: "52px !important", gap: 1 }}>
            {isMobile && (
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                aria-label="Открыть меню"
              >
                <MenuIcon sx={{ color: "#42526E" }} />
              </IconButton>
            )}
            {isMobile && (
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: "#172B4D", flex: 1 }}
              >
                Studira
              </Typography>
            )}
            {!isMobile && <Box sx={{ flex: 1 }} />}
            {user?.role && (
              <Chip
                label={RoleLabels[user.role]}
                size="small"
                sx={{
                  bgcolor: "#E3FCEF",
                  color: "#006644",
                  fontWeight: 600,
                  mr: { xs: 0, sm: 1.5 },
                  fontSize: 12,
                  maxWidth: { xs: 120, sm: "none" },
                  "& .MuiChip-label": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                }}
              />
            )}
            <Tooltip title="Аккаунт">
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <AccountCircle sx={{ color: "#42526E" }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, p: { xs: 2, sm: 2.5, md: 3 }, overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ elevation: 3, sx: { minWidth: 180, mt: 1 } }}
      >
        <MenuItem
          onClick={() => {
            navigate("/profile");
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Мой профиль
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <Logout fontSize="small" sx={{ color: "error.main" }} />
          </ListItemIcon>
          Выйти
        </MenuItem>
      </Menu>
    </Box>
  );
}
