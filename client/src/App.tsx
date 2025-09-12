import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ColorPaletteProvider } from './contexts/ColorPaletteContext';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import SearchPage from './pages/SearchPage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import CreateListingForm from './components/CreateListingForm';
import EditListingForm from './components/EditListingForm';
import ListingDetail from './pages/ListingDetail';
import SubscriptionManager from './components/SubscriptionManager';
import SubscriptionDashboard from './components/SubscriptionDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('React Query Error:', error);
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorPaletteProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/dashboard" element={<SellerDashboard />} />
                  <Route path="/login" element={<LoginForm />} />
                  <Route path="/register" element={<RegisterForm />} />
                  <Route path="/create" element={<CreateListingForm />} />
                  <Route path="/edit/:id" element={<EditListingForm />} />
                  <Route path="/listing/:id" element={<ListingDetail />} />
                  <Route path="/subscription" element={<SubscriptionManager />} />
                <Route path="/subscription-dashboard" element={<SubscriptionDashboard />} />
                </Routes>
              </main>
            </div>
          </Router>
        </AuthProvider>
      </ColorPaletteProvider>
    </QueryClientProvider>
  );
}

export default App;
