import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Load from "./pages/Load";
import Review from "./pages/Review";
import Export from "./pages/Export";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Load />} />
        <Route path="review" element={<Review />} />
        <Route path="export" element={<Export />} />
      </Route>
    </Routes>
  );
}
