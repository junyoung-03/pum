import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Recommend from './pages/Recommend';
import Result from './pages/Result';
import Collection from './pages/Collection';
import Detail from './pages/Detail';
import Favorites from './pages/Favorites';
import Review from './pages/Review';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="recommend" element={<Recommend />} />
        <Route path="result" element={<Result />} />
        <Route path="collection" element={<Collection />} />
        <Route path="perfume/:id" element={<Detail />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="review" element={<Review />} />
      </Route>
    </Routes>
  );
}

export default App;
