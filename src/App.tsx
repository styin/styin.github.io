import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import ZoomableCanvas from './components/ZoomableCanvas';
import CardPage from './components/CardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ZoomableCanvas />} />
        <Route path="/card/:id" element={<CardPage />} />
      </Routes>
    </BrowserRouter>
  );
} 