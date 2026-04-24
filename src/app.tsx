import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { QuestionLog } from "@/pages/QuestionLog";
import { QuestionDetailPage } from "@/pages/QuestionDetailPage";
import { KnowledgeHealth } from "@/pages/KnowledgeHealth";
import { BotConfig } from "@/pages/BotConfig";
import { PromptSlotDetailPage } from "@/pages/PromptSlotDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/questions" replace />} />
          <Route path="questions" element={<QuestionLog />} />
          <Route path="questions/:id" element={<QuestionDetailPage />} />
          <Route path="knowledge" element={<KnowledgeHealth />} />
          <Route path="config" element={<BotConfig />} />
          <Route path="config/:slotId" element={<PromptSlotDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
