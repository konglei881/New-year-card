import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import FeedbackWidget from "@/components/FeedbackWidget";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
      <FeedbackWidget />
    </Router>
  );
}
