import { createBrowserRouter, Navigate } from "react-router";
import App from "./App";
import { RequireAuth, RequireGuest } from "./guards";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import DashboardPage from "./pages/Dashboard";
import NewCampaignPage from "./pages/NewCampaign";
import CampaignDetailPage from "./pages/CampaignDetail";
import RoomPage from "./pages/Room";
import NewCharacterPage from "./pages/NewCharacter";
import CharacterDetailPage from "./pages/CharacterDetail";

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <RequireGuest />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "campaigns/new", element: <NewCampaignPage /> },
          { path: "campaigns/:id", element: <CampaignDetailPage /> },
          { path: "rooms/:id", element: <RoomPage /> },
          { path: "characters/new", element: <NewCharacterPage /> },
          { path: "characters/:id", element: <CharacterDetailPage /> },
        ],
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
