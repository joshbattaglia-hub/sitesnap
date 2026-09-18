import { Routes, Route, Navigate } from "react-router-dom";
import UploaderPage from "./pages/UploaderPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminSitesPage from "./pages/AdminSitesPage";
import AdminDetailPage from "./pages/AdminDetailPage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/u/:token" element={<UploaderPage />} />
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/sites" element={<AdminSitesPage />} />
      <Route path="/admin/sites/:siteId" element={<AdminDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
