import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import MainPage from './pages/MainPage';
import './index.css';
import './styles/overlays.css';
import './styles/shop-card.css';

function App() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="app-shell">
      <MainPage />
    </div>
  );
}

export default App;
