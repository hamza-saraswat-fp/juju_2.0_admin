import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { QuestionLog } from "@/pages/QuestionLog";
import { QuestionDetailPage } from "@/pages/QuestionDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/questions" replace />} />
          <Route path="questions" element={<QuestionLog />} />
          <Route path="questions/:id" element={<QuestionDetailPage />} />
          <Route
            path="knowledge"
            element={
              <div className="text-muted-foreground">
                Knowledge Health — coming soon
              </div>
            }
          />
          <Route
            path="config"
            element={
              <div className="text-muted-foreground">
                Bot Config — coming soon
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
