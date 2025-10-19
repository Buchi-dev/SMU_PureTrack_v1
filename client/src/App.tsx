import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './App.css';

/**
 * Main App Component with React Router
 */
const App = () => {
  return <RouterProvider router={router} />;
}

export default App;