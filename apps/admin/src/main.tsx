import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { aplicarTemaInicial } from './utils/tema';
import './index.css';

// Aplica el tema guardado (o la preferencia del sistema) antes del primer render
// para evitar un parpadeo claro→oscuro.
aplicarTemaInicial();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
