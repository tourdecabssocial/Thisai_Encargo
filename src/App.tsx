import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { RFQFormFlow } from './pages/RFQFormFlow';
import './App.css';

export function App() {
  return (
    <div className="app-root">
      <Header submissionCount={1} />

      <main className="main-content container">
        <RFQFormFlow />
      </main>

      <Footer />
    </div>
  );
}

export default App;
