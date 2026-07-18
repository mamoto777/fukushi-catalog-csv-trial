import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Navi from "./pages/Navi";
import GenreList from "./pages/GenreList";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import DisclaimerFooter from "./components/DisclaimerFooter";

export default function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/navi" element={<Navi />} />
          <Route path="/genres" element={<GenreList />} />
          <Route path="/list" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <DisclaimerFooter />
      </div>
    </HashRouter>
  );
}
