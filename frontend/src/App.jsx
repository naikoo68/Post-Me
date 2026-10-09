// Post Me — app root: providers + routes.
import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { AuthProvider } from "./context/AuthContext";
import { ZoomProvider } from "./context/ZoomContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ModalScrollLock from "./components/ui/ModalScrollLock";
import UploadProgressBar from "./components/ui/UploadProgressBar";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { Loading } from "./components/ui/AsyncState";

const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/auth/Login"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const PostMeLayout = lazy(() => import("./components/layout/PostMeLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminFacebook = lazy(() => import("./pages/admin/AdminFacebook"));
const AdminCrossPosting = lazy(() => import("./pages/admin/AdminCrossPosting"));
const AdminVoiceStudio = lazy(() => import("./pages/admin/AdminVoiceStudio"));
const AdminInstitutes = lazy(() => import("./pages/admin/AdminInstitutes"));

// Slideshow players (admin screen-recording) and chrome-less cards that the
// backend renderer screenshots (src/config/cardShot.js) — keep these URLs.
const QuizSlideshow = lazy(() => import("./pages/quiz/QuizSlideshow"));
const PracticeSlideshow = lazy(() => import("./pages/practice/PracticeSlideshow"));
const QuestionCardImage = lazy(() => import("./pages/QuestionCardImage"));
const FlashcardCardImage = lazy(() => import("./pages/FlashcardCardImage"));
const SlideCardImage = lazy(() => import("./pages/SlideCardImage"));

const S = (Comp) => (
  <Suspense fallback={<div className="container-page"><Loading label="Loading…" /></div>}>
    <Comp />
  </Suspense>
);

const ADMIN_ROLES = ["admin", "institute_admin"];

const router = createBrowserRouter([
  { path: "/", element: S(Home) },
  { path: "/login", element: S(Login) },
  { path: "/admin/login", element: S(AdminLogin) },
  { path: "/forgot-password", element: S(ForgotPassword) },
  { path: "/reset-password/:token", element: S(ResetPassword) },

  // Server-screenshot cards (must stay public + chrome-less)
  { path: "/q-card/:id", element: S(QuestionCardImage) },
  { path: "/flashcard/:id", element: S(FlashcardCardImage) },
  { path: "/slide-card/:id", element: S(SlideCardImage) },

  // Slideshow players
  { path: "/quiz/:subjectId/:topicId/:sessionId/:quizId/slideshow", element: <ProtectedRoute role={ADMIN_ROLES}>{S(QuizSlideshow)}</ProtectedRoute> },
  { path: "/practice/quiz/slideshow/:itemId", element: <ProtectedRoute role={ADMIN_ROLES}>{S(PracticeSlideshow)}</ProtectedRoute> },

  // Post Me panel — super-admin and every client's admin
  {
    path: "/admin",
    element: <ProtectedRoute role={ADMIN_ROLES}>{S(PostMeLayout)}</ProtectedRoute>,
    children: [
      { index: true, element: S(Dashboard) },
      { path: "facebook", element: S(AdminFacebook) },
      { path: "auto-posting", element: <Navigate to="/admin/facebook" replace /> },
      { path: "cross-posting", element: S(AdminCrossPosting) },
      { path: "cross-posting/:profileId", element: S(AdminCrossPosting) },
      { path: "voice-studio", element: S(AdminVoiceStudio) },
      { path: "clients", element: <ProtectedRoute role="admin">{S(AdminInstitutes)}</ProtectedRoute> },
    ],
  },
  // Old study-app paths some copied pages link back to
  { path: "/creator", element: <Navigate to="/admin" replace /> },
  { path: "/admin/practice", element: <Navigate to="/admin" replace /> },

  { path: "*", element: S(NotFound) },
]);

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ZoomProvider>
            <ModalScrollLock />
            <UploadProgressBar />
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
          </ZoomProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
