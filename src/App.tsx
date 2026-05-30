import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Upload from "./pages/Upload";
import Review from "./pages/Review";
import Prompts from "./pages/Prompts";
import Export from "./pages/Export";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Upload />} />
        <Route path="review" element={<Review />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="export" element={<Export />} />
      </Route>
    </Routes>
  );
}
