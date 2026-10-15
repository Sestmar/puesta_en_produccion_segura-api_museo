import { Routes, Route } from "react-router-dom";

import { PublicLayout } from "./components/layout/PublicLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { RequireAdmin, RequireAuth, RequireStaff } from "./components/common/guards";

import { HomePage } from "./pages/public/HomePage";
import { ArtworksPage } from "./pages/public/ArtworksPage";
import { ArtworkDetailPage } from "./pages/public/ArtworkDetailPage";
import { ArtistsPage } from "./pages/public/ArtistsPage";
import { ArtistDetailPage } from "./pages/public/ArtistDetailPage";
import { RoomsPage } from "./pages/public/RoomsPage";
import { RoomDetailPage } from "./pages/public/RoomDetailPage";
import { LoginPage } from "./pages/public/LoginPage";
import { RegisterPage } from "./pages/public/RegisterPage";
import { AccountPage } from "./pages/public/AccountPage";
import { MyCollectionPage } from "./pages/public/MyCollectionPage";
import { NotFoundPage } from "./pages/public/NotFoundPage";

import { DashboardPage } from "./pages/admin/DashboardPage";
import { AdminArtistsPage } from "./pages/admin/AdminArtistsPage";
import { AdminRoomsPage } from "./pages/admin/AdminRoomsPage";
import { AdminArtworksPage } from "./pages/admin/AdminArtworksPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminAuditPage } from "./pages/admin/AdminAuditPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="obras" element={<ArtworksPage />} />
        <Route path="obras/:id" element={<ArtworkDetailPage />} />
        <Route path="artistas" element={<ArtistsPage />} />
        <Route path="artistas/:id" element={<ArtistDetailPage />} />
        <Route path="salas" element={<RoomsPage />} />
        <Route path="salas/:id" element={<RoomDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="registro" element={<RegisterPage />} />
        <Route
          path="cuenta"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="mi-coleccion"
          element={
            <RequireAuth>
              <MyCollectionPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="artistas" element={<AdminArtistsPage />} />
        <Route path="salas" element={<AdminRoomsPage />} />
        <Route path="obras" element={<AdminArtworksPage />} />
        <Route
          path="usuarios"
          element={
            <RequireAdmin inline>
              <AdminUsersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="auditoria"
          element={
            <RequireAdmin inline>
              <AdminAuditPage />
            </RequireAdmin>
          }
        />
      </Route>
    </Routes>
  );
}
