import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Guide from "./pages/Guide";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import SelectSlot from "./pages/SelectSlot";
import Test from "./pages/Test";
import MyTasks from "./pages/MyTasks";
import AdminDashboard from "./pages/admin/AdminDashboard";
import JobManagement from "./pages/admin/JobManagement";
import SlotManagement from "./pages/admin/SlotManagement";
import ApplicationManagement from "./pages/admin/ApplicationManagement";
import QuestionManagement from "./pages/admin/QuestionManagement";
import TestResults from "./pages/admin/TestResults";
import EvaluationParameters from "./pages/admin/EvaluationParameters";
import TaskManagement from "./pages/admin/TaskManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<JobDetails />} />

            {/* Guide Route - Protected but allows access before acknowledgment */}
            <Route path="/guide" element={
              <ProtectedRoute skipGuideCheck={true}>
                <Guide />
              </ProtectedRoute>
            } />

            {/* User Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="user">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/select-slot/:applicationId" element={
              <ProtectedRoute>
                <SelectSlot />
              </ProtectedRoute>
            } />
            <Route path="/test/:applicationId" element={
              <ProtectedRoute>
                <Test />
              </ProtectedRoute>
            } />
            <Route path="/my-tasks" element={
              <ProtectedRoute>
                <MyTasks />
              </ProtectedRoute>
            } />

            {/* Admin Protected Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/jobs" element={
              <ProtectedRoute requiredRole="admin">
                <JobManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/slots" element={
              <ProtectedRoute requiredRole="admin">
                <SlotManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/applications" element={
              <ProtectedRoute requiredRole="admin">
                <ApplicationManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/questions" element={
              <ProtectedRoute requiredRole="admin">
                <QuestionManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/results" element={
              <ProtectedRoute requiredRole="admin">
                <TestResults />
              </ProtectedRoute>
            } />
            <Route path="/admin/evaluations" element={
              <ProtectedRoute requiredRole="admin">
                <EvaluationParameters />
              </ProtectedRoute>
            } />
            <Route path="/admin/tasks" element={
              <ProtectedRoute requiredRole="admin">
                <TaskManagement />
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
